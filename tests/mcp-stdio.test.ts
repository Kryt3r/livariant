import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { initializeProject } from "../src/runtime/index-core.js";
import { MCP_STDIO_MESSAGE_MAX_BYTES } from "../src/mcp/server.js";

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-mcp-stdio-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

function cliPath(): string {
  return resolve(process.cwd(), "dist", "src", "cli", "index.js");
}

function runMcp(path: string, input: Buffer | string): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [cliPath(), "mcp"], {
      cwd: path,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, PBF_RUNTIME_DELEGATION_BYPASS: "1" },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolvePromise({ stdout, stderr, code }));
    child.stdin.end(input);
  });
}

function line(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

const protectedError = /Canonical Project Brain use requires exact protected Guardian integrity acceptance|Protected Livariant Guardian is not ready|Guardian root is not provisioned/i;

test("livariant mcp refuses valid JSON-RPC session startup without protected Project Brain truth", async () => {
  await withProject(async (path) => {
    const input = [
      line({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "stdio-test", version: "1" } },
      }),
      line({ jsonrpc: "2.0", method: "notifications/initialized" }),
      line({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
    ].join("");
    const result = await runMcp(path, input);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, protectedError);
  });
});

test("livariant mcp rejects oversized stdio messages without unbounded accumulation", async () => {
  await withProject(async (path) => {
    const oversized = Buffer.concat([
      Buffer.from("{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"padding\":\"", "utf8"),
      Buffer.alloc(MCP_STDIO_MESSAGE_MAX_BYTES + 32, 0x61),
      Buffer.from("\"}\n", "utf8"),
    ]);
    const result = await runMcp(path, oversized);
    assert.equal(result.code, 0);
    assert.equal(result.stderr, "");
    const messages = result.stdout.trim().split("\n").filter(Boolean).map((entry) => JSON.parse(entry) as {
      error?: { code?: number; message?: string };
    });
    assert.equal(messages.length, 1);
    assert.equal(messages[0]?.error?.code, -32600);
    assert.match(messages[0]?.error?.message ?? "", /exceeds/i);
  });
});

test("blocked MCP startup after a valid request cannot mutate project state", async () => {
  await withProject(async (path) => {
    const managed = ["project.md", "goals.md", "decisions.md", "knowledge.md", "metadata.json"];
    const before = new Map(await Promise.all(managed.map(async (name) => [name, await readFile(resolve(path, ".project-brain", name))] as const)));
    const input = [
      line({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "disconnect-test", version: "1" } },
      }),
      line({ jsonrpc: "2.0", method: "notifications/initialized" }),
    ].join("");
    const result = await runMcp(path, input);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, protectedError);
    for (const name of managed) assert.deepEqual(await readFile(resolve(path, ".project-brain", name)), before.get(name));
  });
});
