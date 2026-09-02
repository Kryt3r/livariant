import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const workflowsDir = new URL("../.github/workflows/", import.meta.url);
const forbiddenTrigger = /^\s*-\s*ready_for_review\s*(?:#.*)?$/m;
const offenders = [];

for (const entry of await readdir(workflowsDir, { withFileTypes: true })) {
  if (!entry.isFile() || !/\.ya?ml$/i.test(entry.name)) continue;
  const path = join(workflowsDir.pathname, entry.name);
  const content = await readFile(path, "utf8");
  if (forbiddenTrigger.test(content)) offenders.push(entry.name);
}

if (offenders.length > 0) {
  console.error("CI policy violation: ready_for_review must not retrigger unchanged-head PR qualification.");
  console.error(`Remove the trigger from: ${offenders.sort().join(", ")}`);
  console.error("Changing this invariant requires explicit user-approved governance change (D-015). ");
  process.exit(1);
}

console.log("CI trigger policy OK: metadata-only Ready transitions do not trigger qualification workflows.");
