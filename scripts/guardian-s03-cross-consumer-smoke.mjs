import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { resolve } from "node:path";
import { buildGuardianAuthorityRecord } from "../dist/src/guardian/authority-record.js";
import { findMatchingActiveGuardianAuthority } from "../dist/src/guardian/authority-client.js";
import { issueGuardianAuthority } from "../dist/src/guardian/authority-transitions.js";
import { buildSemanticGuardianAuthorityRequest } from "../dist/src/guardian/semantic-authority.js";
import { buildProjectBrainIntegrityGuardianRequest } from "../dist/src/guardian/project-brain-integrity-authority.js";
import { buildRuntimeTrustGuardianRequest } from "../dist/src/guardian/runtime-trust-authority.js";
import { buildReleaseAuthorizationGuardianRequest } from "../dist/src/guardian/release-authorization-authority.js";

const CONSUMERS = [
  ["semantic-mutation", "one-shot"],
  ["project-brain-integrity", "persistent"],
  ["runtime-trust", "persistent"],
  ["release-authorization", "one-shot"],
];

const IDS = {
  "semantic-mutation": "11111111-1111-4111-8111-111111111111",
  "project-brain-integrity": "22222222-2222-4222-8222-222222222222",
  "runtime-trust": "33333333-3333-4333-8333-333333333333",
  "release-authorization": "44444444-4444-4444-8444-444444444444",
};
const DUPLICATE_ID = "55555555-5555-4555-8555-555555555555";
const MALFORMED_ID = "66666666-6666-4666-8666-666666666666";
const PROJECT_ID = "77777777-7777-4777-8777-777777777777";
const AUTHORIZATION_ID = "88888888-8888-4888-8888-888888888888";

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fail(command, result) {
  const detail = result.error?.message || result.stderr || result.stdout || `exit ${String(result.status)}`;
  throw new Error(`${command} failed: ${String(detail).trim()}`);
}

function consumerDirectory(consumer) {
  if (process.platform === "linux") return `/var/lib/livariant-guardian/v1/records/${consumer}`;
  if (process.platform === "win32") return `C:\\ProgramData\\Livariant\\Guardian\\v1\\records\\${consumer}`;
  throw new Error("Focused S-03 acceptance supports Linux and Windows only.");
}

function recordPath(consumer, recordId) {
  return resolve(consumerDirectory(consumer), `${recordId}.json`);
}

function installProtectedFile(source, destination) {
  if (process.platform === "linux") {
    const result = spawnSync("/usr/bin/sudo", ["install", "-o", "root", "-g", "root", "-m", "0444", source, destination], {
      encoding: "utf8",
      shell: false,
    });
    if (result.error || result.status !== 0) fail("install protected S-03 record", result);
    return;
  }
  const result = spawnSync("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    "$ErrorActionPreference='Stop'; Copy-Item -LiteralPath $env:LIVARIANT_SOURCE -Destination $env:LIVARIANT_DEST -Force; $acl=[System.IO.File]::GetAccessControl($env:LIVARIANT_DEST); $acl.SetOwner((New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-544'))); $acl.SetAccessRuleProtection($true,$false); $acl.Access | ForEach-Object { [void]$acl.RemoveAccessRule($_) }; $allow=[System.Security.AccessControl.AccessControlType]::Allow; $none=[System.Security.AccessControl.InheritanceFlags]::None; $prop=[System.Security.AccessControl.PropagationFlags]::None; $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule((New-Object System.Security.Principal.SecurityIdentifier('S-1-5-18')),'FullControl',$none,$prop,$allow))); $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule((New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-544')),'FullControl',$none,$prop,$allow))); $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule((New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-545')),'ReadAndExecute',$none,$prop,$allow))); [System.IO.File]::SetAccessControl($env:LIVARIANT_DEST,$acl)",
  ], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    env: { ...process.env, LIVARIANT_SOURCE: source, LIVARIANT_DEST: destination },
  });
  if (result.error || result.status !== 0) fail("install protected S-03 record on Windows", result);
}

function removeProtectedFile(destination) {
  if (process.platform === "linux") {
    const result = spawnSync("/usr/bin/sudo", ["rm", "-f", destination], { encoding: "utf8", shell: false });
    if (result.error || result.status !== 0) fail("remove protected S-03 record", result);
    return;
  }
  const result = spawnSync("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    "$ErrorActionPreference='Stop'; if (Test-Path -LiteralPath $env:LIVARIANT_DEST) { Remove-Item -LiteralPath $env:LIVARIANT_DEST -Force }",
  ], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    env: { ...process.env, LIVARIANT_DEST: destination },
  });
  if (result.error || result.status !== 0) fail("remove protected S-03 record on Windows", result);
}

