import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  initializeProject,
  inspectInitialization,
} from "../dist/src/runtime/index.js";
import { buildAdoptionSurfaceInventory } from "../dist/src/project/adoption-inventory.js";
import { reviewAdoptionSurfaces } from "../dist/src/project/adoption-review.js";
import {
  adoptionReviewedEvidenceId,
  adoptionReviewedEvidenceMaterialDigest,
  bindAdoptionReviewDecisions,
  buildAdoptionReviewProposal,
} from "../dist/src/project/adoption-review-decisions.js";
import { prepareAdoptionAuthorizationHandoff } from "../dist/src/project/adoption-authorization-handoff.js";
import { applyAuthorizedAdoptionHandoff } from "../dist/src/project/adoption-semantic-apply.js";
import { buildAdoptionDesktopPresentation } from "../dist/src/project/adoption-desktop-presentation.js";
import {
  buildGuardianAuthorityRecord,
  consumeGuardianAuthorityRecord,
} from "../dist/src/guardian/authority-record.js";
import { buildSemanticGuardianAuthorityRequest } from "../dist/src/guardian/semantic-authority.js";

const fixturePath = fileURLToPath(new URL("../tests/fixtures/existing-small", import.meta.url));
const AUTH_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const RECORD_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const ADOPTED_STATEMENT = "The existing project identifies itself as Existing Small App.";
const PROJECT_FILES = ["package.json", "tsconfig.json", "README.md", "src/index.ts", ".gitignore"];

function fail(command, result) {
  const detail = result.error?.message || result.stderr || result.stdout || `exit ${String(result.status)}`;
  throw new Error(`${command} failed: ${String(detail).trim()}`);
}

function installProtectedRecord(source, destination) {
  if (process.platform === "linux") {
    const result = spawnSync("/usr/bin/sudo", ["install", "-o", "root", "-g", "root", "-m", "0444", source, destination], {
      encoding: "utf8",
      shell: false,
    });
    if (result.error || result.status !== 0) fail("sudo install protected adoption Semantic Authority", result);
    return;
  }
  if (process.platform === "win32") {
    const result = spawnSync("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "$ErrorActionPreference='Stop'; Copy-Item -LiteralPath $env:LIVARIANT_TEST_RECORD_SOURCE -Destination $env:LIVARIANT_TEST_RECORD_DEST -Force; $acl=[System.IO.File]::GetAccessControl($env:LIVARIANT_TEST_RECORD_DEST); $acl.SetOwner((New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-544'))); $acl.SetAccessRuleProtection($true,$false); $acl.Access | ForEach-Object { [void]$acl.RemoveAccessRule($_) }; $inherit=[System.Security.AccessControl.InheritanceFlags]::None; $prop=[System.Security.AccessControl.PropagationFlags]::None; $allow=[System.Security.AccessControl.AccessControlType]::Allow; $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule((New-Object System.Security.Principal.SecurityIdentifier('S-1-5-18')),'FullControl',$inherit,$prop,$allow))); $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule((New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-544')),'FullControl',$inherit,$prop,$allow))); $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule((New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-545')),'ReadAndExecute',$inherit,$prop,$allow))); [System.IO.File]::SetAccessControl($env:LIVARIANT_TEST_RECORD_DEST,$acl)",
    ], {
      encoding: "utf8",
      shell: false,
      windowsHide: true,
      env: {
        ...process.env,
        LIVARIANT_TEST_RECORD_SOURCE: source,
        LIVARIANT_TEST_RECORD_DEST: destination,
      },
    });
    if (result.error || result.status !== 0) fail("install protected adoption Semantic Authority on Windows", result);
    return;
  }
  throw new Error("Existing-project adoption E2E supports Linux and Windows protected Guardian qualification only.");
}

function protectedRecordPath(recordId) {
  if (process.platform === "linux") return `/var/lib/livariant-guardian/v1/records/semantic-mutation/${recordId}.json`;
  if (process.platform === "win32") return `C:\\ProgramData\\Livariant\\Guardian\\v1\\records\\semantic-mutation\\${recordId}.json`;
  throw new Error("unsupported platform");
}

