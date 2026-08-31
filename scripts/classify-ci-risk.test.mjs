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

test("classifies normal source, tests, and ordinary Desktop implementation as C", () => {
  assert.equal(classifyPaths(["src/cli/understand-command.ts"]).class, "C");
  assert.equal(classifyPaths(["tests/semantic-editing.test.ts"]).class, "C");
  assert.equal(classifyPaths(["apps/desktop/src/main.ts"]).class, "C");
  assert.equal(classifyPaths(["apps/desktop/src/styles.css"]).class, "C");
  assert.equal(classifyPaths(["apps/desktop/src-tauri/src/lib.rs"]).class, "C");
});

test("detects renderer-only Desktop changes without weakening their C risk class", () => {
  const rendererOnly = classifyPaths([
    "apps/desktop/src/main.ts",
    "apps/desktop/src/styles.css",
    "docs/desktop-notes.md",
  ]);
  assert.equal(rendererOnly.class, "C");
  assert.equal(rendererOnly.desktopRendererOnly, true);

  assert.equal(
    classifyPaths(["apps/desktop/src/main.ts", "apps/desktop/src-tauri/src/lib.rs"]).desktopRendererOnly,
    false,
  );
  assert.equal(
    classifyPaths(["apps/desktop/src/main.ts", "apps/desktop/package.json"]).desktopRendererOnly,
    false,
  );
  assert.equal(classifyPaths(["README.md"]).desktopRendererOnly, false);
});

test("keeps Desktop packaging, installer, capability, and distribution surfaces in D", () => {
  assert.equal(classifyPaths(["apps/desktop/package.json"]).class, "D");
  assert.equal(classifyPaths(["apps/desktop/package-lock.json"]).class, "D");
  assert.equal(classifyPaths(["apps/desktop/src-tauri/Cargo.toml"]).class, "D");
  assert.equal(classifyPaths(["apps/desktop/src-tauri/Cargo.lock"]).class, "D");
  assert.equal(classifyPaths(["apps/desktop/src-tauri/tauri.conf.json"]).class, "D");
  assert.equal(classifyPaths(["apps/desktop/src-tauri/tauri.runtime.conf.json"]).class, "D");
  assert.equal(classifyPaths(["apps/desktop/src-tauri/windows/generate-installer-branding.ps1"]).class, "D");
  assert.equal(classifyPaths(["apps/desktop/src-tauri/capabilities/default.json"]).class, "D");
});

test("classifies workflow, packaging, authority, Guardian, external knowledge, first-run, autonomy, findings, and mutation-router trust paths as D", () => {
  assert.equal(classifyPaths([".github/workflows/ci.yml"]).class, "D");
  assert.equal(classifyPaths(["scripts/package-smoke.mjs"]).class, "D");
  assert.equal(classifyPaths(["src/distribution/release-authorization.ts"]).class, "D");
  assert.equal(classifyPaths(["tests/runtime/recovery.test.ts"]).class, "D");
  assert.equal(classifyPaths(["src/external-knowledge/local-directory-adapter.ts"]).class, "D");
  assert.equal(classifyPaths(["src/guardian/trust-root.ts"]).class, "D");
  assert.equal(classifyPaths(["src/cli/guardian-command.ts"]).class, "D");
  assert.equal(classifyPaths(["tests/guardian-trust-root.test.ts"]).class, "D");
  assert.equal(classifyPaths(["tests/guardian-cli.test.ts"]).class, "D");
  assert.equal(classifyPaths(["tests/protected-bootstrap-release.test.ts"]).class, "D");
  assert.equal(classifyPaths(["tests/stage-a-installer-contract.test.ts"]).class, "D");
  assert.equal(classifyPaths(["src/cli/index.ts"]).class, "D");
  assert.equal(classifyPaths(["tests/legacy-mutation-authority.test.ts"]).class, "D");
  assert.equal(classifyPaths(["tests/semantic-knowledge-cli.test.ts"]).class, "D");
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
  assert.equal(classifyPaths(["tests/project-findings-freshness.test.ts"]).class, "D");
});

test("uses the highest class across mixed changes", () => {
  assert.equal(classifyPaths(["README.md", "src/cli/understand-command.ts"]).class, "C");
  assert.equal(classifyPaths(["docs/quickstart.md", ".github/workflows/ci.yml"]).class, "D");
  assert.equal(classifyPaths(["src/cli/understand-command.ts", "src/external-knowledge/types.ts"]).class, "D");
  assert.equal(classifyPaths(["README.md", "src/cli/first-run-command.ts"]).class, "D");
  assert.equal(classifyPaths(["README.md", "src/autonomy/profile.ts"]).class, "D");
  assert.equal(classifyPaths(["README.md", "src/guardian/trust-root.ts"]).class, "D");
  assert.equal(classifyPaths(["README.md", "src/cli/index.ts"]).class, "D");
  assert.equal(classifyPaths(["docs/project-findings.md", "src/findings/project-findings.ts"]).class, "D");
  assert.equal(classifyPaths(["apps/desktop/src/main.ts", "apps/desktop/src-tauri/tauri.conf.json"]).class, "D");
});

test("unknown and empty change sets fail safe to D", () => {
  assert.equal(classifyPaths(["new-surface/example.data"]).class, "D");
  assert.equal(classifyPaths([]).class, "D");
  assert.equal(classifyPaths([]).desktopRendererOnly, false);
});
