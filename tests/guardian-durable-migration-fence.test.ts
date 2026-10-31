import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile, rename, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildProjectContextBaseline } from "../src/runtime/project-context-material.js";
import { buildProjectBrainIntegrityGuardianRequest } from "../src/guardian/project-brain-integrity-authority.js";
import { assertGuardianRequestNotMigrationFenced, protectedGuardianMaterialDigest, createDeniedGuardianMigrationFence, inspectGuardianMigrationFenceStorage, parseDeniedMigrationFence, withExclusiveGuardianTransitionLock, type DeniedMigrationFence, GUARDIAN_TRANSITION_LOCK, MIGRATION_FENCE_MARKER, MIGRATION_FENCE_NAMESPACE } from "../src/guardian/protected-helper.js";

// These exercise the ACTUAL exported production core on real filesystem and
// child processes. Temp fixtures are NOT protected Guardian-installation proof.
async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), "livariant-real-fence-core-"));
  const records = resolve(root, "records");
  const project = resolve(root, "project");
  const brain = resolve(project, ".project-brain");
  await mkdir(records); await mkdir(brain, { recursive: true });
  await mkdir(resolve(records, "project-brain-integrity"));
  const projectId = randomUUID(); const sourceId = randomUUID();
  const inputs = new Map<string, Buffer>([
    ["project.md", Buffer.from("# Project\n")], ["goals.md", Buffer.from("# Goals\n")],
    ["decisions.md", Buffer.from("# Decisions\n")], ["knowledge.md", Buffer.from("# Knowledge\n")],
    ["metadata.json", Buffer.from(JSON.stringify({ framework: { version: "test", channel: "preview" }, projectBrain: { schemaVersion: 2, projectId } }, null, 2) + "\n")],
  ]);
  for (const [name, bytes] of inputs) await writeFile(resolve(brain, name), bytes);
  const hash = createHash("sha256");
  function frame(label: string, bytes: Buffer) { const labels = Buffer.from(label); const n = Buffer.alloc(8); n.writeUInt32BE(labels.length); n.writeUInt32BE(bytes.length, 4); hash.update(n).update(labels).update(bytes); }
  frame("domain", Buffer.from("livariant:project-brain-integrity-material:v1")); frame("schema-version", Buffer.from("2")); frame("stable-project-identity", Buffer.from(projectId));
  for (const name of ["project.md", "goals.md", "decisions.md", "knowledge.md"]) frame("managed:" + name, inputs.get(name)!);
  const source = buildProjectBrainIntegrityGuardianRequest({ stableProjectIdentity: projectId, physicalProjectRoot: project, physicalProjectBrainRoot: brain, integritySchemaVersion: 1, baseline: { algorithm: "sha256", domain: "livariant:project-brain-integrity-material:v1", digest: hash.digest("hex"), schemaVersion: 2 } });
  await writeFile(resolve(records, "project-brain-integrity", sourceId + ".json"), JSON.stringify({ schemaVersion: 1, kind: "livariant-guardian-authority", guardianVersion: 1, recordId: sourceId, consumer: "project-brain-integrity", mode: "persistent", state: "active", materialSha256: source.materialSha256, issuedAt: new Date().toISOString() }));
  const binding = parseDeniedMigrationFence({ schemaVersion: 1, kind: "livariant-guardian-schema-migration-fence", stableProjectIdentity: projectId, transactionId: randomUUID(), authorizationOperationId: randomUUID(), protectedSourceRecordId: sourceId, declaredPhysicalProjectRoot: project, declaredPhysicalProjectBrainRoot: brain, sourceSchemaVersion: 2, targetSchemaVersion: 3, sourceBaselineDomain: "livariant:project-context-baseline:v1", sourceBaselineSha256: buildProjectContextBaseline(inputs as never, 2).digest, sourceProtectedIntegrityMaterialSha256: source.materialSha256, proposedTargetDomain: "livariant:proposed-project-brain-v3-target:v1", proposedTargetSha256: "a".repeat(64), migrationIntentSha256: "b".repeat(64), phase: "recovery-required", sequence: 1 });
  return { root, records, project, brain, binding, inputs };
}
async function clean(root: string) { assert.ok(root.startsWith(resolve(tmpdir(), "livariant-real-fence-core-"))); await rm(root, { recursive: true, force: true }); }
const helperURL = pathToFileURL(fileURLToPath(new URL("../src/guardian/protected-helper.js", import.meta.url))).href;
async function childPaused(records: string, binding: DeniedMigrationFence, checkpoint: string): Promise<ChildProcess> {
  const code = `import { createDeniedGuardianMigrationFence } from ${JSON.stringify(helperURL)};
  await createDeniedGuardianMigrationFence(process.argv[1],JSON.parse(process.argv[2]),{ checkpoint: async name => {
    if(name===process.argv[3]) { process.send({checkpoint:name}); await new Promise(()=>setInterval(()=>{},1000)); }
  }});`;
  const child = spawn(process.execPath, ["--input-type=module", "--eval", code, records, JSON.stringify(binding), checkpoint], { stdio: ["ignore", "pipe", "pipe", "ipc"], windowsHide: true });
  let errors = ""; child.stderr?.on("data", data => { errors += String(data); });
  await new Promise<void>((resolveReady, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error("Child checkpoint timeout: " + errors)); }, 15000);
    child.once("message", () => { clearTimeout(timer); resolveReady(); });
    child.once("exit", code => { clearTimeout(timer); reject(new Error("Child exited before checkpoint " + code + ": " + errors)); });
  });
  return child;
}
async function killChild(child: ChildProcess) { const exited = once(child, "exit"); child.kill("SIGKILL"); await exited; }

