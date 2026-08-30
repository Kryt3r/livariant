import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { DiagnosticEvent } from "../src/diagnostics/efficiency.js";
import { DiagnosticEventStore } from "../src/diagnostics/store.js";

async function withTemporaryDirectory(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "livariant-diagnostics-"));
  try {
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const observed: DiagnosticEvent = {
  id: "observed-1",
  kind: "observed",
  timestamp: "2026-08-30T10:00:00.000Z",
  attribution: {
    provider: "example-provider",
    model: "example-model",
    projectId: "project-1",
    sessionId: "session-1",
    taskId: "task-1",
  },
  source: { kind: "provider", id: "example-provider.response.usage", version: "1" },
  usage: { inputTokens: 120, outputTokens: 30, cacheReadTokens: 50 },
};

const avoided: DiagnosticEvent = {
  id: "avoided-1",
  kind: "avoided",
  timestamp: "2026-08-30T10:01:00.000Z",
  metric: "context-tokens",
  consideredTokens: 1000,
  usedTokens: 300,
  reason: "Only selected context was transmitted.",
};

const estimated: DiagnosticEvent = {
  id: "estimated-1",
  kind: "estimated",
  timestamp: "2026-08-30T10:02:00.000Z",
  estimatedTokens: 250,
  method: { id: "retry-counterfactual", version: "1" },
  confidence: "medium",
  reason: "A repeated analysis call was estimated to have been avoided.",
};

test("diagnostic store durably appends and reads each evidence class without filling unknown token fields", async () => {
  await withTemporaryDirectory(async (directory) => {
    const store = new DiagnosticEventStore(join(directory, "diagnostics"));

    await store.append(observed);
    await store.append({ ...observed, id: "observed-unknown", usage: {} });
    await store.append(avoided);
    await store.append(estimated);

    const reloaded = new DiagnosticEventStore(join(directory, "diagnostics"));
    assert.deepEqual(await reloaded.readAll(), [
      observed,
      { ...observed, id: "observed-unknown", usage: {} },
      avoided,
      estimated,
    ]);
  });
});

test("diagnostic store persists observed provenance and only canonical measurement fields", async () => {
  await withTemporaryDirectory(async (directory) => {
    const store = new DiagnosticEventStore(directory);
    const eventWithExtraContent = {
      ...observed,
      prompt: "raw prompt must not be persisted",
      projectContent: "raw project content must not be persisted",
      source: { ...observed.source, agentClaim: "must not be persisted" },
      usage: { ...observed.usage, hiddenProviderPayload: "must not be persisted" },
    } as unknown as DiagnosticEvent;

    await store.append(eventWithExtraContent);

    const persisted = await readFile(store.path, "utf8");
    assert.doesNotMatch(persisted, /raw prompt|raw project content|agentClaim|hiddenProviderPayload/);
    assert.match(persisted, /example-provider\.response\.usage/);
    assert.deepEqual(await store.readAll(), [observed]);
  });
});

test("diagnostic store rejects observed evidence without provider/runtime provenance", async () => {
  await withTemporaryDirectory(async (directory) => {
    const store = new DiagnosticEventStore(join(directory, "diagnostics"));
    const missingSource = {
      id: "observed-without-source",
      kind: "observed",
      timestamp: "2026-08-30T10:00:00.000Z",
      usage: { inputTokens: 120 },
    } as unknown as DiagnosticEvent;

    await assert.rejects(store.append(missingSource), /source/i);
    assert.deepEqual(await store.readAll(), []);
  });
});

test("diagnostic store validates before creating durable evidence", async () => {
  await withTemporaryDirectory(async (directory) => {
    const store = new DiagnosticEventStore(join(directory, "diagnostics"));
    const invalid = {
      ...avoided,
      consideredTokens: 10,
      usedTokens: 11,
    };

    await assert.rejects(store.append(invalid), /must not exceed/i);
    assert.deepEqual(await store.readAll(), []);
  });
});

test("diagnostic store fails closed on malformed or unsupported persisted evidence", async () => {
  await withTemporaryDirectory(async (directory) => {
    const malformedStore = new DiagnosticEventStore(join(directory, "malformed"));
    await writeFile(malformedStore.path, "not-json\n", { encoding: "utf8", flag: "wx" }).catch(async (error) => {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
      const { mkdir } = await import("node:fs/promises");
      await mkdir(join(directory, "malformed"), { recursive: true });
      await writeFile(malformedStore.path, "not-json\n", "utf8");
    });
    await assert.rejects(malformedStore.readAll(), /not valid JSON/i);

    const unsupportedStore = new DiagnosticEventStore(join(directory, "unsupported"));
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(directory, "unsupported"), { recursive: true });
    await writeFile(
      unsupportedStore.path,
      `${JSON.stringify({ schemaVersion: 2, event: observed })}\n`,
      "utf8",
    );
    await assert.rejects(unsupportedStore.readAll(), /unsupported schema version/i);
  });
});

test("diagnostic store rejects filenames that can escape the configured directory", () => {
  assert.throws(() => new DiagnosticEventStore(".", "../diagnostics.jsonl"), /plain filename/i);
  assert.throws(() => new DiagnosticEventStore(".", "nested/diagnostics.jsonl"), /plain filename/i);
});
