import assert from "node:assert/strict";
import test from "node:test";
import type { DiagnosticEvent } from "../src/diagnostics/efficiency.js";
import { filterDiagnosticEventsByProjectScope } from "../src/diagnostics/project-scope.js";

const events: DiagnosticEvent[] = [
  {
    id: "a-1",
    kind: "observed",
    timestamp: "2026-09-20T10:00:00.000Z",
    source: { kind: "runtime", id: "codex", version: "1" },
    attribution: { provider: "openai-codex", projectId: "project-a" },
    usage: { totalTokens: 100 },
  },
  {
    id: "b-1",
    kind: "observed",
    timestamp: "2026-09-20T10:01:00.000Z",
    source: { kind: "runtime", id: "codex", version: "1" },
    attribution: { provider: "openai-codex", projectId: "project-b" },
    usage: { totalTokens: 200 },
  },
  {
    id: "u-1",
    kind: "observed",
    timestamp: "2026-09-20T10:02:00.000Z",
    source: { kind: "runtime", id: "codex", version: "1" },
    attribution: { provider: "openai-codex" },
    usage: { totalTokens: 300 },
  },
];

test("project diagnostics includes only exact project attribution", () => {
  const a = filterDiagnosticEventsByProjectScope(events, {}, "project-a");
  const b = filterDiagnosticEventsByProjectScope(events, {}, "project-b");

  assert.deepEqual(a.events.map((event) => event.id), ["a-1"]);
  assert.deepEqual(b.events.map((event) => event.id), ["b-1"]);
  assert.equal(a.unattributedEventCount, 1);
  assert.equal(b.unattributedEventCount, 1);
});

test("unattributed diagnostics evidence is never assigned to the active project", () => {
  const scoped = filterDiagnosticEventsByProjectScope(events, {}, "project-a");
  assert.equal(scoped.events.some((event) => event.id === "u-1"), false);
  assert.equal(scoped.unattributedEventCount, 1);
});

test("qualified session bindings attribute raw usage at query time without rewriting evidence", () => {
  const scoped = filterDiagnosticEventsByProjectScope(events, {}, "project-a", new Map([["session-raw", "project-a"]]));
  assert.equal(scoped.events.some((event) => event.id === "u-1"), false);

  const raw: DiagnosticEvent = {
    ...events[2]!,
    id: "raw-session",
    attribution: { provider: "openai-codex", sessionId: "session-raw" },
  };
  const attributed = filterDiagnosticEventsByProjectScope([...events, raw], {}, "project-a", new Map([["session-raw", "project-a"]]));
  assert.deepEqual(attributed.events.map((event) => event.id), ["a-1", "raw-session"]);
  assert.equal(attributed.unattributedEventCount, 1);
  assert.equal(raw.attribution?.projectId, undefined);
});

test("unknown and conflicting sessions remain unattributed", () => {
  const raw = events[2]!;
  const scoped = filterDiagnosticEventsByProjectScope([raw], {}, "project-a", new Map());
  assert.deepEqual(scoped.events, []);
  assert.equal(scoped.unattributedEventCount, 1);
});

test("project diagnostics applies the requested time range before scope counting", () => {
  const scoped = filterDiagnosticEventsByProjectScope(events, {
    start: "2026-09-20T10:01:30.000Z",
    end: "2026-09-20T10:03:00.000Z",
  }, "project-a");

  assert.deepEqual(scoped.events, []);
  assert.equal(scoped.unattributedEventCount, 1);
});

test("blank project diagnostics scope fails closed", () => {
  assert.throws(
    () => filterDiagnosticEventsByProjectScope(events, {}, "   "),
    /projectId is invalid/,
  );
});
