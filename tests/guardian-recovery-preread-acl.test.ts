import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const bootstrapPath = fileURLToPath(new URL("../src/guardian/bootstrap.js", import.meta.url));

test("Windows historical Guardian recovery narrows leaf ACLs before privileged preread and validates before ordinary-user access", async () => {
  const builtBootstrap = await readFile(bootstrapPath, "utf8");

  const prereadStart = builtBootstrap.indexOf("function setWindowsRecoveryPrereadFileAcl");
  const prereadEnd = builtBootstrap.indexOf("function hardenWindowsDirectory", prereadStart);
  assert.notEqual(prereadStart, -1, "compiled recovery must expose the restricted preread ACL helper");
  assert.notEqual(prereadEnd, -1, "compiled recovery must keep preread ACL logic separate from fresh hardening");
  const prereadAcl = builtBootstrap.slice(prereadStart, prereadEnd);
  assert.match(prereadAcl, /WINDOWS_SYSTEM_SID/u);
  assert.match(prereadAcl, /WINDOWS_ADMINISTRATORS_SID/u);
  assert.match(prereadAcl, /"\/remove:g"/u, "historical ordinary Users grant must be removed before privileged preread");
  assert.match(prereadAcl, /WINDOWS_USERS_SID/u);
  assert.doesNotMatch(prereadAcl, /WINDOWS_USERS_SID\}:RX/u, "restricted preread must not grant ordinary Users read access");
  assert.doesNotMatch(prereadAcl, /setowner/u, "restricted preread must preserve existing protected ownership");

  const recoveryStart = builtBootstrap.indexOf("async function recoverProductionGuardianPreAuthority");
  const recoveryEnd = builtBootstrap.indexOf("async function bootstrapProductionGuardian", recoveryStart);
  assert.notEqual(recoveryStart, -1);
  assert.notEqual(recoveryEnd, -1);
  const recovery = builtBootstrap.slice(recoveryStart, recoveryEnd);

  const review = recovery.indexOf("requireInteractiveRecovery");
  const revalidate = recovery.indexOf("revalidateRecoverableWindowsGuardian");
  const descriptorPreread = recovery.indexOf("setWindowsRecoveryPrereadFileAcl(descriptor)");
  const helperPreread = recovery.indexOf("setWindowsRecoveryPrereadFileAcl(helper)");
  const materialValidation = recovery.indexOf("validateRecoverableWindowsGuardianMaterial");
  const finalDescriptorAcl = recovery.indexOf("setWindowsFileAcl(descriptor)");
  const finalHelperAcl = recovery.indexOf("setWindowsFileAcl(helper)");

  for (const [label, position] of [
    ["interactive review", review],
    ["pre-mutation revalidation", revalidate],
    ["descriptor preread ACL", descriptorPreread],
    ["helper preread ACL", helperPreread],
    ["material validation", materialValidation],
    ["final descriptor ACL", finalDescriptorAcl],
    ["final helper ACL", finalHelperAcl],
  ] as const) {
    assert.notEqual(position, -1, `recovery must contain ${label}`);
  }

  assert.ok(review < revalidate, "local interactive confirmation must precede recovery mutation");
  assert.ok(revalidate < descriptorPreread && revalidate < helperPreread, "protected state must be revalidated immediately before preread ACL mutation");
  assert.ok(descriptorPreread < materialValidation && helperPreread < materialValidation, "historical leaf readability must be repaired before normal Node reads");
  assert.ok(materialValidation < finalDescriptorAcl && materialValidation < finalHelperAcl, "ordinary-user read/execute must be granted only after exact material validation");
  assert.doesNotMatch(recovery, /setowner|takeown/u, "recovery must remain DACL-only and preserve ownership");
  assert.match(recovery, /authorityIssued:\s*false/u);
});

test("Guardian material validation still requires exact protected helper bytes, descriptor identity and zero Authority records", async () => {
  const builtBootstrap = await readFile(bootstrapPath, "utf8");
  assert.match(builtBootstrap, /protectedHelperBytes\.equals\(installedHelperBytes\)/u);
  assert.match(builtBootstrap, /strictRecoveryDescriptor\(descriptorValue, buildGuardianRootDescriptor/u);
  assert.match(builtBootstrap, /assertEmptyAuthorityRecords/u);
  assert.match(builtBootstrap, /Only an empty pre-Authority records directory is recoverable/u);
  assert.match(builtBootstrap, /Recovery aborted before ACL mutation/u);
});
