import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

test("token-efficiency baseline harness emits bounded reproducible B-state metrics", () => {
  const result = spawnSync(process.execPath, ["scripts/token-efficiency-baseline.mjs"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    shell: false,
    env: { ...process.env },
  });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout) as {
    schemaVersion: number;
    benchmarkState: string;
    sourceBaseline: string;
    methodology: { tokenProxy: string };
    surfaces: Array<{ surface: string; bytes: number; estimatedTokens: number }>;
    totals: {
      bytes: number;
      estimatedTokens: number;
      crossSurfaceDuplicateStringBytes: number;
      mcpStructuredContentMirroredInTextBytes: number;
    };
    reliabilityAssertions: {
      providerContextState: string;
      contextSafetyState: string;
      mcpReturnedWithoutMutationAuthority: boolean;
      changesMade: number;
    };
  };

  assert.equal(report.schemaVersion, 1);
  assert.equal(report.benchmarkState, "B-current-livariant");
  assert.equal(report.sourceBaseline, "f325ab57b862e1e13526e6d75e17d93a243e2284");
  assert.match(report.methodology.tokenProxy, /proxy/i);
  assert.deepEqual(report.surfaces.map((item) => item.surface), ["resume", "context", "providerContext", "understand", "mcpContext"]);
  for (const surface of report.surfaces) {
    assert.ok(surface.bytes > 0, `${surface.surface} must have measurable payload bytes`);
    assert.ok(surface.estimatedTokens > 0, `${surface.surface} must have a non-zero token proxy`);
  }
  assert.ok(report.totals.bytes > 0);
  assert.ok(report.totals.estimatedTokens > 0);
  assert.ok(report.totals.crossSurfaceDuplicateStringBytes >= 0);
  assert.ok(report.totals.mcpStructuredContentMirroredInTextBytes > 0, "current MCP context response should expose measurable structured/text mirroring");
  assert.equal(report.reliabilityAssertions.providerContextState, "ready");
  assert.equal(report.reliabilityAssertions.contextSafetyState, "clear");
  assert.equal(report.reliabilityAssertions.mcpReturnedWithoutMutationAuthority, true);
  assert.equal(report.reliabilityAssertions.changesMade, 0);

  console.log(`TOKEN_EFFICIENCY_BASELINE ${JSON.stringify(report)}`);
});
