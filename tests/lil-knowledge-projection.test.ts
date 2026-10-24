import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { buildProjectKnowledgeProjection } from "../src/intelligence/knowledge-projection.js";
import { ProjectBrainStore } from "../src/project-brain/store.js";
import { initializeProject } from "../src/runtime/initialization.js";
import { recordAcceptedDecision, supersedeAcceptedDecision } from "../src/runtime/canonical-change.js";
import { mutateAcceptedFixture } from "./accepted-project-brain-fixture.js";

async function withProject(run: (path: string) => Promise<void>) {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-knowledge-projection-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

test("knowledge projection reads accepted facts, decisions, goals and unknowns without writing a rival truth store", async () => {
  await withProject(async path => {
    const store = new ProjectBrainStore(path);
    await mutateAcceptedFixture(path, async () => {
      const original = await store.readKnowledgeDocument();
      await store.replaceKnowledgeDocument(original, original.includes("## Confirmed project knowledge")
        ? original.replace("## Confirmed project knowledge", "## Confirmed project knowledge\n\n- All Settings Cards use a shared layout.")
        : original + "\n## Confirmed project knowledge\n\n- All Settings Cards use a shared layout.\n");
      await recordAcceptedDecision("All Settings Cards use a shared layout", path, { authorized: true });
    });

    const managed = ["project.md", "goals.md", "decisions.md", "knowledge.md", "metadata.json"];
    const before = await Promise.all(managed.map(async name => readFile(resolve(path, ".project-brain", name))));
    const first = await buildProjectKnowledgeProjection(path);
    const next = await buildProjectKnowledgeProjection(path);
    assert.equal(first.state, "ready");
    assert.equal(next.state, "ready");
    if (first.state !== "ready" || next.state !== "ready") return;

    assert.deepEqual(first, next);
    assert.equal(first.boundaries.grantsAuthority, false);
    assert.equal(first.boundaries.mutationSupported, false);
    assert.equal(first.boundaries.classificationVerified, false);
    assert.ok(first.records.some(x => x.recordType === "decision" && x.statement.includes("Settings Cards")));
    const fact = first.records.find(x => x.recordType === "fact" && x.statement.includes("Settings Cards"));
    assert.ok(fact);
    assert.equal(fact.domain, "unclassified");
    assert.equal(fact.scope, "unspecified");
    assert.equal(fact.verification, "not-assessed");
    assert.equal(fact.grantsAuthority, false);
    assert.ok(first.records.every(x => x.source.kind === "canonical-project-brain"));
    assert.ok(first.records.every(x => x.revisionDigest.startsWith("sha256:")));

    const after = await Promise.all(managed.map(async name => readFile(resolve(path, ".project-brain", name))));
    assert.deepEqual(after, before);
  });
});

test("knowledge decision projection preserves stable ids, supersession and explicit history", async () => {
  await withProject(async path => {
    let original!: Awaited<ReturnType<typeof recordAcceptedDecision>>;
    await mutateAcceptedFixture(path, async () => {
      original = await recordAcceptedDecision("Use Radius 8", path, { authorized: true });
    });
    const before = await buildProjectKnowledgeProjection(path);
    assert.equal(before.state, "ready");
    if (before.state !== "ready") return;
    const prior = before.records.find(x => x.source.sourceRecordId === original.id);
    assert.ok(prior);
    assert.equal(prior.lifecycle, "active");

    let replacement!: Awaited<ReturnType<typeof supersedeAcceptedDecision>>;
    await mutateAcceptedFixture(path, async () => {
      replacement = await supersedeAcceptedDecision({ decisionId: original.id, replacement: "Use Radius 12" }, path, { authorized: true });
    });

    const after = await buildProjectKnowledgeProjection(path);
    assert.equal(after.state, "ready");
    if (after.state !== "ready") return;
    const historical = after.records.find(x => x.source.sourceRecordId === original.id);
    const active = after.records.find(x => x.source.sourceRecordId === replacement.replacement.id);
    assert.ok(historical && active);
    assert.equal(historical.recordId, prior.recordId);
    assert.notEqual(historical.revisionDigest, prior.revisionDigest);
    assert.equal(historical.lifecycle, "superseded");
    assert.equal(historical.supersededBy, replacement.replacement.id);
    assert.equal(active.lifecycle, "active");
    assert.ok(after.relationships.some(x => x.type === "supersedes"
      && x.fromRecordId === active.recordId && x.toRecordId === historical.recordId));
  });
});

test("knowledge projection rejects unaccepted external Project Brain mutations", async () => {
  await withProject(async path => {
    const first = await buildProjectKnowledgeProjection(path);
    assert.equal(first.state, "ready");
    const source = resolve(path, ".project-brain", "knowledge.md");
    await writeFile(source, (await readFile(source, "utf8")) + "\n- Unapproved change.\n");
    const unsafe = await buildProjectKnowledgeProjection(path);
    assert.equal(unsafe.state, "blocked");
    assert.deepEqual(unsafe.records, []);
    assert.equal(unsafe.boundaries.grantsAuthority, false);
  });
});

test("knowledge projection rejects a changed source baseline during the read", async () => {
  await withProject(async path => {
    const result = await buildProjectKnowledgeProjection(path, {
      beforeRevalidate: async () => {
        await mutateAcceptedFixture(path, async () => {
          await recordAcceptedDecision("Use a consistent modal design", path, { authorized: true });
        });
      },
    });
    assert.equal(result.state, "blocked");
    assert.deepEqual(result.records, []);
    assert.match(result.reason, /stale|changed|integrity/i);
  });
});

test("knowledge projection does not classify generic source statements as global invariants", async () => {
  await withProject(async path => {
    await mutateAcceptedFixture(path, async () => {
      await recordAcceptedDecision("All Settings pages must share typography", path, { authorized: true });
    });
    const result = await buildProjectKnowledgeProjection(path);
    assert.equal(result.state, "ready");
    if (result.state !== "ready") return;
    const decision = result.records.find(x => x.statement === "All Settings pages must share typography");
    assert.ok(decision);
    assert.equal(decision.recordType, "decision");
    assert.equal(decision.domain, "unclassified");
    assert.equal(decision.scope, "unspecified");
    assert.equal(decision.verification, "not-assessed");
    assert.equal(decision.grantsAuthority, false);
    assert.ok(!result.records.some(x => (x.recordType as string) === "invariant"));
  });
});