async function snapshotProjectFiles(projectPath, extras = []) {
  const snapshot = new Map();
  for (const relativePath of [...PROJECT_FILES, ...extras]) {
    snapshot.set(relativePath, await readFile(resolve(projectPath, relativePath)));
  }
  return snapshot;
}

async function assertProjectFilesUnchanged(projectPath, snapshot) {
  for (const [relativePath, expected] of snapshot) {
    assert.deepEqual(await readFile(resolve(projectPath, relativePath)), expected, `project-owned file changed: ${relativePath}`);
  }
}

async function projectId(path) {
  const metadata = JSON.parse(await readFile(resolve(path, ".project-brain", "metadata.json"), "utf8"));
  return metadata.projectBrain.projectId;
}

async function cleanupMachineAuthority(path) {
  let id;
  try { id = await projectId(path); } catch { return; }
  await rm(resolve(userInfo().homedir, ".livariant", "trust", "semantic-authorizations", id), { recursive: true, force: true });
}

function decisionFor(surface, decision) {
  return {
    evidenceId: adoptionReviewedEvidenceId(surface),
    materialDigest: adoptionReviewedEvidenceMaterialDigest(surface),
    decision,
  };
}

function authorizationConsumption(handoff) {
  const proposal = handoff.actionableProposal;
  const authorizedAt = new Date().toISOString();
  return {
    state: "authorized-for-separate-apply",
    adoptionProposalId: handoff.adoptionProposalId,
    sourceEvidence: { ...handoff.sourceEvidence },
    bindings: { ...handoff.bindings },
    authorization: {
      state: "authorized",
      authorization: {
        schemaVersion: 1,
        kind: "semantic-mutation-authorization-audit",
        state: "authorized",
        authorizationId: AUTH_ID,
        stableProjectIdentity: proposal.stableProjectIdentity,
        actionableProposalId: proposal.actionableProposalId,
        actionableProposalVersion: 1,
        proposalDigest: proposal.materialDigest.digest,
        mutationScope: { ...proposal.mutationScope },
        baseline: { ...proposal.baseline },
        authorizedAt,
      },
      machineEvidenceVerified: true,
      mutationAuthorization: false,
      applySupported: false,
      semanticChangesMade: 0,
      authorizationStateChangesMade: 1,
    },
    boundaries: {
      evidenceIsProjectTruth: false,
      adoptionHandoffIsAuthority: false,
      authorizationIsSemanticMutation: false,
      semanticApplyRequired: true,
      semanticChangesMade: 0,
    },
  };
}

async function stageConsumedCanonicalAuthority(projectPath, handoff, staging) {
  const proposal = handoff.actionableProposal;
  const authorizedAt = new Date().toISOString();
  const binding = {
    authorizationId: AUTH_ID,
    stableProjectIdentity: proposal.stableProjectIdentity,
    actionableProposalId: proposal.actionableProposalId,
    actionableProposalVersion: 1,
    proposalDigest: proposal.materialDigest.digest,
    mutationScope: proposal.mutationScope,
    baseline: proposal.baseline,
  };

  const projectAuthorizationRoot = resolve(projectPath, ".project-brain", ".authorizations");
  await mkdir(resolve(projectAuthorizationRoot, "history"), { recursive: true });
  await writeFile(resolve(projectAuthorizationRoot, "active.json"), `${JSON.stringify({
    ...binding,
    schemaVersion: 1,
    kind: "semantic-mutation-authorization-audit",
    state: "applying",
    authorizedAt,
  }, null, 2)}\n`, "utf8");

  const machineRoot = resolve(userInfo().homedir, ".livariant", "trust", "semantic-authorizations", proposal.stableProjectIdentity);
  await mkdir(machineRoot, { recursive: true });
  await writeFile(resolve(machineRoot, `${AUTH_ID}.json`), `${JSON.stringify({
    ...binding,
    schemaVersion: 1,
    kind: "semantic-mutation-authorization",
    state: "applying",
    authorizedAt,
  }, null, 2)}\n`, "utf8");

  const material = buildSemanticGuardianAuthorityRequest({
    authorizationId: AUTH_ID,
    physicalProjectRoot: await realpath(projectPath),
    proposal,
  });
  const now = Date.now();
  const active = buildGuardianAuthorityRecord({
    consumer: "semantic-mutation",
    mode: "one-shot",
    materialSha256: material.materialSha256,
    issuedAt: new Date(now - 60_000).toISOString(),
    expiresAt: new Date(now + 9 * 60_000).toISOString(),
    recordId: RECORD_ID,
  });
  const consumed = consumeGuardianAuthorityRecord(active, new Date(now).toISOString());
  const stagedRecord = resolve(staging, `${RECORD_ID}.json`);
  await writeFile(stagedRecord, `${JSON.stringify(consumed, null, 2)}\n`, "utf8");
  installProtectedRecord(stagedRecord, protectedRecordPath(RECORD_ID));
}

