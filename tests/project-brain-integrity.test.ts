import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
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
import { addConfirmedKnowledge } from "../src/runtime/canonical-knowledge-change.js";
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

async function integrityReceiptPath(project: string, home: string): Promise<string> {
  const locator = createHash("sha256").update(await realpath(project), "utf8").digest("hex");
  return resolve(home, ".livariant", "integrity", "project-brain", `${locator}.json`);
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

test("corrupt integrity evidence fails closed", async () => {
  await withEnvironment(async (project, home) => {
    await initialize(project);
    await establish(project, home);
    await writeFile(await integrityReceiptPath(project, home), "{not-json\n");

    const integrity = await inspectProjectBrainIntegrity(project, { homeDir: home });
    assert.equal(integrity.state, "invalid");
    const doctor = await runDoctor(project, { integrityStorage: { homeDir: home } });
    assert.equal(doctor.state, "drift-detected");
    assert.ok(doctor.findings.some((finding) => finding.code === "project-brain-integrity-evidence-invalid"));
  });
});

test("restoring stale previously accepted semantic bytes is detected", async () => {
  await withEnvironment(async (project, home) => {
    await initialize(project);
    await establish(project, home);
    const knowledgePath = resolve(project, ".project-brain", "knowledge.md");
    const oldBytes = await readFile(knowledgePath);

    await addConfirmedKnowledge("new accepted state", project, { authorized: true });
    await recordAcceptedProjectBrainState(project, "semantic-apply", { homeDir: home });
    assert.equal((await inspectProjectBrainIntegrity(project, { homeDir: home })).state, "match");

    await writeFile(knowledgePath, oldBytes);
    assert.equal((await inspectProjectBrainIntegrity(project, { homeDir: home })).state, "mismatch");
  });
});

test("copying a complete different Project Brain into the same physical project is detected", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "livariant-brain-copy-"));
  const projectA = resolve(root, "project-a");
  const projectB = resolve(root, "project-b");
  const home = resolve(root, "home");
  await mkdir(projectA);
  await mkdir(projectB);
  await mkdir(home);
  try {
    await initialize(projectA);
    await initialize(projectB);
    await establish(projectA, home);

    await rm(resolve(projectA, ".project-brain"), { recursive: true, force: true });
    await cp(resolve(projectB, ".project-brain"), resolve(projectA, ".project-brain"), { recursive: true });

    const integrity = await inspectProjectBrainIntegrity(projectA, { homeDir: home });
    assert.equal(integrity.state, "mismatch");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("direct low-level writer mutation is detected before canonical health is restored", async () => {
  await withEnvironment(async (project, home) => {
    await initialize(project);
    await establish(project, home);

    await addConfirmedKnowledge("low-level writer bypass", project, { authorized: true });

    const integrity = await inspectProjectBrainIntegrity(project, { homeDir: home });
    assert.equal(integrity.state, "mismatch");
    const doctor = await runDoctor(project, { integrityStorage: { homeDir: home } });
    assert.equal(doctor.state, "drift-detected");
  });
});

test("concurrent Project Brain change cannot be committed as accepted integrity evidence", async () => {
  await withEnvironment(async (project, home) => {
    await initialize(project);
    const goalsPath = resolve(project, ".project-brain", "goals.md");
    await assert.rejects(
      recordAcceptedProjectBrainState(project, "manual-bootstrap", {
        homeDir: home,
        beforeCommit: async () => {
          await writeFile(goalsPath, `${await readFile(goalsPath, "utf8")}\n- concurrent agent goal\n`);
        },
      }),
      /changed while accepted integrity evidence was being committed/i,
    );
    const integrity = await inspectProjectBrainIntegrity(project, { homeDir: home });
    assert.equal(integrity.state, "missing");
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
