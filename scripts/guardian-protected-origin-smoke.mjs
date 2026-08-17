import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  assertGuardianAuthoritySupport,
  findMatchingActiveGuardianAuthority,
} from "../dist/src/guardian/authority-client.js";

const fixturePath = process.argv[2];
if (!fixturePath) throw new Error("Usage: node scripts/guardian-protected-origin-smoke.mjs <fixture-json>");
const fixture = JSON.parse(await readFile(resolve(fixturePath), "utf8"));
if (typeof fixture !== "object" || fixture === null) throw new Error("Guardian fixture metadata is invalid.");

const support = await assertGuardianAuthoritySupport(process.cwd());
assert.equal(support.state, "ready");
assert.equal(support.authorityIssuanceSupported, true);
assert.equal(support.authorityConsumptionSupported, true);

const record = await findMatchingActiveGuardianAuthority({
  consumer: "semantic-mutation",
  mode: "one-shot",
  materialSha256: fixture.materialSha256,
  projectPath: process.cwd(),
});
assert.ok(record, "protected Guardian-origin fixture record must be discoverable");
assert.equal(record.recordId, fixture.recordId);
assert.equal(record.consumer, "semantic-mutation");
assert.equal(record.mode, "one-shot");
assert.equal(record.state, "active");

// Directly execute a command that enters assertProtectedSelf(). This proves
// the installed helper revalidates its own protected origin and the actually
// executing Node interpreter, rather than relying only on requester-side
// pre-elevation checks.
const helperInspection = spawnSync(process.execPath, [
  support.helper,
  "inspect-authority",
  "--consumer",
  "semantic-mutation",
  "--record",
  record.recordId,
], {
  encoding: "utf8",
  shell: false,
  windowsHide: true,
});
if (helperInspection.error || helperInspection.status !== 0) {
  const detail = helperInspection.error?.message || helperInspection.stderr || helperInspection.stdout || `exit ${String(helperInspection.status)}`;
  throw new Error(`Protected Guardian helper self/interpreter verification failed: ${String(detail).trim()}`);
}
const helperResult = JSON.parse(helperInspection.stdout);
assert.equal(helperResult.schemaVersion, 1);
assert.equal(helperResult.state, "inspected");
assert.equal(helperResult.authority.recordId, record.recordId);
assert.equal(helperResult.authority.materialSha256, record.materialSha256);

process.stdout.write(`${JSON.stringify({
  state: "ready",
  protectedOriginVerified: true,
  helperInterpreterRevalidated: true,
  recordId: record.recordId,
})}\n`);