test("production deny-fence core persists exact binding and leaves canonical bytes untouched", async () => {
  const f = await fixture();
  try {
    assert.deepEqual(await inspectGuardianMigrationFenceStorage(f.records), { activated: false, transactions: [] });
    await createDeniedGuardianMigrationFence(f.records, f.binding);
    assert.deepEqual(await inspectGuardianMigrationFenceStorage(f.records), { activated: true, transactions: [f.binding] });
    for (const [name, bytes] of f.inputs) assert.deepEqual(await readFile(resolve(f.brain, name)), bytes);
    assert.ok(!(await readdir(f.records)).includes(GUARDIAN_TRANSITION_LOCK));
    for (const phase of ["armed", "completed", "disarmed-before-consumption", "authority-consumed"]) assert.throws(() => parseDeniedMigrationFence({ ...f.binding, phase }), /disabled|deny-only/u);
  } finally { await clean(f.root); }
});

test("actual process lock excludes concurrent fence and legacy-transition core; kill leaves stale lock", async () => {
  const f = await fixture(); let child: ChildProcess | undefined;
  try {
    child = await childPaused(f.records, f.binding, "lock-acquired");
    await assert.rejects(createDeniedGuardianMigrationFence(f.records, { ...f.binding, transactionId: randomUUID() }), /active or interrupted/u);
    await assert.rejects(withExclusiveGuardianTransitionLock(f.records, async () => true), /active or interrupted/u);
    await assert.rejects(inspectGuardianMigrationFenceStorage(f.records), /active\/interrupted/u);
    await killChild(child); child = undefined;
    await assert.rejects(createDeniedGuardianMigrationFence(f.records, f.binding), /active or interrupted/u);
    await assert.rejects(inspectGuardianMigrationFenceStorage(f.records), /active\/interrupted/u);
  } finally { if (child) await killChild(child); await clean(f.root); }
});

for (const checkpoint of ["source-validated", "activation-synced", "anchor-synced", "journal-synced", "verified-before-unlock"]) {
  test("actual process kill at production checkpoint " + checkpoint + " cannot restart as legacy clear", async () => {
    const f = await fixture(); let child: ChildProcess | undefined;
    try {
      child = await childPaused(f.records, f.binding, checkpoint);
      await killChild(child); child = undefined;
      await assert.rejects(inspectGuardianMigrationFenceStorage(f.records), /active\/interrupted/u);
      await assert.rejects(createDeniedGuardianMigrationFence(f.records, f.binding), /active or interrupted/u);
      if (checkpoint !== "source-validated") {
        // Even if a privileged operator removes ONLY the stale lock (not an
        // exposed recovery operation), inventory gaps continue to fail closed.
        await rm(resolve(f.records, GUARDIAN_TRANSITION_LOCK), { recursive: true });
        if (checkpoint === "activation-synced" || checkpoint === "anchor-synced") await assert.rejects(inspectGuardianMigrationFenceStorage(f.records), /missing|disagree|lost/u);
        else assert.equal((await inspectGuardianMigrationFenceStorage(f.records)).activated, true);
      }
    } finally { if (child) await killChild(child); await clean(f.root); }
  });
}

