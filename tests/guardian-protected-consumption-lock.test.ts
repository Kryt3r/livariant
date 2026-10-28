import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { withExclusiveGuardianConsumeLock } from "../src/guardian/protected-helper.js";

const RECORD = "f6ae1508-8aa3-4afe-92e0-70144201f881.json";
async function withFixture(run: (dir: string, record: string) => Promise<void>) {
  const dir = await mkdtemp(resolve(tmpdir(), "livariant-exclusive-consume-"));
  const record = resolve(dir, RECORD);
  try {
    await writeFile(record, '{"state":"active"}');
    await run(dir, record);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("a Guardian consumption lock allows only one ongoing transition for the same protected record", async () => {
  await withFixture(async (dir, record) => {
    let acquired!: () => void;
    let release!: () => void;
    const entered = new Promise<void>(resolve => { acquired = resolve; });
    const pending = new Promise<void>(resolve => { release = resolve; });
    const first = withExclusiveGuardianConsumeLock(record, async () => {
      acquired();
      await pending;
      return "first";
    });
    await entered;
    await assert.rejects(
      withExclusiveGuardianConsumeLock(record, async () => "second"),
      /active or interrupted|protected recovery/i,
    );
    release();
    assert.equal(await first, "first");
    assert.deepEqual(await readdir(dir), [RECORD]);
    assert.equal(await withExclusiveGuardianConsumeLock(record, async () => "fresh"), "fresh");
  });
});

test("a crash-remnant directory prevents retry rather than guessing Authority state", async () => {
  await withFixture(async (dir, record) => {
    const lockPath = resolve(dir, "." + RECORD + ".consume.lock");
    await mkdir(lockPath);
    await assert.rejects(
      withExclusiveGuardianConsumeLock(record, async () => { throw Error("must not run"); }),
      /active or interrupted/i,
    );
    assert.ok((await readdir(dir)).includes("." + RECORD + ".consume.lock"));
  });
});

test("failed callback releases owned exclusion without granting Authority", async () => {
  await withFixture(async (dir, record) => {
    await assert.rejects(
      withExclusiveGuardianConsumeLock(record, async () => { throw new Error("invalid exact material"); }),
      /invalid exact material/,
    );
    assert.deepEqual(await readdir(dir), [RECORD]);
  });
});

test("lock paths reject arbitrary record names and cannot be substituted with an existing file", async () => {
  await withFixture(async (dir, record) => {
    await assert.rejects(
      withExclusiveGuardianConsumeLock(resolve(dir, "../wrong.json"), async () => false),
      /exact protected Authority record filename/,
    );
    const lockPath = resolve(dir, "." + RECORD + ".consume.lock");
    await writeFile(lockPath, "untrusted lock impostor");
    await assert.rejects(
      withExclusiveGuardianConsumeLock(record, async () => true),
      /active or interrupted/i,
    );
    assert.ok((await readdir(dir)).includes("." + RECORD + ".consume.lock"));
  });
});


test("separate OS processes exclude concurrent consumption and leave a fail-closed lock after kill", async () => {
  await withFixture(async (dir, record) => {
    const moduleUri = new URL("../src/guardian/protected-helper.js", import.meta.url).href;
    const program = [
      'import { withExclusiveGuardianConsumeLock } from ' + JSON.stringify(moduleUri),
      'await withExclusiveGuardianConsumeLock(process.argv[1], async () => {',
      '  process.stdout.write("ACQUIRED\\n");',
      '  process.stdin.resume();',
      '  await new Promise(resolve => process.stdin.once("data", resolve));',
      '});',
    ].join("\n");
    const child = spawn(process.execPath, ["--input-type=module", "-e", program, record], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let exited = false;
    child.once("exit", () => { exited = true; });
    try {
      const acquired = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Guardian lock worker did not acquire the lock")), 20000);
        child.stdout!.once("data", bytes => {
          clearTimeout(timeout);
          resolve(String(bytes));
        });
        child.once("error", error => {
          clearTimeout(timeout);
          reject(error);
        });
      });
      assert.match(acquired, /ACQUIRED/);
      await assert.rejects(
        withExclusiveGuardianConsumeLock(record, async () => "cross-process-contender"),
        /active or interrupted/i,
      );
      child.kill("SIGKILL");
      if (!exited) await once(child, "exit");
      await assert.rejects(
        withExclusiveGuardianConsumeLock(record, async () => "post-crash-retry"),
        /active or interrupted/i,
      );
      assert.ok((await readdir(dir)).includes("." + RECORD + ".consume.lock"));
    } finally {
      if (!exited) {
        child.kill("SIGKILL");
        await once(child, "exit");
      }
    }
  });
});
