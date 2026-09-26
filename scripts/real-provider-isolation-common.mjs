import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const root = process.cwd();
const dist = (path) => pathToFileURL(resolve(root, "dist", "src", ...path)).href;

export async function createAcceptanceProjects() {
  const { initializeProject } = await import(dist(["runtime", "index.js"]));
  const tempRoot = await mkdtemp(resolve(tmpdir(), "livariant-real-provider-isolation-"));
  const projectA = resolve(tempRoot, "project-a");
  const projectB = resolve(tempRoot, "project-b");
  await mkdir(projectA);
  await mkdir(projectB);
  await initializeProject(projectA, { authorized: true });
  await initializeProject(projectB, { authorized: true });
  return {
    tempRoot,
    projectA,
    projectB,
    async cleanup() {
      await rm(tempRoot, { recursive: true, force: true });
    },
  };
}

export function acceptancePrompt(provider, marker) {
  return [
    "This is a Livariant real-provider project-isolation acceptance turn.",
    "Do not modify project files. Do not use shell, web, file-edit, or unrelated tools.",
    `Use the Livariant MCP integration for provider '${provider}'.`,
    `First call livariant_provider_context with provider='${provider}' and task exactly '${marker}'.`,
    "Then call livariant_provider_return using the exact ready Provider Context returned by that call and no durable-change candidate.",
    `After the return succeeds, reply with exactly '${marker}'.`,
  ].join("\n");
}

export function parseJsonLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    });
}

export async function runProcess(command, args, cwd, timeoutMs = 180_000, env = process.env) {
  return await new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      windowsHide: true,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      rejectRun(new Error(`Provider acceptance process timed out after ${timeoutMs} ms.\n${stderr}`));
    }, timeoutMs);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => {
      clearTimeout(timeout);
      rejectRun(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        rejectRun(new Error(`Provider acceptance process exited with ${String(code)}.\n${stderr}\n${stdout}`));
        return;
      }
      resolveRun({ stdout, stderr });
    });
  });
}

export function recursivelyContains(value, predicate) {
  if (predicate(value)) return true;
  if (Array.isArray(value)) return value.some((item) => recursivelyContains(item, predicate));
  if (value && typeof value === "object") {
    return Object.values(value).some((item) => recursivelyContains(item, predicate));
  }
  return false;
}

export function assertToolEvidence(events, toolSuffix, marker) {
  const matched = events.some((event) =>
    recursivelyContains(event, (value) =>
      typeof value === "string"
      && (value === toolSuffix || value.endsWith(toolSuffix))
    )
    && recursivelyContains(event, (value) => value === marker)
  );
  if (!matched) {
    throw new Error(`Provider output did not contain tool evidence for ${toolSuffix} / ${marker}.`);
  }
}

export async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
