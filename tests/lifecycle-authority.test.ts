import assert from "node:assert/strict";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildGuardianAuthorityRequest } from "../src/guardian/authority-client.js";
import { buildLifecycleGuardianAuthorityRequest } from "../src/guardian/lifecycle-authority.js";

const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
const legacyCliPath = fileURLToPath(new URL("../src/cli/legacy-main.js", import.meta.url));

function run(path: string, projectPath: string, args: string[]) {
  return spawnSync(process.execPath, [path, ...args], {
    cwd: projectPath,
    encoding: "utf8",
    shell: false,
    env: { ...process.env, PBF_RUNTIME_DELEGATION_BYPASS: "1" },
  });
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

test("public init --apply cannot manufacture lifecycle Authority", async () => {
  const projectPath = await mkdtemp(resolve(tmpdir(), "livariant-lifecycle-init-bare-"));
  try {
    const result = run(cliPath, projectPath, ["init", "--apply"]);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /Guardian|lifecycle Authority|--apply expresses intent/i);
    assert.equal(await exists(resolve(projectPath, ".project-brain")), false);
  } finally {
    await rm(projectPath, { recursive: true, force: true });
  }
});

test("direct legacy init entrypoint cannot bypass lifecycle Authority", async () => {
  const projectPath = await mkdtemp(resolve(tmpdir(), "livariant-lifecycle-init-legacy-"));
  try {
    const result = run(legacyCliPath, projectPath, ["init", "--apply"]);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /legacy init entrypoint is retired|canonical 'livariant init'/i);
    assert.equal(await exists(resolve(projectPath, ".project-brain")), false);
  } finally {
    await rm(projectPath, { recursive: true, force: true });
  }
});

test("lifecycle Guardian Authority is one-shot and consumer-domain separated", () => {
  const projectRoot = resolve(tmpdir(), "livariant-lifecycle-material-a");
  const fields = [
    { label: "source-version", value: "0.1.0-rc.3" },
    { label: "target-version", value: "0.1.0-rc.4" },
  ];
  const lifecycle = buildLifecycleGuardianAuthorityRequest({
    operation: "normal-update",
    physicalProjectRoot: projectRoot,
    materialFields: fields,
  });
  const foreign = buildGuardianAuthorityRequest({
    consumer: "release-authorization",
    mode: "one-shot",
    materialFields: [
      { label: "physical-project-root", value: lifecycle.physicalProjectRoot },
      { label: "lifecycle-operation", value: "normal-update" },
      ...fields,
    ],
  });

  assert.equal(lifecycle.request.consumer, "lifecycle-mutation");
  assert.equal(lifecycle.request.mode, "one-shot");
  assert.notEqual(lifecycle.materialSha256, foreign.materialSha256);
});

test("lifecycle Guardian material binds project, operation and exact material", () => {
  const rootA = resolve(tmpdir(), "livariant-lifecycle-material-a");
  const rootB = resolve(tmpdir(), "livariant-lifecycle-material-b");
  const baseFields = [{ label: "plan-sha256", value: "a".repeat(64) }];

  const normalA = buildLifecycleGuardianAuthorityRequest({
    operation: "normal-update",
    physicalProjectRoot: rootA,
    materialFields: baseFields,
  });
  const normalB = buildLifecycleGuardianAuthorityRequest({
    operation: "normal-update",
    physicalProjectRoot: rootB,
    materialFields: baseFields,
  });
  const recoveryA = buildLifecycleGuardianAuthorityRequest({
    operation: "recovery",
    physicalProjectRoot: rootA,
    materialFields: baseFields,
  });
  const changedA = buildLifecycleGuardianAuthorityRequest({
    operation: "normal-update",
    physicalProjectRoot: rootA,
    materialFields: [{ label: "plan-sha256", value: "b".repeat(64) }],
  });

  assert.notEqual(normalA.materialSha256, normalB.materialSha256);
  assert.notEqual(normalA.materialSha256, recoveryA.materialSha256);
  assert.notEqual(normalA.materialSha256, changedA.materialSha256);
});
