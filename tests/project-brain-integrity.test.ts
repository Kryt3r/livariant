import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { ProjectBrainStore } from "../src/project-brain/store.js";
import {
  inspectProjectBrainIntegrity,
  recordAcceptedProjectBrainState,
} from "../src/project-brain/integrity.js";
import { runDoctor } from "../src/runtime/doctor.js";
import { FRAMEWORK_VERSION } from "../src/lifecycle/state.js";

const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));

async function withEnvironment(run: (project: string, home: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(resolve(tmpdir(), "livariant-brain-integrity-"));
  const project = resolve(root, "project");
  const home = resolve(root, "home");
  await mkdir(project);
  await mkdir(home);
  try {
    await run(project, home);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function initialize(project: string): Promise<ProjectBrainStore> {
  const store = new ProjectBrainStore(project);
  await store.bootstrap(
    {
      framework: { version: FRAMEWORK_VERSION, channel: "preview" },
      projectBrain: { schemaVersion: 2, projectId: randomUUID().toLowerCase() },
    },
    { projectName: "integrity-test", evidence: [], unknowns: [] },
  );
  return store;
}

async function establish(project: string, home: string): Promise<void> {
  await recordAcceptedProjectBrainState(project, "manual-bootstrap", { homeDir: home });
  const state = await inspectProjectBrainIntegrity(project, { homeDir: home });
  assert.equal(state.state, "match");
}

for (const [file, injected] of [
  ["project.md", "\n- Agent supplied identity claim\n"],
  ["goals.md", "\n- Agent supplied canonical goal\n"],
  ["decisions.md", "\n- Agent supplied canonical decision\n"],
  ["knowledge.md", "\n- Agent supplied canonical fact\n"],
] as const) {
  test(`direct structurally valid ${file} edit is not silently accepted as canonical`, async () => {
    await withEnvironment(async (project, home) => {
      await initialize(project);
      await establish(project, home);
      const path = resolve(project, ".project-brain", file);
      await writeFile(path, `${await readFile(path, "utf8")}${injected}`);

      const integrity = await inspectProjectBrainIntegrity(project, { homeDir: home });
      assert.equal(integrity.state, "mismatch");

      const doctor = await runDoctor(project, { integrityStorage: { homeDir: home } });
      assert.equal(doctor.state, "drift-detected");
      assert.ok(doctor.findings.some((finding) => finding.code === "project-brain-integrity-mismatch"));
    });
  });
}

test("stable project identity substitution invalidates accepted canonical material", async () => {
  await withEnvironment(async (project, home) => {
    await initialize(project);
    await establish(project, home);
    const metadataPath = resolve(project, ".project-brain", "metadata.json");
    const metadata = JSON.parse(await readFile(metadataPath, "utf8")) as {
      framework: { version: string; channel: string };
      projectBrain: { schemaVersion: number; projectId: string };
    };
    metadata.projectBrain.projectId = randomUUID().toLowerCase();
    await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);

    const integrity = await inspectProjectBrainIntegrity(project, { homeDir: home });
    assert.equal(integrity.state, "mismatch");
    assert.match(integrity.reason, /stable identity differs/i);
  });
});

test("framework lifecycle metadata change alone does not invalidate semantic integrity", async () => {
  await withEnvironment(async (project, home) => {
    await initialize(project);
    await establish(project, home);
    const metadataPath = resolve(project, ".project-brain", "metadata.json");
    const metadata = JSON.parse(await readFile(metadataPath, "utf8")) as {
      framework: { version: string; channel: string };
      projectBrain: { schemaVersion: number; projectId: string };
    };
    metadata.framework.version = "0.0.42-development";
    metadata.framework.channel = "development";
    await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);

    const integrity = await inspectProjectBrainIntegrity(project, { homeDir: home });
    assert.equal(integrity.state, "match");
  });
});

test("missing integrity evidence blocks doctor from declaring schema-2 Project Brain healthy", async () => {
  await withEnvironment(async (project, home) => {
    await initialize(project);
    const doctor = await runDoctor(project, { integrityStorage: { homeDir: home } });
    assert.equal(doctor.state, "drift-detected");
    assert.ok(doctor.findings.some((finding) => finding.code === "project-brain-integrity-unestablished"));
  });
});

test("non-interactive agent cannot bootstrap integrity acceptance", async () => {
  await withEnvironment(async (project) => {
    await initialize(project);
    const result = spawnSync(process.execPath, [cliPath, "integrity", "accept-current"], {
      cwd: project,
      encoding: "utf8",
      shell: false,
      env: { ...process.env, PBF_RUNTIME_DELEGATION_BYPASS: "1" },
    });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /interactive local terminal/i);
  });
});
