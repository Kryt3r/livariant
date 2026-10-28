import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { initializeProject } from "../src/runtime/initialization.js";
import { ProjectBrainStore } from "../src/project-brain/store.js";
import {
  prepareProtectedKnowledgeSchemaTransition,
} from "../src/intelligence/protected-knowledge-schema-transition.js";
import { acceptFixtureProjectBrain } from "./accepted-project-brain-fixture.js";

async function fixture(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(resolve(tmpdir(), "livariant-protected-transition-"));
  try {
    await initializeProject(root, { authorized: true });
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("locally accepted but Guardian-unprotected source never exposes a migration plan", async () => {
  await fixture(async root => {
    await acceptFixtureProjectBrain(root);
    const before = await readFile(resolve(root, ".project-brain", "metadata.json"));
    const result = await prepareProtectedKnowledgeSchemaTransition(root, {
      beforeRevalidate: () => { throw new Error("Must not reach hook without Guardian evidence"); },
    });
    assert.equal(result.state, "blocked");
    assert.equal(result.plan, null);
    assert.equal(result.grantsAuthority, false);
    assert.equal(result.acceptsTargetSchema, false);
    assert.equal(result.writesPerformed, false);
    assert.equal(result.changesMade, 0);
    assert.deepEqual(await readFile(resolve(root, ".project-brain", "metadata.json")), before);
  });
});

test("a direct local Project Brain edit cannot make a guarded transition preflight ready", async () => {
  await fixture(async root => {
    const store = new ProjectBrainStore(root);
    const original = await store.readKnowledgeDocument();
    const tampered = original + "\n- Unauthorized rule inserted directly into Project Truth.\n";
    await writeFile(resolve(root, ".project-brain", "knowledge.md"), tampered);
    await acceptFixtureProjectBrain(root);
    const attempt = await prepareProtectedKnowledgeSchemaTransition(root);
    assert.equal(attempt.state, "blocked");
    assert.equal(attempt.plan, null);
    assert.equal(attempt.grantsAuthority, false);
    assert.equal(await store.readKnowledgeDocument(), tampered);
    assert.notEqual(await store.readKnowledgeDocument(), original);
  });
});

test("blocked schema-3 or unprotected registry sidecars cannot be accepted as a transition source", async () => {
  await fixture(async root => {
    const metaPath = resolve(root, ".project-brain", "metadata.json");
    const old = await readFile(metaPath, "utf8");
    const metadata = JSON.parse(old) as { projectBrain: { schemaVersion: number } };
    metadata.projectBrain.schemaVersion = 3;
    await writeFile(metaPath, JSON.stringify(metadata) + "\n");
    const unsupported = await prepareProtectedKnowledgeSchemaTransition(root);
    assert.equal(unsupported.state, "blocked");
    await writeFile(metaPath, old);
    await writeFile(resolve(root, ".project-brain", "knowledge-registry.json"), "{}");
    const unprotectedIndex = await prepareProtectedKnowledgeSchemaTransition(root);
    assert.equal(unprotectedIndex.state, "blocked");
    assert.equal(unprotectedIndex.plan, null);
    assert.equal(unprotectedIndex.acceptsTargetSchema, false);
  });
});