async function stageRecord(staging, consumerDirectoryName, record, suffix = "") {
  const source = resolve(staging, `${consumerDirectoryName}-${record.recordId}${suffix}.json`);
  await writeFile(source, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  installProtectedFile(source, recordPath(consumerDirectoryName, record.recordId));
}

function activeRecord(consumer, mode, materialSha256, recordId) {
  const now = new Date();
  return buildGuardianAuthorityRecord({
    consumer,
    mode,
    materialSha256,
    recordId,
    ...(mode === "one-shot" ? { expiresAt: new Date(now.getTime() + 10 * 60_000).toISOString() } : {}),
  });
}

function proposal() {
  return {
    stableProjectIdentity: PROJECT_ID,
    actionableProposalId: "s03-actionable-proposal",
    materialDigest: { digest: digest("s03-proposal") },
    baseline: {
      schemaVersion: 2,
      domain: "livariant:project-brain-integrity-material:v1",
      algorithm: "sha256",
      digest: digest("s03-semantic-baseline"),
    },
    mutationScope: {
      domain: "project-goal",
      changeKind: "add",
      proposedStatement: "S-03 cross-consumer authority isolation",
      targetDecisionId: null,
    },
  };
}

function materials(projectRoot) {
  const projectBrainRoot = resolve(projectRoot, ".project-brain");
  const installRoot = resolve(projectRoot, ".framework-runtime", "releases", "9.9.9-s03");
  const packageRoot = resolve(installRoot, "node_modules", "livariant");
  const cliPath = resolve(packageRoot, "dist", "src", "cli", "index.js");
  return {
    "semantic-mutation": buildSemanticGuardianAuthorityRequest({
      authorizationId: AUTHORIZATION_ID,
      physicalProjectRoot: projectRoot,
      proposal: proposal(),
    }),
    "project-brain-integrity": buildProjectBrainIntegrityGuardianRequest({
      stableProjectIdentity: PROJECT_ID,
      physicalProjectRoot: projectRoot,
      physicalProjectBrainRoot: projectBrainRoot,
      integritySchemaVersion: 1,
      baseline: {
        algorithm: "sha256",
        domain: "livariant:project-brain-integrity-material:v1",
        digest: digest("s03-project-brain-baseline"),
        schemaVersion: 2,
      },
    }),
    "runtime-trust": buildRuntimeTrustGuardianRequest({
      runtimeTrustSchemaVersion: 1,
      packageName: "livariant",
      version: "9.9.9-s03",
      channel: "preview",
      sourceId: "s03-source",
      artifactId: "runtime-node-cli",
      artifactSha256: digest("s03-artifact"),
      packageTreeSha256: digest("s03-package-tree"),
      physicalProjectRoot: projectRoot,
      physicalInstallRoot: installRoot,
      physicalPackageRoot: packageRoot,
      physicalCliPath: cliPath,
    }),
    "release-authorization": buildReleaseAuthorizationGuardianRequest({
      releaseAuthorizationSchemaVersion: 1,
      packageName: "livariant",
      version: "9.9.9-s03",
      channel: "preview",
      sourceId: "s03-source",
      artifactId: "runtime-node-cli",
      artifactSha256: digest("s03-artifact"),
      physicalProjectRoot: projectRoot,
    }),
  };
}

async function assertNoProtectedMatch(definitions, projectPath) {
  for (const [consumer, mode] of CONSUMERS) {
    assert.equal(await findMatchingActiveGuardianAuthority({
      consumer,
      mode,
      materialSha256: definitions[consumer].materialSha256,
      projectPath,
    }), null);
  }
}

const projectA = await mkdtemp(resolve(tmpdir(), "livariant-s03-project-a-"));
const projectB = await mkdtemp(resolve(tmpdir(), "livariant-s03-project-b-"));
const staging = await mkdtemp(resolve(tmpdir(), "livariant-s03-records-"));
const legacyRoot = resolve(userInfo().homedir, ".livariant");
try {
  const physicalA = await realpath(projectA);
  const physicalB = await realpath(projectB);
  const materialA = materials(physicalA);
  const materialB = materials(physicalB);

  // Every consequential consumer must bind physical project location. A protected
  // record for Project A must therefore be unusable for the same logical/requester
  // material in Project B.
  for (const [consumer, mode] of CONSUMERS) {
    assert.notEqual(materialA[consumer].materialSha256, materialB[consumer].materialSha256, `${consumer} must bind physical project root`);
    const record = activeRecord(consumer, mode, materialA[consumer].materialSha256, IDS[consumer]);
    await stageRecord(staging, consumer, record);
    assert.equal((await findMatchingActiveGuardianAuthority({
      consumer,
      mode,
      materialSha256: materialA[consumer].materialSha256,
      projectPath: projectA,
    }))?.recordId, IDS[consumer]);
    assert.equal(await findMatchingActiveGuardianAuthority({
      consumer,
      mode,
      materialSha256: materialB[consumer].materialSha256,
      projectPath: projectB,
    }), null);
    removeProtectedFile(recordPath(consumer, IDS[consumer]));
  }

  // Consumer domains are cryptographically separated and namespace separated.
  const digests = CONSUMERS.map(([consumer]) => materialA[consumer].materialSha256);
  assert.equal(new Set(digests).size, CONSUMERS.length, "all four consumer material digests must be domain separated");
  for (let index = 0; index < CONSUMERS.length; index += 1) {
    const [targetConsumer, targetMode] = CONSUMERS[index];
    const [foreignConsumer, foreignMode] = CONSUMERS[(index + 1) % CONSUMERS.length];
    const foreign = activeRecord(foreignConsumer, foreignMode, materialA[foreignConsumer].materialSha256, IDS[foreignConsumer]);
    await stageRecord(staging, targetConsumer, foreign, `.under-${targetConsumer}`);
    await assert.rejects(
      () => findMatchingActiveGuardianAuthority({
        consumer: targetConsumer,
        mode: targetMode,
        materialSha256: materialA[targetConsumer].materialSha256,
        projectPath: projectA,
      }),
      /wrong consumer namespace/i,
    );
    removeProtectedFile(recordPath(targetConsumer, foreign.recordId));
  }

  // Duplicate exact records and malformed protected state fail closed for every
  // consumer, rather than allowing an arbitrary record to become Authority.
  for (const [consumer, mode] of CONSUMERS) {
    const exact = activeRecord(consumer, mode, materialA[consumer].materialSha256, IDS[consumer]);
    const duplicate = activeRecord(consumer, mode, materialA[consumer].materialSha256, DUPLICATE_ID);
    await stageRecord(staging, consumer, exact, ".exact");
    await stageRecord(staging, consumer, duplicate, ".duplicate");
    await assert.rejects(
      () => findMatchingActiveGuardianAuthority({
        consumer,
        mode,
        materialSha256: materialA[consumer].materialSha256,
        projectPath: projectA,
      }),
      /Multiple active Guardian Authority records|ambiguous Authority/i,
    );
    removeProtectedFile(recordPath(consumer, IDS[consumer]));
    removeProtectedFile(recordPath(consumer, DUPLICATE_ID));

    const malformedSource = resolve(staging, `${consumer}-malformed.json`);
    await writeFile(malformedSource, "{not-json\n", "utf8");
    installProtectedFile(malformedSource, recordPath(consumer, MALFORMED_ID));
    await assert.rejects(
      () => findMatchingActiveGuardianAuthority({
        consumer,
        mode,
        materialSha256: materialA[consumer].materialSha256,
        projectPath: projectA,
      }),
      /malformed JSON/i,
    );
    removeProtectedFile(recordPath(consumer, MALFORMED_ID));
  }

  // Same-user historical/forged evidence remains irrelevant when Guardian has no
  // protected matching record. These cover the historical trust families used by
  // the four migrated consumers; the common Guardian reader must still return null.
  const legacyFiles = [
    resolve(legacyRoot, "trust", "semantic-authorizations", PROJECT_ID, `${AUTHORIZATION_ID}.json`),
    resolve(legacyRoot, "integrity", "project-brain", "s03-forged.json"),
    resolve(legacyRoot, "trust", "runtimes", "s03-forged.json"),
    resolve(legacyRoot, "trust", "release-authorizations", `${digest("s03-artifact")}.json`),
  ];
  for (const path of legacyFiles) {
    await mkdir(resolve(path, ".."), { recursive: true });
    await writeFile(path, `${JSON.stringify({ schema: 1, forgedBy: "same-user-s03-acceptance" }, null, 2)}\n`, "utf8");
  }
  await assertNoProtectedMatch(materialA, projectA);

  // A requester-only/headless attempt must never manufacture consequential
  // protected Authority. On Linux CI this actively executes the production issue
  // path and must fail before a protected record exists. We do not open a Windows
  // UAC prompt in headless CI; the same privileged seam is already exercised by
  // platform hardening and no product bypass is introduced.
  if (process.platform === "linux") {
    const release = materialA["release-authorization"];
    await assert.rejects(
      () => issueGuardianAuthority({ request: release.request, projectPath: projectA }),
      /Guardian|interpreter|sudo|interactive|ordinary user|user presence/i,
    );
    assert.equal(await findMatchingActiveGuardianAuthority({
      consumer: "release-authorization",
      mode: "one-shot",
      materialSha256: release.materialSha256,
      projectPath: projectA,
    }), null);
  }

  console.log("Focused S-03 acceptance passed: all four consumers were physical-project bound and domain separated; cross-consumer namespace confusion, cross-project reuse, duplicate/malformed protected state, forged same-user evidence, and requester-only issuance failed closed.");
} finally {
  for (const [consumer] of CONSUMERS) {
    for (const id of [...Object.values(IDS), DUPLICATE_ID, MALFORMED_ID]) {
      removeProtectedFile(recordPath(consumer, id));
    }
  }
  await rm(projectA, { recursive: true, force: true });
  await rm(projectB, { recursive: true, force: true });
  await rm(staging, { recursive: true, force: true });
  await rm(resolve(legacyRoot, "trust", "semantic-authorizations", PROJECT_ID), { recursive: true, force: true });
  await rm(resolve(legacyRoot, "integrity", "project-brain", "s03-forged.json"), { force: true });
  await rm(resolve(legacyRoot, "trust", "runtimes", "s03-forged.json"), { force: true });
  await rm(resolve(legacyRoot, "trust", "release-authorizations", `${digest("s03-artifact")}.json`), { force: true });
}
