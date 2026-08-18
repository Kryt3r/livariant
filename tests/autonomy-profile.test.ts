import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  DEFAULT_AUTONOMY_PROFILE,
  FAIL_CLOSED_AUTONOMY_PROFILE,
  readAutonomyProfile,
  requiresConfirmation,
  writeAutonomyProfile,
} from "../src/autonomy/profile.js";
import { ProjectBrainStore } from "../src/project-brain/store.js";

async function withEnvironment(run: (project: string, home: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(resolve(tmpdir(), "livariant-autonomy-"));
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

async function initialize(project: string, projectId = randomUUID().toLowerCase()): Promise<string> {
  const store = new ProjectBrainStore(project);
  await store.bootstrap(
    {
      framework: { version: "0.1.0-rc.3", channel: "test" },
      projectBrain: { schemaVersion: 2, projectId },
    },
    { projectName: "autonomy-test", evidence: [], unknowns: [] },
  );
  return projectId;
}

async function locatorDigest(project: string): Promise<string> {
  return createHash("sha256").update(await realpath(project), "utf8").digest("hex");
}

function profilePath(home: string, locator: string, projectId: string): string {
  return resolve(home, ".livariant", "preferences", "autonomy", locator, projectId, "profile.json");
}

test("uninitialized projects use the balanced default without persistence", async () => {
  await withEnvironment(async (project, home) => {
    const state = await readAutonomyProfile(project, { homeDir: home });
    assert.equal(state.profile, DEFAULT_AUTONOMY_PROFILE);
    assert.equal(state.persisted, false);
    assert.equal(state.source, "default");
    assert.equal(state.stableProjectIdentity, null);
    assert.match(state.reason ?? "", /stable project identity/i);
  });
});

test("machine-local profile is bound to stable project identity and physical project location", async () => {
  await withEnvironment(async (project, home) => {
    const projectId = await initialize(project);
    const physicalDigest = await locatorDigest(project);
    const saved = await writeAutonomyProfile("ask-always", project, { homeDir: home });
    assert.equal(saved.schemaVersion, 2);
    assert.equal(saved.stableProjectIdentity, projectId);
    assert.equal(saved.projectLocatorDigest, physicalDigest);
    assert.equal(saved.profile, "ask-always");
    assert.equal(saved.persisted, true);

    const reread = await readAutonomyProfile(project, { homeDir: home });
    assert.equal(reread.profile, "ask-always");
    assert.equal(reread.source, "machine-local");
    assert.equal(reread.stableProjectIdentity, projectId);
    assert.equal(reread.projectLocatorDigest, physicalDigest);
  });
});

test("highest-autonomy persistence requires acknowledgement at the storage boundary", async () => {
  await withEnvironment(async (project, home) => {
    await initialize(project);
    await assert.rejects(
      writeAutonomyProfile("continue-without-confirmation", project, { homeDir: home }),
      /explicit risk acknowledgement/i,
    );
    const state = await readAutonomyProfile(project, { homeDir: home });
    assert.equal(state.profile, DEFAULT_AUTONOMY_PROFILE);
    assert.equal(state.persisted, false);
  });
});

test("copied profile state cannot raise autonomy in a different physical project", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "livariant-autonomy-copy-"));
  const projectA = resolve(root, "project-a");
  const projectB = resolve(root, "project-b");
  const home = resolve(root, "home");
  await mkdir(projectA);
  await mkdir(projectB);
  await mkdir(home);
  try {
    const projectAId = await initialize(projectA);
    const projectBId = await initialize(projectB);
    const locatorA = await locatorDigest(projectA);
    const locatorB = await locatorDigest(projectB);
    await writeAutonomyProfile("continue-without-confirmation", projectA, { homeDir: home, acknowledgeRisk: true });

    const source = profilePath(home, locatorA, projectAId);
    const targetRoot = resolve(home, ".livariant", "preferences", "autonomy", locatorB, projectBId);
    await mkdir(resolve(home, ".livariant", "preferences", "autonomy", locatorB));
    await mkdir(targetRoot);
    await writeFile(resolve(targetRoot, "profile.json"), await readFile(source, "utf8"));

    const state = await readAutonomyProfile(projectB, { homeDir: home });
    assert.equal(state.profile, FAIL_CLOSED_AUTONOMY_PROFILE);
    assert.equal(state.source, "fail-closed");
    assert.match(state.reason ?? "", /does not match/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("substituting another project's valid projectId cannot import its higher-autonomy profile", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "livariant-autonomy-substitution-"));
  const projectA = resolve(root, "project-a");
  const projectB = resolve(root, "project-b");
  const home = resolve(root, "home");
  await mkdir(projectA);
  await mkdir(projectB);
  await mkdir(home);
  try {
    const projectAId = await initialize(projectA);
    await initialize(projectB);
    await writeAutonomyProfile("continue-without-confirmation", projectA, { homeDir: home, acknowledgeRisk: true });

    const metadataPath = resolve(projectB, ".project-brain", "metadata.json");
    const metadata = JSON.parse(await readFile(metadataPath, "utf8")) as {
      framework: { version: string; channel: string };
      projectBrain: { schemaVersion: number; projectId: string };
    };
    metadata.projectBrain.projectId = projectAId;
    await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

    const state = await readAutonomyProfile(projectB, { homeDir: home });
    assert.notEqual(state.profile, "continue-without-confirmation");
    assert.equal(state.profile, DEFAULT_AUTONOMY_PROFILE);
    assert.equal(state.persisted, false);
    assert.equal(state.source, "default");
    assert.equal(state.stableProjectIdentity, projectAId);
    assert.notEqual(state.projectLocatorDigest, await locatorDigest(projectA));

    await writeAutonomyProfile("ask-important", projectB, { homeDir: home });
    const projectAState = await readAutonomyProfile(projectA, { homeDir: home });
    assert.equal(projectAState.profile, "continue-without-confirmation");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("malformed persisted profile fails closed to always ask", async () => {
  await withEnvironment(async (project, home) => {
    const projectId = await initialize(project);
    const locator = await locatorDigest(project);
    const projectRoot = resolve(home, ".livariant", "preferences", "autonomy", locator, projectId);
    await mkdir(resolve(home, ".livariant"));
    await mkdir(resolve(home, ".livariant", "preferences"));
    await mkdir(resolve(home, ".livariant", "preferences", "autonomy"));
    await mkdir(resolve(home, ".livariant", "preferences", "autonomy", locator));
    await mkdir(projectRoot);
    await writeFile(resolve(projectRoot, "profile.json"), "{not-json\n");

    const state = await readAutonomyProfile(project, { homeDir: home });
    assert.equal(state.profile, FAIL_CLOSED_AUTONOMY_PROFILE);
    assert.equal(state.source, "fail-closed");
  });
});

test("hard authority confirmation remains mandatory for every profile", () => {
  for (const profile of ["ask-always", "ask-important", "continue-without-confirmation"] as const) {
    assert.equal(requiresConfirmation(profile, "authority-required"), true);
  }
  assert.equal(requiresConfirmation("ask-always", "routine"), true);
  assert.equal(requiresConfirmation("ask-important", "routine"), false);
  assert.equal(requiresConfirmation("ask-important", "important"), true);
  assert.equal(requiresConfirmation("continue-without-confirmation", "routine"), false);
  assert.equal(requiresConfirmation("continue-without-confirmation", "important"), false);
});
