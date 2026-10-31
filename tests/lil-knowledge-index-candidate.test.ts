import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  assertKnowledgeIndexCandidateMatchesCurrent,
  assertProposedKnowledgeIndexBytes,
  planKnowledgeIndexCandidate,
} from "../src/intelligence/knowledge-index-candidate.js";
import { buildProjectKnowledgeProjection } from "../src/intelligence/knowledge-projection.js";
import { ProjectBrainStore, RESERVED_KNOWLEDGE_INDEX_FILE } from "../src/project-brain/store.js";
import { initializeProject } from "../src/runtime/initialization.js";
import { recordAcceptedDecision, supersedeAcceptedDecision } from "../src/runtime/canonical-change.js";
import { mutateAcceptedFixture } from "./accepted-project-brain-fixture.js";
import { makeLegacySchema1Project } from "./legacy-schema1-fixture.js";

async function fixture(run: (path: string) => Promise<void>) {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-index-candidate-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

test("metadata-only Knowledge Index is deterministic and preserves canonical markdown bytes", async () => {
  await fixture(async path => {
    const store = new ProjectBrainStore(path);
    await mutateAcceptedFixture(path, async () => {
      const original = await store.readKnowledgeDocument();
      await store.replaceKnowledgeDocument(original, original +
        "\n## Confirmed project knowledge\n\n- A confirmed illustrative source statement.\n");
    });
    const original = await store.readKnowledgeDocument();
    const projection = await buildProjectKnowledgeProjection(path);
    assert.equal(projection.state, "ready");
    if (projection.state !== "ready") return;
    const first = planKnowledgeIndexCandidate(projection);
    const again = planKnowledgeIndexCandidate(projection);
    assert.deepEqual(first, again);
    assert.equal(first.material.proposedProjectBrainSchemaVersion, 3);
    assert.equal(first.material.source.projectBrainSchemaVersion, 2);
    assert.equal(first.material.stableProjectIdentity, projection.stableProjectIdentity);
    assert.equal(first.material.source.baselineDigest, projection.baseline.digest);
    assert.match(first.candidateDigest, /^sha256:[a-f0-9]{64}$/);
    assert.equal(first.boundaries.grantsAuthority, false);
    assert.equal(first.boundaries.authorizedForMigration, false);
    assert.equal(first.boundaries.containsIndependentTruth, false);
    assert.equal(first.material.records.length, projection.records.length);
    assert.ok(first.material.records.every(x => x.scope.kind === "unspecified"
      && x.verification === "not-assessed"
      && x.provenance.kind === "canonical-project-brain"));
    assert.ok(!first.canonicalJson.includes("A confirmed illustrative source statement."));
    assert.ok(first.canonicalJson.endsWith("\n"));
    assert.deepEqual(JSON.parse(first.canonicalJson), first.material);
    assertProposedKnowledgeIndexBytes(first.canonicalJson, projection);
    assertKnowledgeIndexCandidateMatchesCurrent(first, projection);
    assert.equal(await store.readKnowledgeDocument(), original);
    assert.equal((await store.inspect()).health, "valid");
  });
});

test("index preserves structured decision IDs, revisions and supersession as references only", async () => {
  await fixture(async path => {
    let old!: Awaited<ReturnType<typeof recordAcceptedDecision>>;
    await mutateAcceptedFixture(path, async () => {
      old = await recordAcceptedDecision("Use 12px padding in navigation", path, { authorized: true });
    });
    const earlier = await buildProjectKnowledgeProjection(path);
    assert.equal(earlier.state, "ready");
    if (earlier.state !== "ready") return;
    const prior = planKnowledgeIndexCandidate(earlier);
    const oldRecord = prior.material.records.find(x => x.provenance.sourceRecordId === old.id);
    assert.ok(oldRecord);
    let replacement!: Awaited<ReturnType<typeof supersedeAcceptedDecision>>;
    await mutateAcceptedFixture(path, async () => {
      replacement = await supersedeAcceptedDecision({
        decisionId: old.id, replacement: "Use 16px padding in navigation",
      }, path, { authorized: true });
    });
    const newer = await buildProjectKnowledgeProjection(path);
    assert.equal(newer.state, "ready");
    if (newer.state !== "ready") return;
    const next = planKnowledgeIndexCandidate(newer);
    const historical = next.material.records.find(x => x.provenance.sourceRecordId === old.id);
    const active = next.material.records.find(x => x.provenance.sourceRecordId === replacement.replacement.id);
    assert.ok(historical && active);
    assert.equal(historical.recordId, oldRecord.recordId);
    assert.notEqual(historical.sourceRevisionDigest, oldRecord.sourceRevisionDigest);
    assert.equal(historical.lifecycle, "superseded");
    assert.ok(next.material.relationships.some(x =>
      x.fromRecordId === active.recordId && x.toRecordId === historical.recordId));
    assert.throws(() => assertKnowledgeIndexCandidateMatchesCurrent(prior, newer), /stale|cross-project/i);
  });
});

test("altered, reordered, duplicated or cross-project index candidates fail closed", async () => {
  await fixture(async a => {
    await fixture(async b => {
      const one = await buildProjectKnowledgeProjection(a);
      const two = await buildProjectKnowledgeProjection(b);
      assert.equal(one.state, "ready");
      assert.equal(two.state, "ready");
      if (one.state !== "ready" || two.state !== "ready") return;
      const candidate = planKnowledgeIndexCandidate(one);
      assert.throws(() => assertKnowledgeIndexCandidateMatchesCurrent(candidate, two), /cross-project/i);
      const tampered = structuredClone(candidate);
      tampered.material.records[0].domain = "unclassified";
      tampered.material.source.baselineDigest = "0".repeat(64);
      assert.throws(() => assertKnowledgeIndexCandidateMatchesCurrent(tampered, one), /stale|malformed/i);
      assert.throws(() => assertProposedKnowledgeIndexBytes(candidate.canonicalJson + " ", one), /differ/i);
      const json = JSON.parse(candidate.canonicalJson) as { records: unknown[] };
      json.records.push(json.records[0]);
      assert.throws(() => assertProposedKnowledgeIndexBytes(JSON.stringify(json) + "\n", one), /differ/i);
      const wrongSchema = candidate.canonicalJson.replace('"proposedProjectBrainSchemaVersion":3', '"proposedProjectBrainSchemaVersion":4');
      assert.throws(() => assertProposedKnowledgeIndexBytes(wrongSchema, one), /differ/i);
    });
  });
});

test("schema-2 Project Brain rejects an unprotected registry sidecar, even if its contents look valid", async () => {
  await fixture(async path => {
    const store = new ProjectBrainStore(path);
    const projection = await buildProjectKnowledgeProjection(path);
    assert.equal(projection.state, "ready");
    if (projection.state !== "ready") return;
    const candidate = planKnowledgeIndexCandidate(projection);
    const reserved = resolve(path, ".project-brain", RESERVED_KNOWLEDGE_INDEX_FILE);
    await writeFile(reserved, candidate.canonicalJson, { flag: "wx" });
    const state = await store.inspect();
    assert.equal(state.health, "unsupported-or-ambiguous");
    assert.match(state.reason ?? "", /authorized.*schema migration|reserved/i);
    const read = await buildProjectKnowledgeProjection(path);
    assert.equal(read.state, "blocked");
    await rm(reserved);
    assert.equal((await store.inspect()).health, "valid");
  });
});

test("case-folded and Windows-aliased reserved index filenames cannot bypass schema-2 protection", async () => {
  await fixture(async path => {
    const store = new ProjectBrainStore(path);
    const brain = resolve(path, ".project-brain");
    for (const name of ["KNOWLEDGE-REGISTRY.JSON", "knowledge-registry.json."]) {
      const injected = resolve(brain, name);
      await writeFile(injected, "{}", { flag: "wx" });
      const state = await store.inspect();
      assert.equal(state.health, "unsupported-or-ambiguous");
      assert.match(state.reason ?? "", /reserved.*index|authorized.*migration/i);
      await rm(injected);
    }
    assert.equal((await store.inspect()).health, "valid");
  });
});

test("unsupported future metadata cannot be treated as a valid Project Brain before schema-3 protections exist", async () => {
  await fixture(async path => {
    const store = new ProjectBrainStore(path);
    const metadataPath = resolve(path, ".project-brain", "metadata.json");
    const original = await readFile(metadataPath, "utf8");
    const metadata = JSON.parse(original) as { projectBrain: { schemaVersion: number } };
    metadata.projectBrain.schemaVersion = 3;
    await writeFile(metadataPath, JSON.stringify(metadata) + "\n");
    const state = await store.inspect();
    assert.notEqual(state.health, "valid");
    assert.match(state.reason ?? "", /metadata.*invalid|unsupported|schema/i);
    await writeFile(metadataPath, original);
    assert.equal((await store.inspect()).health, "valid");
    await makeLegacySchema1Project(path);
    assert.equal((await store.inspect()).health, "valid");
  });
});
