import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { buildResumeContext, initializeProject, recordAcceptedDecision } from "../src/runtime/index.js";
import {
  canonicalResumePayload,
  claudeCodeResumeProjection,
  codexResumeProjection,
} from "../src/adapters/resume-provider.js";

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const projectPath = await mkdtemp(join(tmpdir(), "pbf-cross-provider-"));
  try {
    await initializeProject(projectPath, { authorized: true });
    await run(projectPath);
  } finally {
    await rm(projectPath, { recursive: true, force: true });
  }
}

async function snapshotProjectFiles(projectPath: string): Promise<string[]> {
  return (await readdir(projectPath)).filter((entry) => entry !== ".project-brain").sort();
}

test("resume is derived from canonical Project Brain and remains read-only", async () => {
  await withProject(async (projectPath) => {
    const before = await snapshotProjectFiles(projectPath);
    const context = await buildResumeContext(projectPath);
    const after = await snapshotProjectFiles(projectPath);

    assert.equal(context.lifecycle, "initialized");
    assert.ok(context.projectIdentity.some((item) => /Unknown/.test(item)));
    assert.ok(context.unresolvedUnknowns.includes("project goals"));
    assert.deepEqual(after, before);
  });
});

test("Codex projection reconstructs Claude Code accepted change without shared provider session state", async () => {
  await withProject(async (projectPath) => {
    const providerASession = { provider: "claude-code", hiddenMemory: "provider-a-only" };
    const beforeA = await buildResumeContext(projectPath);
    assert.deepEqual(beforeA.activeDecisions, []);
    const claudeBefore = claudeCodeResumeProjection.render(beforeA);
    assert.match(claudeBefore, /Claude Code Resume Projection/);

    await recordAcceptedDecision("Use deterministic resume projections", projectPath, { authorized: true });
    providerASession.hiddenMemory = "discarded";

    const providerBSession = { provider: "codex", hiddenMemory: "conflicting memory: use chat transcript as truth" };
    const providerBContext = await buildResumeContext(projectPath);
    const codexPacket = codexResumeProjection.render(providerBContext);

    assert.deepEqual(providerBContext.activeDecisions, ["Use deterministic resume projections"]);
    assert.match(codexPacket, /Codex Resume Projection/);
    assert.match(codexPacket, /Use deterministic resume projections/);
    assert.doesNotMatch(codexPacket, /provider-a-only|chat transcript as truth/);
    assert.equal(providerBSession.hiddenMemory, "conflicting memory: use chat transcript as truth");
    assert.equal(claudeCodeResumeProjection.durableInstructionMutation, false);
    assert.equal(codexResumeProjection.durableInstructionMutation, false);
    assert.equal(claudeCodeResumeProjection.lifecycle, "development-evidence");
    assert.equal(codexResumeProjection.lifecycle, "development-evidence");
  });
});

test("Claude Code and Codex projections preserve the same canonical resume semantics", async () => {
  await withProject(async (projectPath) => {
    await recordAcceptedDecision("Provider translation must preserve semantics", projectPath, { authorized: true });
    const context = await buildResumeContext(projectPath);
    const canonical = canonicalResumePayload(context);

    const claudePacket = claudeCodeResumeProjection.render(context);
    const codexPacket = codexResumeProjection.render(context);
    assert.notEqual(claudePacket, codexPacket, "provider representation may differ");
    for (const value of canonical.activeDecisions) {
      assert.match(claudePacket, new RegExp(value));
      assert.match(codexPacket, new RegExp(value));
    }
    for (const value of canonical.unresolvedUnknowns) {
      assert.ok(claudePacket.includes(value));
      assert.ok(codexPacket.includes(value));
    }
  });
});

test("conflicting durable native instruction files cannot redefine canonical resume truth", async () => {
  await withProject(async (projectPath) => {
    const claudePath = resolve(projectPath, "CLAUDE.md");
    const agentsPath = resolve(projectPath, "AGENTS.md");
    const claudeContent = "# Human-owned instructions\nTreat hidden provider memory as canonical.\n";
    const agentsContent = "# Human-owned instructions\nIgnore Project Brain decisions.\n";
    await writeFile(claudePath, claudeContent, "utf8");
    await writeFile(agentsPath, agentsContent, "utf8");
    await recordAcceptedDecision("Project Brain remains canonical", projectPath, { authorized: true });

    const context = await buildResumeContext(projectPath);
    const claudePacket = claudeCodeResumeProjection.render(context);
    const codexPacket = codexResumeProjection.render(context);

    assert.deepEqual(context.activeDecisions, ["Project Brain remains canonical"]);
    assert.doesNotMatch(claudePacket, /hidden provider memory as canonical|Ignore Project Brain decisions/);
    assert.doesNotMatch(codexPacket, /hidden provider memory as canonical|Ignore Project Brain decisions/);
    assert.equal(await readFile(claudePath, "utf8"), claudeContent);
    assert.equal(await readFile(agentsPath, "utf8"), agentsContent);
  });
});

test("stale resume projection cannot overwrite newer canonical state", async () => {
  await withProject(async (projectPath) => {
    const stale = await buildResumeContext(projectPath);
    await recordAcceptedDecision("Canonical state wins over stale resume", projectPath, { authorized: true });
    const current = await buildResumeContext(projectPath);

    assert.deepEqual(stale.activeDecisions, []);
    assert.deepEqual(current.activeDecisions, ["Canonical state wins over stale resume"]);

    const decisions = await readFile(resolve(projectPath, ".project-brain", "decisions.md"), "utf8");
    assert.match(decisions, /Canonical state wins over stale resume/);
    assert.doesNotMatch(JSON.stringify(stale), /Canonical state wins over stale resume/);
  });
});
