import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { LILEventStore, type LILEvent } from "../src/intelligence/event-ledger.js";
import { LILTaskJournal } from "../src/intelligence/task-journal.js";

const PROJECT_A = "41496158-70a9-4e7a-b5e5-0f77d5ea04a2";
const PROJECT_B = "a1b32122-f707-4832-a08a-f30a12110123";
const WHEN = "2026-10-24T20:00:00.000Z";

async function temp(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "livariant-lil-"));
  try { await run(dir); }
  finally { await rm(dir, { recursive: true, force: true }); }
}
function observation(projectId = PROJECT_A): LILEvent {
  return {
    schemaVersion: 1,
    eventId: "observation-1",
    projectId,
    occurredAt: WHEN,
    kind: "provider-observed",
    severity: "info",
    actor: { kind: "provider", id: "codex" },
    correlationId: "session-1",
    evidenceRefs: ["provider-evidence-1"],
  };
}

test("LIL event ledger survives reinstantiation and distinguishes exact duplicates from conflicts", async () => {
  await temp(async dir => {
    const first = new LILEventStore(dir, PROJECT_A);
    assert.equal(await first.append(observation()), "recorded");
    assert.equal(await first.append(observation()), "duplicate");
    const second = new LILEventStore(dir, PROJECT_A);
    assert.deepEqual(await second.snapshot(), {
      projectId: PROJECT_A,
      events: [observation()],
      incompleteWrites: 0,
    });
    await assert.rejects(
      first.append({ ...observation(), severity: "critical" }),
      /conflicting duplicate/i,
    );
    assert.equal((await second.snapshot()).events.length, 1);
  });
});

test("LIL ledger refuses cross-project attribution and isolates two project namespaces", async () => {
  await temp(async dir => {
    const a = new LILEventStore(dir, PROJECT_A);
    const b = new LILEventStore(dir, PROJECT_B);
    await a.append(observation());
    await b.append(observation(PROJECT_B));
    assert.deepEqual((await a.snapshot()).events, [observation()]);
    assert.deepEqual((await b.snapshot()).events, [observation(PROJECT_B)]);
    await assert.rejects(a.append(observation(PROJECT_B)), /cross-project/i);
    assert.throws(() => new LILEventStore(dir, "desktop-selected-project"), /stable project identity/i);
  });
});

test("LIL ledger rejects unexpected fields instead of persisting prompts or project contents", async () => {
  await temp(async dir => {
    const store = new LILEventStore(dir, PROJECT_A);
    await assert.rejects(
      store.append({ ...observation(), prompt: "TOP-SECRET-RAW-PROMPT" } as unknown as LILEvent),
      /unsupported field/i,
    );
    assert.deepEqual((await store.snapshot()).events, []);
    await store.append(observation());
    const file = (await readdir(store.path)).find(name => name.endsWith(".json"))!;
    const raw = await readFile(join(store.path, file), "utf8");
    assert.doesNotMatch(raw, /TOP-SECRET-RAW-PROMPT/);
    assert.match(raw, /provider-observed/);
  });
});

test("LIL ledger detects modified committed records rather than trusting same-user hashes as Authority", async () => {
  await temp(async dir => {
    const store = new LILEventStore(dir, PROJECT_A);
    await store.append(observation());
    const name = (await readdir(store.path)).find(file => file.endsWith(".json"))!;
    const path = join(store.path, name);
    const original = JSON.parse(await readFile(path, "utf8")) as {
      event: LILEvent; digest: string; schemaVersion: 1
    };
    original.event.severity = "critical";
    await writeFile(path, JSON.stringify(original) + "\n");
    await assert.rejects(store.snapshot(), /integrity checks/i);
    await assert.rejects(store.append(observation()), /integrity checks/i);
  });
});

test("LIL ledger exposes incomplete writes; task recovery must not silently discard them", async () => {
  await temp(async dir => {
    const store = new LILEventStore(dir, PROJECT_A);
    await store.append(observation());
    await writeFile(join(store.path, ".pending-" + randomUUID()), "partial-durable-write");
    const snapshot = await store.snapshot();
    assert.equal(snapshot.incompleteWrites, 1);
    assert.equal(snapshot.events.length, 1);
    const journal = new LILTaskJournal(store);
    await assert.rejects(journal.transition({
      taskId: "task-one", expectedVersion: null, from: null, to: "queued",
    }), /incomplete event writes/i);
  });
});

