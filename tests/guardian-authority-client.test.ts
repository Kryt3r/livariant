import assert from "node:assert/strict";
import test from "node:test";
import {
  assertGuardianAuthoritySupport,
  buildGuardianAuthorityRequest,
} from "../src/guardian/authority-client.js";
import { protectedGuardianMaterialDigest } from "../src/guardian/protected-helper.js";

test("Guardian requester builds the exact helper-compatible authority request", () => {
  const materialFields = [
    { label: "project", value: "project-1" },
    { label: "proposal", value: "proposal-1" },
    { label: "baseline", value: "baseline-1" },
  ] as const;
  const built = buildGuardianAuthorityRequest({
    consumer: "semantic-mutation",
    mode: "one-shot",
    materialFields,
  });
  assert.deepEqual(built.request, {
    schemaVersion: 1,
    kind: "livariant-guardian-authority-request",
    consumer: "semantic-mutation",
    mode: "one-shot",
    materialFields,
  });
  assert.equal(built.materialSha256, protectedGuardianMaterialDigest("semantic-mutation", materialFields));
});

test("requester-side Guardian support never falls back when the production Guardian is unavailable", async () => {
  await assert.rejects(
    () => assertGuardianAuthoritySupport(process.cwd()),
    /Guardian|protected|unsupported|unavailable|not found|ENOENT/i,
  );
});
