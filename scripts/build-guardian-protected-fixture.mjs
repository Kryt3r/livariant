import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildGuardianAuthorityRecord, guardianAuthorityMaterialDigest } from "../dist/src/guardian/authority-record.js";
import { buildGuardianRootDescriptor, productionGuardianRoot } from "../dist/src/guardian/trust-root.js";

const output = process.argv[2];
if (!output) throw new Error("Usage: node scripts/build-guardian-protected-fixture.mjs <output-directory>");
if (process.platform !== "linux" && process.platform !== "win32") throw new Error("Protected Guardian fixture supports Windows and Linux only.");

const productionRoot = productionGuardianRoot(process.platform);
if (!productionRoot) throw new Error("Guardian production root is unavailable on this platform.");

const helperBytes = await readFile(resolve("dist", "src", "guardian", "protected-helper.js"));
const descriptor = buildGuardianRootDescriptor(helperBytes, productionRoot, process.platform);
const materialFields = [
  { label: "fixture-purpose", value: "wp-027-protected-origin-positive-test" },
  { label: "fixture-platform", value: process.platform },
];
const materialSha256 = guardianAuthorityMaterialDigest("semantic-mutation", materialFields);
const issuedAt = new Date();
const authority = buildGuardianAuthorityRecord({
  consumer: "semantic-mutation",
  mode: "one-shot",
  materialSha256,
  issuedAt: issuedAt.toISOString(),
  expiresAt: new Date(issuedAt.getTime() + 5 * 60 * 1000).toISOString(),
  recordId: "44444444-4444-4444-8444-444444444444",
});

await mkdir(resolve(output, "records", "semantic-mutation"), { recursive: true });
await writeFile(resolve(output, "guardian-helper.js"), helperBytes);
await writeFile(resolve(output, "guardian-root.json"), `${JSON.stringify(descriptor, null, 2)}\n`, "utf8");
await writeFile(resolve(output, "records", "semantic-mutation", `${authority.recordId}.json`), `${JSON.stringify(authority, null, 2)}\n`, "utf8");
await writeFile(resolve(output, "fixture.json"), `${JSON.stringify({ materialFields, materialSha256, recordId: authority.recordId }, null, 2)}\n`, "utf8");

process.stdout.write(`${JSON.stringify({ stagingRoot: await realpath(output), productionRoot, materialSha256, recordId: authority.recordId })}\n`);
