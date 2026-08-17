import assert from "node:assert/strict";
import test from "node:test";

import { classifyPaths } from "./classify-ci-risk.mjs";

test("classifies low-risk community metadata as A", () => {
  assert.equal(classifyPaths(["CODE_OF_CONDUCT.md"]).class, "A");
  assert.equal(classifyPaths([".github/ISSUE_TEMPLATE/bug.yml"]).class, "A");
});

test("classifies README and documentation truth surfaces as B", () => {
  assert.equal(classifyPaths(["README.md"]).class, "B");
  assert.equal(classifyPaths(["docs/quickstart.md"]).class, "B");
});

test("classifies normal source and test changes as C", () => {
  assert.equal(classifyPaths(["src/cli/index.ts"]).class, "C");
  assert.equal(classifyPaths(["tests/semantic-editing.test.ts"]).class, "C");
});

test("classifies workflow, packaging, authority, external knowledge, first-run, autonomy, and findings trust paths as D", () => {
  assert.equal(classifyPaths([".github/workflows/ci.yml"]).class, "D");
  assert.equal(classifyPaths(["scripts/package-smoke.mjs"]).class, "D");
  assert.equal(classifyPaths(["src/distribution/release-authorization.ts"]).class, "D");
  assert.equal(classifyPaths(["tests/runtime/recovery.test.ts"]).class, "D");
  assert.equal(classifyPaths(["src/external-knowledge/local-directory-adapter.ts"]).class, "D");
  assert.equal(classifyPaths(["src/cli/first-run-command.ts"]).class, "D");
  assert.equal(classifyPaths(["tests/first-run-cli.test.ts"]).class, "D");
  assert.equal(classifyPaths(["src/autonomy/profile.ts"]).class, "D");
  assert.equal(classifyPaths(["src/cli/autonomy-command.ts"]).class, "D");
  assert.equal(classifyPaths(["tests/autonomy-profile.test.ts"]).class, "D");
  assert.equal(classifyPaths(["tests/autonomy-cli.test.ts"]).class, "D");
  assert.equal(classifyPaths(["src/findings/project-findings.ts"]).class, "D");
  assert.equal(classifyPaths(["src/cli/findings-command.ts"]).class, "D");
  assert.equal(classifyPaths(["tests/project-findings.test.ts"]).class, "D");
  assert.equal(classifyPaths(["tests/project-findings-cli.test.ts"]).class, "D");
});

test("uses the highest class across mixed changes", () => {
  assert.equal(classifyPaths(["README.md", "src/cli/index.ts"]).class, "C");
  assert.equal(classifyPaths(["docs/quickstart.md", ".github/workflows/ci.yml"]).class, "D");
  assert.equal(classifyPaths(["src/cli/understand-command.ts", "src/external-knowledge/types.ts"]).class, "D");
  assert.equal(classifyPaths(["README.md", "src/cli/first-run-command.ts"]).class, "D");
  assert.equal(classifyPaths(["README.md", "src/autonomy/profile.ts"]).class, "D");
  assert.equal(classifyPaths(["docs/project-findings.md", "src/findings/project-findings.ts"]).class, "D");
});

test("unknown and empty change sets fail safe to D", () => {
  assert.equal(classifyPaths(["new-surface/example.data"]).class, "D");
  assert.equal(classifyPaths([]).class, "D");
});
