import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { createMcpSession } from "../src/mcp/server.js";
import { initializeProject } from "../src/runtime/index.js";

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-mcp-protocol-"));
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

function parseSingleError(stdout: string): { error?: { code?: number; message?: string } } {
  const lines = stdout.trim().split("\n").filter(Boolean);
  assert.equal(lines.length, 1);
  return JSON.parse(lines[0] ?? "{}") as { error?: { code?: number; message?: string } };
}

test("MCP rejects fractional numeric request ids", async () => {
  await withProject(async (path) => {
    const session = createMcpSession(path);
    const response = await session.handleMessage({
      jsonrpc: "2.0",
      id: 1.5,
      method: "initialize",
      params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "fractional-id", version: "1" } },
    });
    assert.ok(response && "error" in response);
    if (response && "error" in response) {
      assert.equal(response.error.code, -32600);
      assert.match(response.error.message, /safe integer/i);
    }
  });
});

test("MCP stdio rejects a final message without newline framing", async () => {
  await withProject(async (path) => {
    const message = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "missing-newline", version: "1" } },
    });
    const result = await runMcp(path, message);
    assert.equal(result.code, 0);
    assert.equal(result.stderr, "");
    const error = parseSingleError(result.stdout);
    assert.equal(error.error?.code, -32700);
  });
});

test("MCP stdio rejects invalid UTF-8 instead of replacement decoding", async () => {
  await withProject(async (path) => {
    const result = await runMcp(path, Buffer.from([0xff, 0x0a]));
    assert.equal(result.code, 0);
    assert.equal(result.stderr, "");
    const error = parseSingleError(result.stdout);
    assert.equal(error.error?.code, -32700);
  });
});
