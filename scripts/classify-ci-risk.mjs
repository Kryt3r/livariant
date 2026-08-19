import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const priorities = { A: 1, B: 2, C: 3, D: 4 };

function maxClass(left, right) {
  return priorities[right] > priorities[left] ? right : left;
}

function isClassD(path) {
  if (path.startsWith(".github/workflows/")) return true;
  if (path === "package.json" || path === "package-lock.json") return true;
  if (path === "tsconfig.json") return true;
  if (path.startsWith("scripts/")) return true;
  if (path.startsWith("src/external-knowledge/")) return true;
  if (path.startsWith("src/autonomy/")) return true;
  if (path.startsWith("src/guardian/")) return true;
  if (path.startsWith("src/findings/")) return true;
  if (path === "src/cli/index.ts") return true;
  if (path === "src/cli/autonomy-command.ts") return true;
  if (path === "src/cli/first-run-command.ts") return true;
  if (path === "src/cli/guardian-command.ts") return true;
  if (path === "src/cli/findings-command.ts") return true;
  if (path === "tests/legacy-mutation-authority.test.ts") return true;
  if (path === "tests/semantic-knowledge-cli.test.ts") return true;
  if (path === "tests/autonomy-profile.test.ts") return true;
  if (path === "tests/autonomy-cli.test.ts") return true;
  if (path === "tests/first-run-cli.test.ts") return true;
  if (path === "tests/guardian-trust-root.test.ts") return true;
  if (path === "tests/guardian-cli.test.ts") return true;
  if (path === "tests/project-findings.test.ts") return true;
  if (path === "tests/project-findings-cli.test.ts") return true;

  const safetySegments = [
    "/distribution/",
    "/runtime/",
    "/migration/",
    "/migrations/",
    "/recovery/",
    "/release/",
    "/trust/",
    "/authority/",
    "/guardian/",
    "/filesystem/",
  ];

  const normalized = `/${path.toLowerCase()}/`;
  return safetySegments.some((segment) => normalized.includes(segment));
}

function classifyPath(path) {
  if (isClassD(path)) return "D";

  if (
    path.startsWith("src/") ||
    path.startsWith("tests/") ||
    path.startsWith("core/") ||
    path.startsWith("patterns/") ||
    path.startsWith("profiles/") ||
    path.startsWith("adapters/")
  ) {
    return "C";
  }

  if (
    path.startsWith("docs/") ||
    path.endsWith(".md") ||
    path === "LICENSE" ||
    path.startsWith("LICENSE.") ||
    path === "NOTICE" ||
    path === "THIRD_PARTY_NOTICES"
  ) {
    if (
      path === "CODE_OF_CONDUCT.md" ||
      path === ".github/PULL_REQUEST_TEMPLATE.md" ||
      path.startsWith(".github/ISSUE_TEMPLATE/")
    ) {
      return "A";
    }
    return "B";
  }

  if (path.startsWith(".github/ISSUE_TEMPLATE/")) return "A";

  // Unknown paths fail safe. Adding a new project surface must not silently
  // reduce verification until its risk class is deliberately defined.
  return "D";
}

export function classifyPaths(paths) {
  if (paths.length === 0) {
    return {
      class: "D",
      paths: [],
      reason: "No changed paths were available, so verification escalated fail-safe.",
    };
  }

  let result = "A";
  const details = [];

  for (const path of paths) {
    const pathClass = classifyPath(path);
    result = maxClass(result, pathClass);
    details.push({ path, class: pathClass });
  }

  return {
    class: result,
    paths: details,
    reason: `Highest required risk class across ${paths.length} changed path(s).`,
  };
}

function readPaths(argv) {
  if (argv.length > 0) return argv;
  const stdin = readFileSync(0, "utf8");
  return stdin
    .split(/\r?\n/u)
    .map((value) => value.trim())
    .filter(Boolean);
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectExecution) {
  const result = classifyPaths(readPaths(process.argv.slice(2)));
  const runExecutable = result.class === "C" || result.class === "D";
  const runFull = result.class === "D";

  process.stdout.write(`class=${result.class}\n`);
  process.stdout.write(`run_executable=${runExecutable}\n`);
  process.stdout.write(`run_full=${runFull}\n`);
  process.stderr.write(`${JSON.stringify(result, null, 2)}\n`);
}
