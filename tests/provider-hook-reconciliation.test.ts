import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parseProviderHookObservation } from "../src/connectors/provider-hook-observation.js";

const reconcileCli = fileURLToPath(new URL("../src/connectors/provider-hook-reconciliation-cli.js", import.meta.url));

test("Claude and Gemini hook observations keep only bounded correlation evidence", () => {
  const claude = parseProviderHookObservation("claude", JSON.stringify({
    session_id: "claude-session-a",
    transcript_path: "C:\\Users\\Robin\\.claude\\projects\\a\\session.jsonl",
    cwd: "/work/project-a",
    hook_event_name: "SessionEnd",
    permission_mode: "default",
    arbitrary_secret_like_field: "must-not-be-persisted",
  }), "2026-09-26T10:00:00.000Z");

  assert.deepEqual(claude, {
    schemaVersion: 1,
    evidenceClass: "provider-hook-observation",
    provider: "claude",
    sessionId: "claude-session-a",
    cwd: "/work/project-a",
    transcriptPath: "C:\\Users\\Robin\\.claude\\projects\\a\\session.jsonl",
    hookEventName: "SessionEnd",
    providerTimestamp: null,
    observedAt: "2026-09-26T10:00:00.000Z",
    projectTruth: false,
    grantsAuthority: false,
  });

  const gemini = parseProviderHookObservation("gemini", JSON.stringify({
    session_id: "gemini-session-b",
    transcript_path: "C:\\Users\\Robin\\.gemini\\tmp\\b.json",
    cwd: "/work/project-b",
    hook_event_name: "SessionStart",
    timestamp: "2026-09-26T09:59:59.000Z",
  }), "2026-09-26T10:00:00.000Z");
  assert.equal(gemini.providerTimestamp, "2026-09-26T09:59:59.000Z");

  assert.throws(
    () => parseProviderHookObservation("claude", "x".repeat(70 * 1024)),
    /size bound/i,
  );
  assert.throws(
    () => parseProviderHookObservation("gemini", JSON.stringify({
      session_id: "",
      cwd: "/work/project-b",
      hook_event_name: "SessionStart",
    })),
    /session_id must not be blank/i,
  );
});

test("provider hook reconciliation maps consistent sessions and leaves mixed sessions unattributed", () => {
  const input = {
    projects: [
      { desktopProjectId: "a", localRoot: "/work/project-a", projectId: "pa", stableProjectIdentity: null },
      { desktopProjectId: "b", localRoot: "/work/project-b", projectId: "pb", stableProjectIdentity: null },
    ],
    observations: [
      {
        provider: "claude", sessionId: "claude-a", cwd: "/work/project-a",
        transcriptPath: "/tmp/a.jsonl", hookEventName: "SessionStart", observedAt: "2026-09-26T10:00:00Z",
      },
      {
        provider: "claude", sessionId: "claude-a", cwd: "/work/project-a/src",
        transcriptPath: "/tmp/a.jsonl", hookEventName: "SessionEnd", observedAt: "2026-09-26T11:00:00Z",
      },
      {
        provider: "gemini", sessionId: "gemini-b", cwd: "/work/project-b",
        transcriptPath: "/tmp/b.json", hookEventName: "SessionEnd", observedAt: "2026-09-26T12:00:00Z",
      },
      {
        provider: "claude", sessionId: "mixed", cwd: "/work/project-a",
        transcriptPath: null, hookEventName: "SessionStart", observedAt: "2026-09-26T13:00:00Z",
      },
      {
        provider: "claude", sessionId: "mixed", cwd: "/work/project-b",
        transcriptPath: null, hookEventName: "SessionEnd", observedAt: "2026-09-26T14:00:00Z",
      },
    ],
  };
  const result = spawnSync(process.execPath, [reconcileCli], {
    input: JSON.stringify(input),
    encoding: "utf8",
    shell: false,
  });
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout) as {
    bindings: Array<{ provider: string; sessionId: string; project: { desktopProjectId: string } | null; attribution: string }>;
    boundaries: { evidenceIsProjectTruth: boolean; evidenceGrantsAuthority: boolean };
  };
  const bySession = new Map(parsed.bindings.map((binding) => [`${binding.provider}:${binding.sessionId}`, binding]));
  assert.equal(bySession.get("claude:claude-a")?.project?.desktopProjectId, "a");
  assert.equal(bySession.get("gemini:gemini-b")?.project?.desktopProjectId, "b");
  assert.equal(bySession.get("claude:mixed")?.project, null);
  assert.equal(bySession.get("claude:mixed")?.attribution, "mixed-projects");
  assert.equal(parsed.boundaries.evidenceIsProjectTruth, false);
  assert.equal(parsed.boundaries.evidenceGrantsAuthority, false);
});
