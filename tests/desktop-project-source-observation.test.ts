import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { observeDesktopProjectSources } from "../src/project/desktop-project-source-observation.js";

function git(cwd: string, ...args: string[]): void {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", shell: false, windowsHide: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function identity(repositoryId: string) {
  return {
    provider: "git" as const,
    repositoryId,
    displayName: repositoryId,
  };
}

test("observes configured local git sources without turning configuration into authority", async () => {
  const root = await mkdtemp(join(tmpdir(), "livariant-source-observation-"));
  const primary = join(root, "primary");
  const additional = join(root, "additional");
  await mkdir(primary);
  await mkdir(additional);

  for (const repository of [primary, additional]) {
    git(repository, "init");
    git(repository, "config", "user.email", "livariant-test@example.invalid");
    git(repository, "config", "user.name", "Livariant Test");
    await writeFile(join(repository, "README.md"), "fixture\n", "utf8");
    git(repository, "add", "README.md");
    git(repository, "commit", "-m", "fixture");
  }

  const inputPath = join(root, "project-source-review-input.json");
  await writeFile(inputPath, JSON.stringify({
    schemaVersion: 1,
    projectId: "fixture",
    primary: { identity: identity("primary"), localPath: primary },
    additional: [{ identity: identity("additional"), description: "Control-plane fixture.", localPath: additional }],
    observations: [],
    selectedReviewPaths: [],
    decisions: [],
  }), "utf8");

  const observations = await observeDesktopProjectSources(inputPath);
  assert.equal(observations.length, 2);
  assert.ok(observations.every((entry) => entry.reachability === "reachable"));
  assert.ok(observations.every((entry) => entry.revision && entry.revision.length >= 7));
  assert.ok(observations.every((entry) => entry.stale === false));
  assert.ok(observations.every((entry) => entry.observedAt.includes("T")));

  const persisted = JSON.parse(await readFile(inputPath, "utf8"));
  assert.equal(persisted.observations.length, 2);
  assert.equal(persisted.projectId, "fixture");
  assert.equal(persisted.additional[0].description, "Control-plane fixture.");
  assert.equal("authority" in persisted, false);
});

test("records a configured non-git local checkout as unreachable evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "livariant-source-unreachable-"));
  const primary = join(root, "not-a-repo");
  await mkdir(primary);
  const inputPath = join(root, "project-source-review-input.json");
  await writeFile(inputPath, JSON.stringify({
    schemaVersion: 1,
    projectId: "fixture",
    primary: { identity: identity("primary"), localPath: primary },
    additional: [],
    observations: [],
    selectedReviewPaths: [],
    decisions: [],
  }), "utf8");

  const [observation] = await observeDesktopProjectSources(inputPath);
  assert.equal(observation.reachability, "unreachable");
  assert.equal(observation.stale, false);
  assert.ok(observation.attention?.some((entry) => entry.includes("Git work tree")));
});

test("leaves additional sources without a local binding unknown by omitting observation", async () => {
  const root = await mkdtemp(join(tmpdir(), "livariant-source-unknown-"));
  const primary = join(root, "primary");
  await mkdir(primary);
  git(primary, "init");
  git(primary, "config", "user.email", "livariant-test@example.invalid");
  git(primary, "config", "user.name", "Livariant Test");
  await writeFile(join(primary, "README.md"), "fixture\n", "utf8");
  git(primary, "add", "README.md");
  git(primary, "commit", "-m", "fixture");

  const inputPath = join(root, "project-source-review-input.json");
  await writeFile(inputPath, JSON.stringify({
    schemaVersion: 1,
    projectId: "fixture",
    primary: { identity: identity("primary"), localPath: primary },
    additional: [{ identity: identity("remote-only"), description: "Remote-only fixture." }],
    observations: [],
    selectedReviewPaths: [],
    decisions: [],
  }), "utf8");

  const observations = await observeDesktopProjectSources(inputPath);
  assert.equal(observations.length, 1);
  assert.equal(observations[0].identity.repositoryId, "primary");
});
