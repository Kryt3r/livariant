import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

test("token-efficiency baseline harness emits bounded reproducible B-state metrics", () => {
  const sourceSha = "0123456789abcdef0123456789abcdef01234567";
  const result = spawnSync(process.execPath, ["scripts/token-efficiency-baseline.mjs"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    shell: false,
    env: { ...process.env, LIVARIANT_BENCHMARK_SOURCE_SHA: sourceSha },
  });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout) as {
    schemaVersion: number;
    benchmarkState: string;
    sourceIdentity: { sourceSha: string | null; exactSourceBound: boolean };
    methodology: { tokenProxy: string; aggregateBoundary: string };
    surfaces: Array<{
      surface: string;
      serializedBytes: number;
      tokenProxy: number;
      topLevelFieldBytes: Record<string, number>;
    }>;
    resumeProviderDelivery: {
      provider: string;
      textBytes: number;
      textTokenProxy: number;
      duplicateKnownFactBytes: number;
      knownFactCount: number;
      evidenceSummaryEqualsKnownFacts: boolean;
    };
    aggregateDiagnostics: {
      serializedBytesAcrossMeasuredSurfaces: number;
      tokenProxyAcrossMeasuredSurfaces: number;
      crossSurfaceDuplicateStringBytes: number;
    };
    mcpDelivery: {
      transportResponseBytes: number;
      explicitTextContentBytes: number;
      explicitTextContentTokenProxy: number;
      structuredContentBytes: number;
      exactStructuredTextMirror: boolean;
      exactMirrorBytes: number;
      interpretationBoundary: string;
    };
    reliabilityAssertions: {
      providerContextState: string;
      contextSafetyState: string;
      mcpReturnedWithoutMutationAuthority: boolean;
      changesMade: number;
    };
  };

  assert.equal(report.schemaVersion, 4);
  assert.equal(report.benchmarkState, "B-current-livariant");
  assert.equal(report.sourceIdentity.sourceSha, sourceSha);
  assert.equal(report.sourceIdentity.exactSourceBound, true);
  assert.match(report.methodology.tokenProxy, /proxy/i);
  assert.match(report.methodology.aggregateBoundary, /not assumed/i);
  assert.deepEqual(report.surfaces.map((item) => item.surface), ["resume", "context", "providerContext", "understand", "mcpContext"]);
  for (const surface of report.surfaces) {
    assert.ok(surface.serializedBytes > 0, `${surface.surface} must have measurable payload bytes`);
    assert.ok(surface.tokenProxy > 0, `${surface.surface} must have a non-zero token proxy`);
    assert.ok(Object.keys(surface.topLevelFieldBytes).length > 0, `${surface.surface} must expose top-level field diagnostics`);
  }
  assert.equal(report.resumeProviderDelivery.provider, "codex");
  assert.ok(report.resumeProviderDelivery.textBytes > 0);
  assert.ok(report.resumeProviderDelivery.textTokenProxy > 0);
  assert.ok(report.resumeProviderDelivery.duplicateKnownFactBytes >= 0);
  assert.ok(report.resumeProviderDelivery.knownFactCount > 0);
  assert.equal(report.resumeProviderDelivery.evidenceSummaryEqualsKnownFacts, true);
  assert.ok(report.aggregateDiagnostics.serializedBytesAcrossMeasuredSurfaces > 0);
  assert.ok(report.aggregateDiagnostics.tokenProxyAcrossMeasuredSurfaces > 0);
  assert.ok(report.aggregateDiagnostics.crossSurfaceDuplicateStringBytes >= 0);
  assert.ok(report.mcpDelivery.transportResponseBytes > report.mcpDelivery.explicitTextContentBytes);
  assert.equal(report.mcpDelivery.exactStructuredTextMirror, true);
  assert.equal(report.mcpDelivery.exactMirrorBytes, report.mcpDelivery.explicitTextContentBytes);
  assert.equal(report.mcpDelivery.structuredContentBytes, report.mcpDelivery.explicitTextContentBytes);
  assert.match(report.mcpDelivery.interpretationBoundary, /not automatically equivalent/i);
  assert.equal(report.reliabilityAssertions.providerContextState, "ready");
  assert.equal(report.reliabilityAssertions.contextSafetyState, "clear");
  assert.equal(report.reliabilityAssertions.mcpReturnedWithoutMutationAuthority, true);
  assert.equal(report.reliabilityAssertions.changesMade, 0);

  console.log(`TOKEN_EFFICIENCY_BASELINE ${JSON.stringify(report)}`);
});
