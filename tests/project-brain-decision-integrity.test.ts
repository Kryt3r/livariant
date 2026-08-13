import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { initializeProject } from "../src/runtime/index.js";
import { ProjectBrainStore } from "../src/project-brain/store.js";

test("Project Brain inspection rejects inconsistent structured decision history", async () => {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-decision-integrity-"));
  try {
    await initializeProject(path, { authorized: true });
    await writeFile(
      resolve(path, ".project-brain", "decisions.md"),
      "# Decisions\n\n- [D-old] (superseded by D-next) Previous direction\n",
      "utf8",
    );

    const inspection = await new ProjectBrainStore(path).inspect();
    assert.equal(inspection.health, "unsupported-or-ambiguous");
  } finally {
    await rm(path, { recursive: true, force: true });
  }
});
