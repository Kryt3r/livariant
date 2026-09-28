import { readdir, readFile } from "node:fs/promises";

const workflowsDir = new URL("../.github/workflows/", import.meta.url);
const forbiddenTrigger = /^\s*-\s*ready_for_review\s*(?:#.*)?$/m;
const offenders = [];
const contents = new Map();

for (const entry of await readdir(workflowsDir, { withFileTypes: true })) {
  if (!entry.isFile() || !/\.ya?ml$/i.test(entry.name)) continue;
  const path = new URL(entry.name, workflowsDir);
  const content = await readFile(path, "utf8");
  contents.set(entry.name, content);
  if (forbiddenTrigger.test(content)) offenders.push(entry.name);
}

if (offenders.length > 0) {
  console.error("CI policy violation: ready_for_review must not retrigger unchanged-head PR qualification.");
  console.error(`Remove the trigger from: ${offenders.sort().join(", ")}`);
  console.error("Changing this invariant requires explicit user-approved governance change (D-015). ");
  process.exit(1);
}

const qualificationWorkflows = [
  "c02-protected-integrity.yml",
  "c03-protected-runtime-trust.yml",
  "c04-protected-release-authorization.yml",
  "ci-trigger-policy.yml",
  "ci.yml",
  "codeql.yml",
  "desktop-windows-foundation.yml",
  "desktop-windows-installer.yml",
  "rust-security-audit.yml",
  "s03-guardian-cross-consumer.yml",
];

function pullRequestBranches(name) {
  const workflow = contents.get(name);
  const pullRequest = workflow?.match(/^  pull_request:\r?\n([\s\S]*?)(?=^  [a-z_]+:|^permissions:|^concurrency:|^jobs:)/m)?.[1];
  return [...(pullRequest?.matchAll(/^      - (.+)$/gm) ?? [])].map((match) => match[1].trim());
}

const invalidQualification = qualificationWorkflows.filter((name) => {
  const branches = pullRequestBranches(name);
  return !branches.includes("develop") || !branches.includes("main");
});

if (invalidQualification.length > 0) {
  console.error("CI policy violation: qualification workflows must accept PRs targeting develop and main.");
  console.error(`Fix pull_request branches in: ${invalidQualification.join(", ")}`);
  process.exit(1);
}

for (const name of ["desktop-preview-update.yml", "publish-qualified-rc-assets.yml", "rc-bundle.yml"]) {
  if (/refs\/heads\/develop|^\s*-\s*develop\s*$/m.test(contents.get(name) ?? "")) {
    console.error(`CI policy violation: ${name} must not treat develop as publication authority.`);
    process.exit(1);
  }
}

for (const name of ["publish-qualified-rc-assets.yml", "rc-bundle.yml"]) {
  if (!(contents.get(name) ?? "").includes("github.ref == 'refs/heads/main'")) {
    console.error(`CI policy violation: ${name} must remain guarded by canonical main.`);
    process.exit(1);
  }
}

console.log("CI trigger policy OK: develop/main qualification and main-only publication boundaries are preserved.");