async function withExistingSmall(prefix, run) {
  const projectPath = await mkdtemp(resolve(tmpdir(), prefix));
  try {
    await cp(fixturePath, projectPath, { recursive: true });
    await mkdir(resolve(projectPath, ".git"));
    await run(projectPath);
  } finally {
    await cleanupMachineAuthority(projectPath);
    await rm(projectPath, { recursive: true, force: true });
  }
}

const staging = await mkdtemp(resolve(tmpdir(), "livariant-adoption-e2e-authority-"));
try {
  await withExistingSmall("livariant-adoption-e2e-normal-", async (projectPath) => {
    const beforeProjectFiles = await snapshotProjectFiles(projectPath);
    const initialization = await inspectInitialization(projectPath);
    assert.equal(initialization.projectState, "existing-project-without-brain");
    assert.deepEqual(initialization.projectFilesToModify, []);
    assert.equal(initialization.discovery.changesMade, 0);
    assert.ok(initialization.discovery.adoption);
    assert.equal(initialization.discovery.adoption.boundaries.evidenceIsProjectTruth, false);

    const inventory = buildAdoptionSurfaceInventory(projectPath);
    assert.ok(inventory.surfaces.some((surface) => surface.path === "README.md"));
    assert.ok(inventory.surfaces.some((surface) => surface.path === "package.json"));

    await initializeProject(projectPath, { authorized: true });
    await assertProjectFilesUnchanged(projectPath, beforeProjectFiles);

    const review = reviewAdoptionSurfaces(projectPath, inventory, ["README.md", "package.json"]);
    const readme = review.reviewed.find((surface) => surface.path === "README.md");
    const packageJson = review.reviewed.find((surface) => surface.path === "package.json");
    assert.ok(readme);
    assert.ok(packageJson);
    assert.match(readme.content, /Existing Small App/);
    assert.equal(review.boundaries.evidenceIsProjectTruth, false);
    assert.equal(review.boundaries.grantsAuthority, false);

    const decisions = bindAdoptionReviewDecisions(review, [
      decisionFor(readme, "accept-as-candidate"),
      decisionFor(packageJson, "reject"),
    ]);
    const proposal = buildAdoptionReviewProposal(review, decisions);
    assert.equal(proposal.status, "ready-for-authorization-review");
    assert.equal(proposal.candidates.length, 1);
    assert.deepEqual(proposal.rejectedEvidence, [adoptionReviewedEvidenceId(packageJson)]);

    const readyPresentation = buildAdoptionDesktopPresentation(review, decisions);
    assert.equal(readyPresentation.state, "ready-for-authorization-review");
    assert.equal(readyPresentation.authorizationState, "not-authorized");
    assert.equal(readyPresentation.boundaries.uiDecisionGrantsAuthority, false);

    const candidate = proposal.candidates[0];
    const request = {
      adoptionProposalId: proposal.proposalId,
      evidenceId: candidate.evidenceId,
      materialDigest: candidate.materialDigest,
      projection: {
        domain: "project-knowledge",
        proposedStatement: ADOPTED_STATEMENT,
        rationale: "WP-053 normal existing-project end-to-end qualification from explicitly accepted README evidence.",
      },
    };
    const handoff = await prepareAdoptionAuthorizationHandoff(review, decisions, request, projectPath);
    assert.equal(handoff.state, "ready-for-explicit-authorization");
    if (handoff.state !== "ready-for-explicit-authorization") throw new Error("expected ready adoption handoff");
    assert.equal(handoff.boundaries.mutationAuthorization, false);

    const authorization = authorizationConsumption(handoff);
    const authorizedPresentation = buildAdoptionDesktopPresentation(review, decisions, authorization);
    assert.equal(authorizedPresentation.state, "authorized-for-separate-apply");
    assert.equal(authorizedPresentation.applyState, "not-applied");

    // CI cannot create the interactive same-user authorization audit through the
    // production prompt. Seed the exact canonical audit/recovery binding plus a
    // protected already-consumed Guardian one-shot to exercise the production
    // recovery/apply path without creating any test-only product Authority path.
    await stageConsumedCanonicalAuthority(projectPath, handoff, staging);

    const applied = await applyAuthorizedAdoptionHandoff(review, decisions, request, handoff, authorization, projectPath);
    assert.equal(applied.state, "completed");
    assert.equal(applied.semanticApply.state, "completed");
    assert.equal(applied.semanticApply.semanticChangesMade, 1);
    assert.equal(applied.semanticApply.mutationAuthorizationConsumed, true);
    assert.equal(applied.boundaries.projectOwnedRepositoryFilesChanged, false);
    assert.equal(applied.boundaries.canonicalSemanticApplyUsed, true);

    const completedPresentation = buildAdoptionDesktopPresentation(review, decisions, authorization, applied);
    assert.equal(completedPresentation.state, "completed");
    assert.equal(completedPresentation.applyState, "completed");
    assert.match(await readFile(resolve(projectPath, ".project-brain", "knowledge.md"), "utf8"), new RegExp(ADOPTED_STATEMENT));
    await assertProjectFilesUnchanged(projectPath, beforeProjectFiles);

    await assert.rejects(
      applyAuthorizedAdoptionHandoff(review, decisions, request, handoff, authorization, projectPath),
      /No active|no longer matches|cannot reproduce|not safely recoverable|replay|current handoff|baseline/i,
    );
    await assertProjectFilesUnchanged(projectPath, beforeProjectFiles);
  });

  await withExistingSmall("livariant-adoption-e2e-conflict-", async (projectPath) => {
    await mkdir(resolve(projectPath, "packages", "api"), { recursive: true });
    await writeFile(resolve(projectPath, "AGENTS.md"), "Use the root convention.\n", "utf8");
    await writeFile(resolve(projectPath, "packages", "api", "AGENTS.md"), "Use the API-local convention.\n", "utf8");
    const beforeProjectFiles = await snapshotProjectFiles(projectPath, ["AGENTS.md", "packages/api/AGENTS.md"]);

    const inventory = buildAdoptionSurfaceInventory(projectPath);
    const review = reviewAdoptionSurfaces(projectPath, inventory, ["AGENTS.md", "packages/api/AGENTS.md"]);
    const rootGuidance = review.reviewed.find((surface) => surface.path === "AGENTS.md");
    const nestedGuidance = review.reviewed.find((surface) => surface.path === "packages/api/AGENTS.md");
    assert.ok(rootGuidance);
    assert.ok(nestedGuidance);
    assert.ok(review.attention.some((item) => item.code === "adoption-review-overlapping-guidance"));

    const decisions = bindAdoptionReviewDecisions(review, [
      decisionFor(rootGuidance, "accept-as-candidate"),
      decisionFor(nestedGuidance, "accept-as-candidate"),
    ]);
    const proposal = buildAdoptionReviewProposal(review, decisions);
    assert.equal(proposal.status, "blocked");
    assert.ok(proposal.blockers.some((item) => item.code === "adoption-proposal-unresolved-guidance-overlap"));

    const presentation = buildAdoptionDesktopPresentation(review, decisions);
    assert.equal(presentation.state, "blocked");
    assert.ok(presentation.attention.some((item) => item.code === "adoption-review-overlapping-guidance"));
    assert.equal(presentation.boundaries.hiddenConflictResolution, false);
    await assertProjectFilesUnchanged(projectPath, beforeProjectFiles);
  });

  console.log("WP-053 existing-project adoption E2E acceptance passed: normal evidence -> decision -> proposal -> authorization-bound canonical Semantic Apply completed with protected Guardian recovery; project-owned files stayed unchanged; replay was refused; overlapping guidance remained visibly blocked.");
} finally {
  await rm(staging, { recursive: true, force: true });
}
