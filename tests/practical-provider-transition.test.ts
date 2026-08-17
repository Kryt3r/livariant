import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { initializeProject, recordAcceptedDecision } from "../src/runtime/index.js";
import { mutateAcceptedFixture } from "./accepted-project-brain-fixture.js";
import {
  claudeCodePreviewResumeAdapter,
  codexPreviewResumeAdapter,
} from "../src/adapters/provider-resume-adapter.js";

const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));

async function withProject(run: (projectPath: string) => Promise<void>): Promise<void> {
  const projectPath = await mkdtemp(join(tmpdir(), "livariant-provider-transition-"));
  try {
    await initializeProject(projectPath, { authorized: true });
    await run(projectPath);
  } finally {
    await rm(projectPath, { recursive: true, force: true });
  }
}

function runProvider(projectPath: string, provider: "claude-code" | "codex", hiddenMemory: string) {
  return spawnSync(process.execPath, [cliPath, "resume", "--provider", provider], {
    cwd: projectPath,
    encoding: "utf8",
    shell: false,
    env: {
      ...process.env,
      LIVARIANT_PROVIDER_ENV: provider,
      LIVARIANT_TEST_PROVIDER_HIDDEN_MEMORY: hiddenMemory,
      PBF_RUNTIME_DELEGATION_BYPASS: "1",
    },
  });
}

test("preview resume adapters expose capability and compatibility without granting authority", () => {
  const claude = claudeCodePreviewResumeAdapter.inspect({ LIVARIANT_PROVIDER_ENV: "claude-code" });
  assert.equal(claude.lifecycle, "preview-supported");
  assert.equal(claude.compatibility, "compatible");
  assert.equal(claude.observedCapabilities["resume.context.project"], "available");
  assert.equal(claude.executionAuthorityGranted, false);
  assert.equal(claude.durableInstructionMutation, false);

  const unknown = codexPreviewResumeAdapter.inspect({});
  assert.equal(unknown.compatibility, "unknown");
  assert.equal(unknown.observedCapabilities["resume.context.project"], "unknown");

  const wrong = codexPreviewResumeAdapter.inspect({ LIVARIANT_PROVIDER_ENV: "claude-code" });
  assert.equal(wrong.compatibility, "incompatible");
  assert.equal(wrong.observedCapabilities["resume.context.project"], "unavailable");
});

test("Claude Code to Codex transition reconstructs canonical state across isolated processes", async () => {
  await withProject(async (projectPath) => {
    const claudeInstructions = resolve(projectPath, "CLAUDE.md");
    const codexInstructions = resolve(projectPath, "AGENTS.md");
    const claudeOwned = "# Human-owned Claude instructions\nProvider memory is not canonical.\n";
    const codexOwned = "# Human-owned Codex instructions\nProject Brain decisions remain authoritative.\n";
    await writeFile(claudeInstructions, claudeOwned, "utf8");
    await writeFile(codexInstructions, codexOwned, "utf8");

    const accepted = await mutateAcceptedFixture(projectPath, () => recordAcceptedDecision(
      "Provider handoff must reconstruct canonical Project Brain state",
      projectPath,
      { authorized: true },
    ));
    assert.equal(accepted.status, "active");

    const claude = runProvider(projectPath, "claude-code", "CLAUDE-SESSION-ONLY-SECRET");
    assert.equal(claude.status, 0, claude.stderr);
    assert.match(claude.stdout, /livariant\.claude-code\.resume@0\.1\.0-preview/);
    assert.match(claude.stdout, /Compatibility: compatible/);
    assert.match(claude.stdout, /Provider handoff must reconstruct canonical Project Brain state/);
    assert.doesNotMatch(claude.stdout, /CLAUDE-SESSION-ONLY-SECRET/);

    const codex = runProvider(projectPath, "codex", "CODEX-CONFLICTING-HIDDEN-MEMORY");
    assert.equal(codex.status, 0, codex.stderr);
    assert.match(codex.stdout, /livariant\.codex\.resume@0\.1\.0-preview/);
    assert.match(codex.stdout, /Compatibility: compatible/);
    assert.match(codex.stdout, /Provider handoff must reconstruct canonical Project Brain state/);
    assert.doesNotMatch(codex.stdout, /CLAUDE-SESSION-ONLY-SECRET|CODEX-CONFLICTING-HIDDEN-MEMORY/);

    assert.equal(await readFile(claudeInstructions, "utf8"), claudeOwned);
    assert.equal(await readFile(codexInstructions, "utf8"), codexOwned);
  });
});

test("provider-targeted resume fails closed without matching current environment evidence", async () => {
  await withProject(async (projectPath) => {
    const missing = spawnSync(process.execPath, [cliPath, "resume", "--provider", "claude-code"], {
      cwd: projectPath,
      encoding: "utf8",
      shell: false,
      env: { ...process.env, LIVARIANT_PROVIDER_ENV: "", PBF_RUNTIME_DELEGATION_BYPASS: "1" },
    });
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /cannot provide Preview resume handoff without current provider-environment evidence/i);

    const wrong = spawnSync(process.execPath, [cliPath, "resume", "--provider", "codex"], {
      cwd: projectPath,
      encoding: "utf8",
      shell: false,
      env: { ...process.env, LIVARIANT_PROVIDER_ENV: "claude-code", PBF_RUNTIME_DELEGATION_BYPASS: "1" },
    });
    assert.equal(wrong.status, 1);
    assert.match(wrong.stderr, /cannot provide Preview resume handoff without current provider-environment evidence/i);
  });
});