test("LIL ledger rejects symlinked project event directory", async t => {
  await temp(async dir => {
    const store = new LILEventStore(dir, PROJECT_A);
    await store.append(observation());
    const outside = join(dir, "outside");
    await mkdir(outside);
    const renamed = join(dir, "original-events");
    const { rename } = await import("node:fs/promises");
    await rename(store.path, renamed);
    try {
      await symlink(renamed, store.path, "dir");
    } catch (error) {
      if (error instanceof Error && "code" in error
          && (error.code === "EPERM" || error.code === "EACCES")) {
        t.skip("Creating Windows directory symlinks is unavailable in this environment.");
        return;
      }
      throw error;
    }
    await assert.rejects(store.snapshot(), /not symbolic links/i);
  });
});

test("LIL journal reconstructs task state after restart and rejects stale/illegal transitions", async () => {
  await temp(async dir => {
    const ledger = new LILEventStore(dir, PROJECT_A);
    const journal = new LILTaskJournal(ledger);
    const queued = await journal.transition({
      taskId: "task-one", expectedVersion: null, from: null, to: "queued",
    });
    assert.equal(queued.version, 0);
    const running = await journal.transition({
      taskId: "task-one", expectedVersion: 0, from: "queued", to: "analyzing",
    });
    assert.equal(running.version, 1);
    const restored = new LILTaskJournal(new LILEventStore(dir, PROJECT_A));
    assert.deepEqual((await restored.tasks()).map(task => [task.taskId, task.state, task.version]), [
      ["task-one", "analyzing", 1],
    ]);
    await assert.rejects(restored.transition({
      taskId: "task-one", expectedVersion: 0, from: "queued", to: "completed",
    }), /stale version/i);
    await assert.rejects(restored.transition({
      taskId: "task-one", expectedVersion: 1, from: "analyzing", to: "queued",
    }), /not permitted/i);
    await restored.transition({
      taskId: "task-one", expectedVersion: 1, from: "analyzing", to: "proposal-ready",
    });
    await restored.transition({
      taskId: "task-one", expectedVersion: 2, from: "proposal-ready", to: "awaiting-approval",
    });
    await assert.rejects(restored.transition({
      taskId: "task-one", expectedVersion: 3, from: "awaiting-approval", to: "completed",
    }), /not permitted/i);
  });
});

test("concurrent LIL transitions cannot both commit into the same task version", async () => {
  await temp(async dir => {
    const ledger = new LILEventStore(dir, PROJECT_A);
    const journal = new LILTaskJournal(ledger);
    await journal.transition({
      taskId: "task-one", expectedVersion: null, from: null, to: "queued",
    });
    const results = await Promise.allSettled([
      journal.transition({ taskId: "task-one", expectedVersion: 0, from: "queued", to: "analyzing" }),
      journal.transition({ taskId: "task-one", expectedVersion: 0, from: "queued", to: "blocked" }),
    ]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(results.filter(result => result.status === "rejected").length, 1);
    const tasks = await journal.tasks();
    assert.equal(tasks[0].version, 1);
    assert.ok(["analyzing", "blocked"].includes(tasks[0].state));
  });
});

test("LIL journal refuses forged discontinuous task history on replay", async () => {
  await temp(async dir => {
    const ledger = new LILEventStore(dir, PROJECT_A);
    await ledger.append({
      schemaVersion: 1,
      eventId: "malformed-transition-sequence",
      projectId: PROJECT_A,
      occurredAt: WHEN,
      kind: "task-transition",
      severity: "info",
      actor: { kind: "runtime", id: "livariant-lil" },
      taskId: "task-one",
      transition: { version: 2, from: "analyzing", to: "completed" },
    });
    await assert.rejects(new LILTaskJournal(ledger).tasks(), /discontinuous/i);
  });
});
