import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { initializeProject } from "../src/runtime/initialization.js";
import { ProjectBrainStore } from "../src/project-brain/store.js";
import { ensureDesktopProjectBrainStorage } from "../src/project/desktop-project-brain-storage.js";

async function roots(label: string) {
  const base = await mkdtemp(join(tmpdir(), `livariant-desktop-brain-${label}-`));
  const checkout = resolve(base, "checkout");
  const state = resolve(base, "app-data-project");
  await import("node:fs/promises").then(({ mkdir }) => Promise.all([mkdir(checkout), mkdir(state)]));
  return { base, checkout, state };
}

test("Desktop Project Brain is created only in machine-local project state", async () => {
  const { base, checkout, state } = await roots("fresh");
  try {
    await writeFile(resolve(checkout, "package.json"), '{"name":"desktop-test"}\n', "utf8");
    await writeFile(resolve(checkout, ".gitignore"), "node_modules/\n", "utf8");
    const beforeIgnore = await readFile(resolve(checkout, ".gitignore"), "utf8");

    const result = await ensureDesktopProjectBrainStorage(checkout, state);
    assert.equal(result.state, "created");
    assert.equal((await new ProjectBrainStore(state).inspect()).health, "valid");
    assert.equal((await new ProjectBrainStore(checkout).inspect()).health, "not-found");
    assert.equal(await readFile(resolve(checkout, ".gitignore"), "utf8"), beforeIgnore);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("repository-local development Project Brain migrates once into machine-local state", async () => {
  const { base, checkout, state } = await roots("migration");
  try {
    await writeFile(resolve(checkout, "package.json"), '{"name":"legacy-test"}\n', "utf8");
    await initializeProject(checkout, { authorized: true });
    const metadata = await readFile(resolve(checkout, ".project-brain", "metadata.json"), "utf8");

    const result = await ensureDesktopProjectBrainStorage(checkout, state);
    assert.equal(result.state, "migrated");
    assert.equal((await new ProjectBrainStore(checkout).inspect()).health, "not-found");
    assert.equal((await new ProjectBrainStore(state).inspect()).health, "valid");
    assert.equal(await readFile(resolve(state, ".project-brain", "metadata.json"), "utf8"), metadata);

    const second = await ensureDesktopProjectBrainStorage(checkout, state);
    assert.equal(second.state, "ready");
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});


test("oversized repository-local Project Brain content fails closed before migration", async () => {
  const { base, checkout, state } = await roots("oversized");
  try {
    await writeFile(resolve(checkout, "package.json"), '{"name":"oversized-test"}\n', "utf8");
    await initializeProject(checkout, { authorized: true });
    await writeFile(
      resolve(checkout, ".project-brain", "ci-oversized.bin"),
      Buffer.alloc((2 * 1024 * 1024) + 1),
    );

    await assert.rejects(
      ensureDesktopProjectBrainStorage(checkout, state),
      /too large to migrate safely/i,
    );
    assert.equal((await new ProjectBrainStore(checkout).inspect()).health, "valid");
    assert.equal((await new ProjectBrainStore(state).inspect()).health, "not-found");
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("divergent repository-local and machine-local Project Brains fail closed without choosing either", async () => {
  const { base, checkout, state } = await roots("divergent");
  try {
    await writeFile(resolve(checkout, "package.json"), '{"name":"divergent-test"}\n', "utf8");
    await initializeProject(checkout, { authorized: true });
    await initializeProject(checkout, { authorized: true, storageRoot: state });

    const sourceMetadata = await readFile(resolve(checkout, ".project-brain", "metadata.json"), "utf8");
    const targetMetadata = await readFile(resolve(state, ".project-brain", "metadata.json"), "utf8");
    assert.notEqual(sourceMetadata, targetMetadata);

    await assert.rejects(
      ensureDesktopProjectBrainStorage(checkout, state),
      /different material.*refusing to choose or overwrite/i,
    );
    assert.equal((await new ProjectBrainStore(checkout).inspect()).health, "valid");
    assert.equal((await new ProjectBrainStore(state).inspect()).health, "valid");
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("damaged repository-local legacy Project Brain blocks creation of a machine-local replacement", async () => {
  const { base, checkout, state } = await roots("damaged-source");
  try {
    await writeFile(resolve(checkout, "package.json"), '{"name":"damaged-source-test"}\n', "utf8");
    await initializeProject(checkout, { authorized: true });
    await writeFile(resolve(checkout, ".project-brain", "metadata.json"), "{not-json\n", "utf8");

    await assert.rejects(
      ensureDesktopProjectBrainStorage(checkout, state),
      /repository-local legacy Project Brain is .*migration requires diagnosis/i,
    );
    assert.notEqual((await new ProjectBrainStore(checkout).inspect()).health, "valid");
    assert.equal((await new ProjectBrainStore(state).inspect()).health, "not-found");
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("damaged machine-local Project Brain blocks activation instead of falling back to repository state", async () => {
  const { base, checkout, state } = await roots("damaged-target");
  try {
    await writeFile(resolve(checkout, "package.json"), '{"name":"damaged-target-test"}\n', "utf8");
    await initializeProject(checkout, { authorized: true, storageRoot: state });
    await writeFile(resolve(state, ".project-brain", "metadata.json"), "{not-json\n", "utf8");

    await assert.rejects(
      ensureDesktopProjectBrainStorage(checkout, state),
      /machine-local Project Brain is .*recovery is required/i,
    );
    assert.notEqual((await new ProjectBrainStore(state).inspect()).health, "valid");
    assert.equal((await new ProjectBrainStore(checkout).inspect()).health, "not-found");
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});
