import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { inspectInitialization } from "../src/runtime/index.js";

async function withProject(run: (projectPath: string) => Promise<void>): Promise<void> {
  const projectPath = await mkdtemp(join(tmpdir(), "livariant-adoption-inventory-"));
  try {
    await run(projectPath);
  } finally {
    await rm(projectPath, { recursive: true, force: true });
  }
}

test("existing-project adoption inventory records relevant truth surfaces as evidence only", async () => {
  await withProject(async (projectPath) => {
    await mkdir(resolve(projectPath, ".github", "workflows"), { recursive: true });
    await mkdir(resolve(projectPath, "docs"));
    await mkdir(resolve(projectPath, "tests"));
    await writeFile(resolve(projectPath, "AGENTS.md"), "Agent rules that must not become Project Truth automatically.\n");
    await writeFile(resolve(projectPath, "CLAUDE.md"), "Provider-local guidance.\n");
    await writeFile(resolve(projectPath, "CONTRIBUTING.md"), "Development rules.\n");
    await writeFile(resolve(projectPath, "ARCHITECTURE.md"), "Architecture notes.\n");
    await writeFile(resolve(projectPath, "docs", "decision-log.md"), "Decision history.\n");
    await writeFile(resolve(projectPath, "docs", "api.md"), "API docs.\n");
    await writeFile(resolve(projectPath, ".github", "workflows", "ci.yml"), "name: CI\n");
    await writeFile(resolve(projectPath, "package.json"), JSON.stringify({ name: "adoption-example" }));
    await writeFile(resolve(projectPath, "tsconfig.json"), "{}\n");

    const plan = await inspectInitialization(projectPath);
    const inventory = plan.discovery.adoption;

    assert.equal(plan.projectState, "existing-project-without-brain");
    assert.equal(plan.discovery.changesMade, 0);
    assert.equal(inventory.boundaries.changesMade, 0);
    assert.equal(inventory.boundaries.evidenceIsProjectTruth, false);
    assert.equal(inventory.boundaries.contentsInterpreted, false);
    assert.equal(inventory.boundaries.grantsAuthority, false);
    assert.deepEqual(plan.projectFilesToModify, []);

    assert.ok(inventory.surfaces.some((item) => item.kind === "agent-guidance" && item.path === "AGENTS.md" && item.trust === "evidence-only"));
    assert.ok(inventory.surfaces.some((item) => item.kind === "agent-guidance" && item.path === "CLAUDE.md"));
    assert.ok(inventory.surfaces.some((item) => item.kind === "project-rules" && item.path === "CONTRIBUTING.md"));
    assert.ok(inventory.surfaces.some((item) => item.kind === "architecture" && item.path === "ARCHITECTURE.md"));
    assert.ok(inventory.surfaces.some((item) => item.kind === "decision-record" && item.path === "docs/decision-log.md"));
    assert.ok(inventory.surfaces.some((item) => item.kind === "documentation" && item.path === "docs/api.md"));
    assert.ok(inventory.surfaces.some((item) => item.kind === "ci" && item.path === ".github/workflows/ci.yml"));
    assert.ok(inventory.surfaces.some((item) => item.kind === "tests" && item.path === "tests"));
    assert.ok(inventory.surfaces.some((item) => item.kind === "tooling" && item.path === "package.json"));
    assert.ok(inventory.surfaces.some((item) => item.kind === "tooling" && item.path === "tsconfig.json"));
  });
});

test("adoption inventory surfaces overlapping guidance and multiple CI systems without resolving precedence", async () => {
  await withProject(async (projectPath) => {
    await mkdir(resolve(projectPath, ".github", "workflows"), { recursive: true });
    await writeFile(resolve(projectPath, "AGENTS.md"), "Use rule A.\n");
    await writeFile(resolve(projectPath, "CLAUDE.md"), "Use rule B.\n");
    await writeFile(resolve(projectPath, ".github", "workflows", "ci.yml"), "name: GitHub CI\n");
    await writeFile(resolve(projectPath, ".gitlab-ci.yml"), "stages: [test]\n");

    const plan = await inspectInitialization(projectPath);
    const inventory = plan.discovery.adoption;

    const guidanceAttention = inventory.attention.find((item) => item.code === "adoption-multiple-agent-guidance-surfaces");
    assert.ok(guidanceAttention);
    assert.deepEqual(guidanceAttention.provenance, ["AGENTS.md", "CLAUDE.md"]);
    assert.match(guidanceAttention.message, /does not assume precedence/i);

    const ciAttention = inventory.attention.find((item) => item.code === "adoption-multiple-ci-systems");
    assert.ok(ciAttention);
    assert.deepEqual(ciAttention.provenance, [".gitlab-ci.yml", ".github/workflows/ci.yml"]);
    assert.match(ciAttention.message, /does not guess/i);

    assert.ok(plan.discovery.attention.some((item) => item.code === "adoption-multiple-agent-guidance-surfaces"));
    assert.ok(plan.discovery.attention.some((item) => item.code === "adoption-multiple-ci-systems"));
  });
});

test("adoption inventory does not ingest surface contents and refuses unsafe candidate paths", async () => {
  await withProject(async (projectPath) => {
    const sensitiveText = "DO_NOT_COPY_THIS_PROJECT_LOCAL_VALUE";
    await mkdir(resolve(projectPath, "CONTRIBUTING.md"));
    await mkdir(resolve(projectPath, "docs"));
    await writeFile(resolve(projectPath, "docs", "architecture.md"), `${sensitiveText}\n`);

    const plan = await inspectInitialization(projectPath);
    const inventory = plan.discovery.adoption;
    const serialized = JSON.stringify(inventory);

    assert.doesNotMatch(serialized, new RegExp(sensitiveText));
    assert.ok(inventory.surfaces.some((item) => item.kind === "architecture" && item.path === "docs/architecture.md"));
    assert.ok(!inventory.surfaces.some((item) => item.path === "CONTRIBUTING.md"));
    assert.ok(inventory.attention.some((item) => item.code === "adoption-unsafe-surface-path" && item.provenance.includes("CONTRIBUTING.md")));
  });
});
