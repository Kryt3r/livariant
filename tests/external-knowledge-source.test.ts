import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { inspectExternalKnowledgeSource } from "../src/external-knowledge/index.js";
import { buildUnderstandingReview } from "../src/project/understanding-review.js";
import { selectUnderstandingCandidateForAdoption } from "../src/project/understanding-adoption.js";
import type { BootstrapDiscoveryReport } from "../src/project/bootstrap-discovery.js";

async function withTempDirectory(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "livariant-external-knowledge-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function discovery(root: string): BootstrapDiscoveryReport {
  return {
    projectRoot: root,
    projectShape: "existing",
    evidence: [],
    attention: [],
    unknowns: ["project purpose"],
    changesMade: 0,
  };
}

test("local-directory adapter returns deterministic read-only provenance-bound external evidence", async () => {
  await withTempDirectory(async (temp) => {
    const source = join(temp, "brain");
    await mkdir(join(source, "notes"), { recursive: true });
    await writeFile(join(source, "z.txt"), "Zeta knowledge\n", "utf8");
    await writeFile(join(source, "notes", "a.md"), "# Alpha\nProject purpose notes.\n", "utf8");
    await writeFile(join(source, "ignore.json"), "{\"ignored\":true}\n", "utf8");

    const beforeAlpha = await readFile(join(source, "notes", "a.md"));
    const first = await inspectExternalKnowledgeSource("local-directory", source);
    const second = await inspectExternalKnowledgeSource("local-directory", source);
    const afterAlpha = await readFile(join(source, "notes", "a.md"));

    assert.equal(first.source.kind, "local-directory");
    assert.equal(first.source.readOnly, true);
    assert.equal(first.source.trust, "external-evidence");
    assert.equal(first.source.grantsAuthority, false);
    assert.match(first.source.sourceId, /^external-source-v1:[a-f0-9]{64}$/u);
    assert.equal(first.source.sourceId, second.source.sourceId);
    assert.deepEqual(first.evidence.map((item) => item.provenance.materialPath), ["notes/a.md", "z.txt"]);
    assert.deepEqual(first.evidence.map((item) => item.evidenceId), second.evidence.map((item) => item.evidenceId));
    assert.equal(first.evidence.every((item) => item.trust === "external-evidence"), true);
    assert.equal(first.evidence.every((item) => item.provenance.sourceId === first.source.sourceId), true);
    assert.deepEqual(first.skipped, [{ materialPath: "ignore.json", reason: "unsupported-type" }]);
    assert.deepEqual(first.boundaries, {
      evidenceIsProjectTruth: false,
      grantsAuthority: false,
      sourceMutated: false,
      projectMutated: false,
      changesMade: 0,
    });
    assert.deepEqual(afterAlpha, beforeAlpha);
  });
});

test("local-directory adapter rejects a symlinked source root", async () => {
  await withTempDirectory(async (temp) => {
    const target = join(temp, "target");
    const link = join(temp, "link");
    await mkdir(target);
    await symlink(target, link, process.platform === "win32" ? "junction" : "dir");
    await assert.rejects(() => inspectExternalKnowledgeSource("local-directory", link), /regular non-symlink directory/);
  });
});

test("local-directory adapter does not traverse nested symlinks outside the source", async () => {
  await withTempDirectory(async (temp) => {
    const source = join(temp, "brain");
    const outside = join(temp, "outside");
    await mkdir(source);
    await mkdir(outside);
    await writeFile(join(outside, "secret.md"), "must not be read", "utf8");
    await symlink(outside, join(source, "escape"), process.platform === "win32" ? "junction" : "dir");

    const bundle = await inspectExternalKnowledgeSource("local-directory", source);
    assert.equal(bundle.evidence.length, 0);
    assert.deepEqual(bundle.skipped, [{ materialPath: "escape", reason: "symlink" }]);
  });
});

test("local-directory adapter bounds oversized, binary, and invalid UTF-8 material", async () => {
  await withTempDirectory(async (temp) => {
    const source = join(temp, "brain");
    await mkdir(source);
    await writeFile(join(source, "too-large.md"), "x".repeat(64 * 1024 + 1), "utf8");
    await writeFile(join(source, "binary.txt"), Buffer.from([0x61, 0x00, 0x62]));
    await writeFile(join(source, "invalid-utf8.md"), Buffer.from([0xc3, 0x28]));

    const bundle = await inspectExternalKnowledgeSource("local-directory", source);
    assert.equal(bundle.evidence.length, 0);
    assert.deepEqual(bundle.skipped, [
      { materialPath: "binary.txt", reason: "binary" },
      { materialPath: "invalid-utf8.md", reason: "binary" },
      { materialPath: "too-large.md", reason: "oversized" },
    ]);
  });
});

test("local-directory traversal fails closed before an unbounded directory scan", async () => {
  await withTempDirectory(async (temp) => {
    const source = join(temp, "brain");
    await mkdir(source);
    await Promise.all(Array.from({ length: 1001 }, (_, index) => writeFile(join(source, `entry-${String(index).padStart(4, "0")}.bin`), "")));
    await assert.rejects(() => inspectExternalKnowledgeSource("local-directory", source), /maximum scan entries of 1000/);
  });
});

test("external evidence stays separate from candidate evidence and cannot be selected for adoption", async () => {
  await withTempDirectory(async (temp) => {
    const source = join(temp, "brain");
    await mkdir(source);
    await writeFile(join(source, "purpose.md"), "This project should protect external truth boundaries.", "utf8");
    const bundle = await inspectExternalKnowledgeSource("local-directory", source);
    const review = buildUnderstandingReview(discovery(temp), undefined, [bundle]);

    assert.equal(review.externalEvidence?.length, 1);
    assert.equal(review.candidateEvidence.length, 0);
    assert.equal(review.boundaries.externalEvidenceIsProjectTruth, false);
    assert.equal(review.boundaries.externalEvidenceCanBeAdoptedDirectly, false);
    assert.throws(
      () => selectUnderstandingCandidateForAdoption(review, bundle.evidence[0]!.evidenceId),
      /exactly one current material-consistent candidate/,
    );
  });
});

test("evidence identity changes when external material changes while source identity stays stable", async () => {
  await withTempDirectory(async (temp) => {
    const source = join(temp, "brain");
    const file = join(source, "purpose.md");
    await mkdir(source);
    await writeFile(file, "first", "utf8");
    const before = await inspectExternalKnowledgeSource("local-directory", source);
    await writeFile(file, "second", "utf8");
    const after = await inspectExternalKnowledgeSource("local-directory", source);

    assert.equal(before.source.sourceId, after.source.sourceId);
    assert.notEqual(before.evidence[0]?.provenance.contentSha256, after.evidence[0]?.provenance.contentSha256);
    assert.notEqual(before.evidence[0]?.evidenceId, after.evidence[0]?.evidenceId);
  });
});
