import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { inspectInitialization } from "../src/runtime/index.js";

async function withProject(run: (projectPath: string) => Promise<void>): Promise<void> {
  const projectPath = await mkdtemp(join(tmpdir(), "livariant-bootstrap-discovery-"));
  try {
    await run(projectPath);
  } finally {
    await rm(projectPath, { recursive: true, force: true });
  }
}

test("bootstrap discovery returns bounded high-signal evidence with provenance and no mutation", async () => {
  await withProject(async (projectPath) => {
    await mkdir(resolve(projectPath, ".git"));
    await mkdir(resolve(projectPath, "src"));
    await mkdir(resolve(projectPath, "docs"));
    await writeFile(resolve(projectPath, "README.md"), "# Example\n");
    await writeFile(resolve(projectPath, "CLAUDE.md"), "Project-local agent guidance.\n");
    await writeFile(resolve(projectPath, "AGENTS.md"), "Provider-neutral agent guidance.\n");
    await writeFile(resolve(projectPath, "tsconfig.json"), "{}\n");
    await writeFile(resolve(projectPath, "package-lock.json"), "{}\n");
    await writeFile(resolve(projectPath, "package.json"), JSON.stringify({
      name: "bootstrap-example",
      scripts: { build: "tsc", test: "node --test" },
      dependencies: { next: "1.0.0", react: "1.0.0", "@supabase/supabase-js": "1.0.0" },
      devDependencies: { typescript: "1.0.0" },
    }));

    const plan = await inspectInitialization(projectPath);
    assert.equal(plan.projectState, "existing-project-without-brain");
    assert.equal(plan.discovery.changesMade, 0);
    assert.deepEqual(plan.projectFilesToModify, []);

    const evidence = plan.discovery.evidence;
    assert.ok(evidence.some((item) => item.kind === "documentation" && item.provenance === "README.md" && item.confidence === "confirmed"));
    assert.ok(evidence.some((item) => item.kind === "agent-guidance" && item.provenance === "CLAUDE.md"));
    assert.ok(evidence.some((item) => item.kind === "agent-guidance" && item.provenance === "AGENTS.md"));
    assert.ok(evidence.some((item) => item.kind === "stack" && item.value === "Next.js" && item.confidence === "strongly_inferred"));
    assert.ok(evidence.some((item) => item.kind === "stack" && item.value === "Supabase client"));
    assert.ok(evidence.some((item) => item.kind === "tooling" && item.value === "test script declared"));
    assert.ok(plan.discovery.unknowns.includes("project purpose"));
  });
});

test("bootstrap discovery flags ambiguous Node lockfiles without guessing a package manager", async () => {
  await withProject(async (projectPath) => {
    await writeFile(resolve(projectPath, "package.json"), JSON.stringify({ name: "mixed-locks" }));
    await writeFile(resolve(projectPath, "package-lock.json"), "{}\n");
    await writeFile(resolve(projectPath, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");

    const plan = await inspectInitialization(projectPath);
    const finding = plan.discovery.attention.find((item) => item.code === "discovery-multiple-node-lockfiles");
    assert.ok(finding);
    assert.equal(finding.severity, "review");
    assert.deepEqual(finding.provenance, ["package-lock.json", "pnpm-lock.yaml"]);
  });
});

test("bootstrap discovery records sensitive-file presence without exposing contents", async () => {
  await withProject(async (projectPath) => {
    const secret = "TOP_SECRET_VALUE_SHOULD_NEVER_APPEAR_IN_DISCOVERY";
    await writeFile(resolve(projectPath, ".env"), `TOKEN=${secret}\n`);
    await writeFile(resolve(projectPath, "package.json"), JSON.stringify({ name: "secret-example" }));

    const plan = await inspectInitialization(projectPath);
    const serialized = JSON.stringify(plan.discovery);
    assert.ok(plan.discovery.attention.some((item) => item.code === "discovery-sensitive-file-present" && item.provenance.includes(".env")));
    assert.doesNotMatch(serialized, new RegExp(secret));
  });
});

test("bootstrap discovery refuses to interpret high-signal paths that are directories", async () => {
  await withProject(async (projectPath) => {
    await mkdir(resolve(projectPath, "CLAUDE.md"));
    await writeFile(resolve(projectPath, "package.json"), JSON.stringify({ name: "unsafe-guidance-path" }));

    const plan = await inspectInitialization(projectPath);
    assert.ok(plan.discovery.attention.some((item) => item.code === "discovery-unsafe-high-signal-file" && item.provenance.includes("CLAUDE.md")));
    assert.ok(!plan.discovery.evidence.some((item) => item.provenance === "CLAUDE.md"));
  });
});
