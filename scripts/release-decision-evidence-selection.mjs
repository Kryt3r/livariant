function latestRun(runs, predicate) {
  return runs
    .filter(predicate)
    .sort((left, right) => Date.parse(right.created_at ?? 0) - Date.parse(left.created_at ?? 0))[0];
}

export const SELF_INTEGRITY_RELEASE_WORKFLOW_NAME = "Self-Integrity Release Acceptance";

export function selectCanonicalReleaseRuns(runs, sourceSha) {
  const safeRuns = Array.isArray(runs) ? runs : [];
  const hardeningRun = latestRun(
    safeRuns,
    (run) => run.name === "Hardening CI"
      && run.head_sha === sourceSha
      && run.head_branch === "main"
      && run.event === "push"
      && run.status === "completed",
  );
  const codeqlRun = latestRun(
    safeRuns,
    (run) => run.head_sha === sourceSha
      && run.head_branch === "main"
      && run.status === "completed"
      && (String(run.path).includes("codeql") || String(run.name).toLowerCase().includes("codeql")),
  );
  const selfIntegrityRun = latestRun(
    safeRuns,
    (run) => run.name === SELF_INTEGRITY_RELEASE_WORKFLOW_NAME
      && run.head_sha === sourceSha
      && run.head_branch === "main"
      && run.event === "push"
      && run.status === "completed",
  );
  return { hardeningRun, codeqlRun, selfIntegrityRun };
}
