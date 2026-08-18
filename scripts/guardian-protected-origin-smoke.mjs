import assert from "node:assert/strict";
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

process.stdout.write(`${JSON.stringify({ state: "ready", protectedOriginVerified: true, recordId: record.recordId })}\n`);