for (const target of ["namespace", "marker", "anchor", "journal", "truncated-journal", "truncated-marker", "lost-transaction-pair"]) {
  test("production restart inspection blocks lost/tampered protected " + target, async () => {
    const f = await fixture();
    try {
      await createDeniedGuardianMigrationFence(f.records, f.binding);
      const dir = resolve(f.records, MIGRATION_FENCE_NAMESPACE);
      const journal = resolve(dir, f.binding.transactionId + ".jsonl");
      const anchor = resolve(f.records, ".schema-migration-v1." + f.binding.transactionId + ".anchor.json");
      if (target === "namespace") await rename(dir, resolve(f.root, "lost-namespace"));
      if (target === "marker") await rm(resolve(f.records, MIGRATION_FENCE_MARKER));
      if (target === "anchor") await rm(anchor);
      if (target === "journal") await writeFile(journal, "{}\n");
      if (target === "truncated-journal") await writeFile(journal, (await readFile(journal)).subarray(0, -3));
      if (target === "truncated-marker") await writeFile(resolve(f.records, MIGRATION_FENCE_MARKER), (await readFile(resolve(f.records, MIGRATION_FENCE_MARKER))).subarray(0, -3));
      if (target === "lost-transaction-pair") {
        const second = { ...f.binding, transactionId: randomUUID(), authorizationOperationId: randomUUID() };
        await createDeniedGuardianMigrationFence(f.records, second);
        await rm(resolve(f.records, ".schema-migration-v1." + second.transactionId + ".anchor.json"));
        await rm(resolve(dir, second.transactionId + ".jsonl"));
      }
      await assert.rejects(inspectGuardianMigrationFenceStorage(f.records));
    } finally { await clean(f.root); }
  });
}

test("wrong source project/physical identity and source mutation are denied by production writer", async () => {
  for (const mutation of ["project-id", "physical-project", "source-material", "source-baseline", "source-bytes"]) {
    const f = await fixture();
    try {
      let binding = f.binding;
      if (mutation === "project-id") binding = { ...binding, stableProjectIdentity: randomUUID() };
      if (mutation === "physical-project") {
        const copy = resolve(f.root, "other-project"); await mkdir(resolve(copy, ".project-brain"), { recursive: true });
        for (const [name, bytes] of f.inputs) await writeFile(resolve(copy, ".project-brain", name), bytes);
        binding = { ...binding, declaredPhysicalProjectRoot: copy, declaredPhysicalProjectBrainRoot: resolve(copy, ".project-brain") };
      }
      if (mutation === "source-material") binding = { ...binding, sourceProtectedIntegrityMaterialSha256: "c".repeat(64) };
      if (mutation === "source-baseline") binding = { ...binding, sourceBaselineSha256: "c".repeat(64) };
      if (mutation === "source-bytes") await writeFile(resolve(f.brain, "goals.md"), "changed");
      await assert.rejects(createDeniedGuardianMigrationFence(f.records, binding));
      assert.deepEqual(await inspectGuardianMigrationFenceStorage(f.records), { activated: false, transactions: [] });
    } finally { await clean(f.root); }
  }
});

test("proven live pre-write denial releases only its own lock; unknown or post-write error retains lock", async () => {
  for (const kind of ["prewrite", "unknown", "postwrite"]) {
    const f = await fixture();
    try {
      await assert.rejects(withExclusiveGuardianTransitionLock(f.records, async guard => {
        if (kind === "postwrite") guard.markMutationStarted();
        if (kind === "unknown") throw new Error("unexpected failure");
        guard.rejectBeforeMutation(new Error("expected rejection"));
      }));
      if (kind === "prewrite") {
        assert.deepEqual(await inspectGuardianMigrationFenceStorage(f.records), { activated: false, transactions: [] });
        await createDeniedGuardianMigrationFence(f.records, f.binding);
      } else await assert.rejects(inspectGuardianMigrationFenceStorage(f.records), /active\/interrupted/u);
    } finally { await clean(f.root); }
  }
});

test("actual junction/symlink path substitution is rejected", async () => {
  const f = await fixture();
  try {
    const alias = resolve(f.root, "alias");
    await symlink(f.project, alias, process.platform === "win32" ? "junction" : "dir");
    await assert.rejects(createDeniedGuardianMigrationFence(f.records, { ...f.binding, declaredPhysicalProjectRoot: alias, declaredPhysicalProjectBrainRoot: resolve(alias, ".project-brain") }), /alias|junction|symbolic/u);
  } finally { await clean(f.root); }
});

