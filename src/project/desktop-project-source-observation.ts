import { readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { parseDesktopProjectSourceReviewRefreshInput } from "./desktop-project-source-review-refresh.js";
import type { ProjectSourceObservation } from "./project-source-center-presentation.js";
import type { RepositoryIdentity } from "./source-registry.js";

type GitProbe = {
  status: number | null;
  stdout: string;
  stderr: string;
};

function git(localPath: string, args: readonly string[]): GitProbe {
  const result = spawnSync("git", ["-C", localPath, ...args], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    timeout: 10_000,
  });
  return {
    status: result.status,
    stdout: typeof result.stdout === "string" ? result.stdout.trim() : "",
    stderr: typeof result.stderr === "string" ? result.stderr.trim() : "",
  };
}

export function observeLocalProjectSource(
  identity: RepositoryIdentity,
  localPath: string,
  observedAt: string,
): ProjectSourceObservation {
  const repo = git(localPath, ["rev-parse", "--is-inside-work-tree"]);
  if (repo.status !== 0 || repo.stdout !== "true") {
    return {
      identity,
      reachability: "unreachable",
      observedAt,
      stale: false,
      attention: ["Configured local checkout could not be inspected as a Git work tree."],
    };
  }

  const revision = git(localPath, ["rev-parse", "HEAD"]);
  if (revision.status !== 0 || !revision.stdout) {
    return {
      identity,
      reachability: "unreachable",
      observedAt,
      stale: false,
      attention: ["Git work tree is reachable, but its current revision could not be observed."],
    };
  }

  const branch = git(localPath, ["branch", "--show-current"]);
  const attention: string[] = [];
  if (branch.status !== 0) attention.push("Current branch could not be observed.");
  if (branch.status === 0 && !branch.stdout) attention.push("Checkout is detached; no branch name is currently active.");

  return {
    identity,
    reachability: "reachable",
    ...(branch.status === 0 && branch.stdout ? { branch: branch.stdout } : {}),
    revision: revision.stdout,
    observedAt,
    stale: false,
    ...(attention.length > 0 ? { attention } : {}),
  };
}

export async function observeDesktopProjectSources(inputPath: string): Promise<ProjectSourceObservation[]> {
  const parsed = parseDesktopProjectSourceReviewRefreshInput(JSON.parse(await readFile(inputPath, "utf8")));
  const observedAt = new Date().toISOString();
  const observations: ProjectSourceObservation[] = [
    observeLocalProjectSource(parsed.primary.identity, parsed.primary.localPath, observedAt),
  ];

  for (const additional of parsed.additional ?? []) {
    if (!additional.localPath) continue;
    observations.push(observeLocalProjectSource(additional.identity, additional.localPath, observedAt));
  }

  const absoluteInput = resolve(inputPath);
  const temp = resolve(dirname(absoluteInput), `${absoluteInput.split(/[\\/]/).at(-1)}.tmp`);
  await writeFile(temp, `${JSON.stringify({ ...parsed, observations }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temp, absoluteInput);
  return observations;
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1]).replace(/\\/g, "/")}`).href) {
  const inputPath = process.env.LIVARIANT_PROJECT_SOURCE_REVIEW_INPUT;
  if (!inputPath?.trim()) throw new Error("Fixed Desktop Project Source & Review input path is required.");
  await observeDesktopProjectSources(inputPath);
}
