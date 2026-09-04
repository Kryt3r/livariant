import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  disconnectedConnectionIntent,
  readConnectionIntent,
  writeConnectionIntent,
} from "../src/connectors/connection-intent.js";

async function withTempFile(run: (filePath: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "livariant-connection-intent-"));
  try {
    await run(path.join(root, "connections", "codex.json"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("missing connection intent defaults to explicitly disconnected", async () => {
  await withTempFile(async (filePath) => {
    assert.deepEqual(await readConnectionIntent(filePath), disconnectedConnectionIntent());
  });
});

test("auto connection intent survives a fresh read", async () => {
  await withTempFile(async (filePath) => {
    await writeConnectionIntent(filePath, { schemaVersion: 1, desiredConnected: true, mode: "auto" });
    assert.deepEqual(await readConnectionIntent(filePath), { schemaVersion: 1, desiredConnected: true, mode: "auto" });
  });
});

test("manual connection intent retains only the explicit local executable path", async () => {
  await withTempFile(async (filePath) => {
    const manualPath = "C:\\Tools\\codex.exe";
    await writeConnectionIntent(filePath, { schemaVersion: 1, desiredConnected: true, mode: "manual", manualPath });
    assert.deepEqual(await readConnectionIntent(filePath), { schemaVersion: 1, desiredConnected: true, mode: "manual", manualPath });
    const stored = await readFile(filePath, "utf8");
    assert.equal(stored.includes("token"), false);
    assert.equal(stored.includes("secret"), false);
  });
});

test("disconnect intent replaces a previous desired connection", async () => {
  await withTempFile(async (filePath) => {
    await writeConnectionIntent(filePath, { schemaVersion: 1, desiredConnected: true, mode: "auto" });
    await writeConnectionIntent(filePath, disconnectedConnectionIntent());
    assert.deepEqual(await readConnectionIntent(filePath), disconnectedConnectionIntent());
  });
});

test("malformed or unsafe manual intent fails closed instead of reconnecting", async () => {
  await withTempFile(async (filePath) => {
    await writeFile(filePath, JSON.stringify({ schemaVersion: 1, desiredConnected: true, mode: "manual" }), { encoding: "utf8" }).catch(async (error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
      await writeConnectionIntent(filePath, disconnectedConnectionIntent());
      await writeFile(filePath, JSON.stringify({ schemaVersion: 1, desiredConnected: true, mode: "manual" }), "utf8");
    });
    await assert.rejects(() => readConnectionIntent(filePath), /missing its executable path/);
  });
});