test("actual quarantine A denies exact A scope but preserves material-bound unrelated B", async () => {
  const f = await fixture();
  try {
    await createDeniedGuardianMigrationFence(f.records, f.binding);
    const request = (id: string, root: string) => ({ schemaVersion: 1 as const, kind: "livariant-guardian-authority-request" as const, consumer: "semantic-mutation" as const, mode: "one-shot" as const, materialFields: [{ label: "stable-project-identity", value: id }, { label: "physical-project-root", value: root }] });
    const a = request(f.binding.stableProjectIdentity, f.project);
    const bRoot = resolve(f.root, "project-b"); await mkdir(bRoot);
    const b = request(randomUUID(), bRoot);
    const aDigest = protectedGuardianMaterialDigest(a.consumer, a.materialFields);
    const bDigest = protectedGuardianMaterialDigest(b.consumer, b.materialFields);
    await assert.rejects(assertGuardianRequestNotMigrationFenced(f.records, a, aDigest), /quarantine/u);
    await assertGuardianRequestNotMigrationFenced(f.records, b, bDigest);
    await withExclusiveGuardianTransitionLock(f.records, async guard => {
      await assertGuardianRequestNotMigrationFenced(f.records, b, bDigest, true);
      guard.markMutationStarted();
    });
    await assert.rejects(assertGuardianRequestNotMigrationFenced(f.records, b, aDigest), /exact protected Authority material/u);
    await assert.rejects(assertGuardianRequestNotMigrationFenced(f.records, request(randomUUID(), f.project)), /quarantine/u);
    await assert.rejects(assertGuardianRequestNotMigrationFenced(f.records, request(f.binding.stableProjectIdentity, bRoot)), /quarantine/u);
    await assert.rejects(assertGuardianRequestNotMigrationFenced(f.records, { ...b, materialFields: [{ label: "arbitrary", value: "no project scope" }] }));
    assert.equal((await inspectGuardianMigrationFenceStorage(f.records)).activated, true);
  } finally { await clean(f.root); }
});

test("all five existing consumers retain their exact identity grammar under scoped quarantine", async () => {
  const f = await fixture();
  try {
    await createDeniedGuardianMigrationFence(f.records, f.binding);
    const bRoot = resolve(f.root, "project-b"); await mkdir(bRoot);
    const alias = resolve(f.root, "project-b-alias");
    await symlink(bRoot, alias, process.platform === "win32" ? "junction" : "dir");
    for (const consumer of ["semantic-mutation", "project-brain-integrity", "runtime-trust", "release-authorization", "lifecycle-mutation"] as const) {
      const identityRequired = consumer === "semantic-mutation" || consumer === "project-brain-integrity";
      const request = (root: string, id: string) => ({ schemaVersion: 1 as const, kind: "livariant-guardian-authority-request" as const, consumer, mode: consumer === "project-brain-integrity" || consumer === "runtime-trust" || consumer === "release-authorization" ? "persistent" as const : "one-shot" as const,
        materialFields: [...(identityRequired ? [{ label: "stable-project-identity", value: id }] : []), { label: "physical-project-root", value: root }] });
      const a = request(f.project, f.binding.stableProjectIdentity);
      const b = request(bRoot, randomUUID());
      await assert.rejects(assertGuardianRequestNotMigrationFenced(f.records, a, protectedGuardianMaterialDigest(consumer, a.materialFields)), /quarantine/u);
      await assertGuardianRequestNotMigrationFenced(f.records, b, protectedGuardianMaterialDigest(consumer, b.materialFields));
      const aliased = request(alias, randomUUID());
      await assert.rejects(assertGuardianRequestNotMigrationFenced(f.records, aliased, protectedGuardianMaterialDigest(consumer, aliased.materialFields)), /alias|junction|symbolic/u);
      if (identityRequired) await assert.rejects(assertGuardianRequestNotMigrationFenced(f.records, { ...b, materialFields: [{ label: "physical-project-root", value: bRoot }] }), /scope/u);
      else await assert.rejects(assertGuardianRequestNotMigrationFenced(f.records, { ...b, materialFields: [...b.materialFields, { label: "stable-project-identity", value: "invalid-id" }] }), /scope/u);
    }
  } finally { await clean(f.root); }
});

test("benign duplicate transaction does not poison unrelated project state", async () => {
  const f = await fixture();
  try {
    await createDeniedGuardianMigrationFence(f.records, f.binding);
    await assert.rejects(createDeniedGuardianMigrationFence(f.records, f.binding), /already exists/u);
    assert.ok(!(await readdir(f.records)).includes(GUARDIAN_TRANSITION_LOCK));
    assert.deepEqual((await inspectGuardianMigrationFenceStorage(f.records)).transactions, [f.binding]);
    await withExclusiveGuardianTransitionLock(f.records, async () => undefined);
  } finally { await clean(f.root); }
});
