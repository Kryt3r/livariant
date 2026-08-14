import { constants } from "node:fs";
import {
  access,
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { parseDecisionsMarkdown } from "./decisions.js";
import { isStableProjectIdentity } from "./identity.js";
import { assertPathWithinRoot, assertRegularFile } from "./path-safety.js";
import type {
  BootstrapKnowledge,
  ProjectBrainInspection,
  ProjectBrainMetadata,
  ProjectBrainPresence,
} from "./types.js";

const REQUIRED_FILES = ["project.md", "goals.md", "decisions.md", "knowledge.md", "metadata.json"] as const;
type ManagedTextDocument = "goals.md" | "decisions.md" | "knowledge.md";

export interface BootstrapOptions {
  beforePromote?: () => void | Promise<void>;
}

export interface ManagedDocumentWriteOptions {
  beforePromote?: () => void | Promise<void>;
}

function metadataShapeIsValid(metadata: Partial<ProjectBrainMetadata>): boolean {
  if (
    typeof metadata.framework?.version !== "string" ||
    typeof metadata.framework?.channel !== "string" ||
    typeof metadata.projectBrain?.schemaVersion !== "number"
  ) {
    return false;
  }

  if (metadata.projectBrain.schemaVersion === 2 && !isStableProjectIdentity(metadata.projectBrain.projectId)) {
    return false;
  }

  return true;
}

export class ProjectBrainStore {
  constructor(private readonly projectRoot: string) {}

  async inspectPresence(): Promise<ProjectBrainPresence> {
    const inspection = await this.inspect();
    return { present: inspection.health !== "not-found", path: inspection.path };
  }

  async inspect(): Promise<ProjectBrainInspection> {
    const brainPath = resolve(this.projectRoot, ".project-brain");
    assertPathWithinRoot(this.projectRoot, brainPath, "Project Brain path");

    try {
      await access(brainPath, constants.F_OK);
    } catch {
      return { health: "not-found", path: brainPath, missingFiles: [...REQUIRED_FILES] };
    }

    const stats = await lstat(brainPath);
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      return {
        health: "unsupported-or-ambiguous",
        path: brainPath,
        missingFiles: [...REQUIRED_FILES],
        reason: ".project-brain must be a real directory and must not be a symbolic link",
      };
    }

    const entries = new Set(await readdir(brainPath));
    const missingFiles = REQUIRED_FILES.filter((file) => !entries.has(file));
    if (missingFiles.length > 0) {
      return {
        health: "partial-or-damaged",
        path: brainPath,
        missingFiles,
        reason: "required Project Brain files are missing",
      };
    }

    for (const file of REQUIRED_FILES) {
      try {
        await assertRegularFile(resolve(brainPath, file), `Managed Project Brain file '${file}'`);
      } catch (error) {
        return {
          health: "unsupported-or-ambiguous",
          path: brainPath,
          missingFiles: [],
          reason: error instanceof Error ? error.message : `Managed Project Brain file '${file}' is unsafe`,
        };
      }
    }

    const decisions = parseDecisionsMarkdown(await readFile(resolve(brainPath, "decisions.md"), "utf8"));
    if (decisions.issues.length > 0) {
      return {
        health: "unsupported-or-ambiguous",
        path: brainPath,
        missingFiles: [],
        reason: "structured Project Brain decision history is ambiguous",
      };
    }

    if (entries.has(".lifecycle")) {
      const lifecycleStats = await lstat(resolve(brainPath, ".lifecycle"));
      if (!lifecycleStats.isDirectory() || lifecycleStats.isSymbolicLink()) {
        return {
          health: "unsupported-or-ambiguous",
          path: brainPath,
          missingFiles: [],
          reason: ".project-brain/.lifecycle must be a real directory and must not be a symbolic link",
        };
      }
    }

    try {
      const metadata = await this.readMetadata();
      if (!metadataShapeIsValid(metadata)) {
        return {
          health: "partial-or-damaged",
          path: brainPath,
          missingFiles: [],
          reason: "Project Brain metadata has an invalid shape",
        };
      }
    } catch {
      return {
        health: "partial-or-damaged",
        path: brainPath,
        missingFiles: [],
        reason: "Project Brain metadata cannot be parsed",
      };
    }

    return { health: "valid", path: brainPath, missingFiles: [] };
  }

  async readMetadata(): Promise<ProjectBrainMetadata> {
    const metadataPath = resolve(this.projectRoot, ".project-brain", "metadata.json");
    assertPathWithinRoot(resolve(this.projectRoot, ".project-brain"), metadataPath, "Project Brain metadata path");
    await assertRegularFile(metadataPath, "Project Brain metadata");
    return JSON.parse(await readFile(metadataPath, "utf8")) as ProjectBrainMetadata;
  }

  async readGoalsDocument(): Promise<string> {
    return this.readManagedTextDocument("goals.md");
  }

  async readDecisionsDocument(): Promise<string> {
    return this.readManagedTextDocument("decisions.md");
  }

  async readKnowledgeDocument(): Promise<string> {
    return this.readManagedTextDocument("knowledge.md");
  }

  async replaceGoalsDocument(expectedOriginal: string, content: string, options: ManagedDocumentWriteOptions = {}): Promise<void> {
    await this.replaceManagedTextDocument("goals.md", expectedOriginal, content, options);
  }

  async replaceDecisionsDocument(expectedOriginal: string, content: string, options: ManagedDocumentWriteOptions = {}): Promise<void> {
    await this.replaceManagedTextDocument("decisions.md", expectedOriginal, content, options);
  }

  async replaceKnowledgeDocument(expectedOriginal: string, content: string, options: ManagedDocumentWriteOptions = {}): Promise<void> {
    await this.replaceManagedTextDocument("knowledge.md", expectedOriginal, content, options);
  }

  private async readManagedTextDocument(filename: ManagedTextDocument): Promise<string> {
    const brainPath = resolve(this.projectRoot, ".project-brain");
    const path = resolve(brainPath, filename);
    assertPathWithinRoot(brainPath, path, `Project Brain ${filename} path`);
    await assertRegularFile(path, `Project Brain ${filename}`);
    return readFile(path, "utf8");
  }

  private async replaceManagedTextDocument(
    filename: ManagedTextDocument,
    expectedOriginal: string,
    content: string,
    options: ManagedDocumentWriteOptions,
  ): Promise<void> {
    const brainPath = resolve(this.projectRoot, ".project-brain");
    const path = resolve(brainPath, filename);
    const tempPath = resolve(brainPath, `.${filename}.tmp-${randomUUID()}`);
    assertPathWithinRoot(brainPath, path, `Project Brain ${filename} path`);
    assertPathWithinRoot(brainPath, tempPath, `Project Brain ${filename} candidate path`);
    await assertRegularFile(path, `Project Brain ${filename}`);
    await writeFile(tempPath, content, { encoding: "utf8", flag: "wx" });
    try {
      await assertRegularFile(tempPath, `Project Brain ${filename} candidate`);
      await options.beforePromote?.();
      await assertRegularFile(path, `Project Brain ${filename}`);
      const current = await readFile(path, "utf8");
      if (current !== expectedOriginal) {
        throw new Error(`Project Brain ${filename} changed concurrently; refusing to overwrite newer project-owned state.`);
      }
      await rename(tempPath, path);
    } catch (error) {
      await rm(tempPath, { force: true });
      throw error;
    }
  }

  async updateFrameworkLifecycle(version: string, channel: string): Promise<void> {
    const brainPath = resolve(this.projectRoot, ".project-brain");
    const metadataPath = resolve(brainPath, "metadata.json");
    const tempPath = resolve(brainPath, `.metadata.tmp-${randomUUID()}.json`);
    assertPathWithinRoot(brainPath, metadataPath, "Lifecycle metadata path");
    assertPathWithinRoot(brainPath, tempPath, "Lifecycle temporary metadata path");
    await assertRegularFile(metadataPath, "Project Brain metadata");
    const current = JSON.parse(await readFile(metadataPath, "utf8")) as ProjectBrainMetadata & Record<string, unknown>;

    const next = {
      ...current,
      framework: {
        ...current.framework,
        version,
        channel,
      },
    };

    await writeFile(tempPath, `${JSON.stringify(next, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    try {
      const parsed = JSON.parse(await readFile(tempPath, "utf8")) as Partial<ProjectBrainMetadata>;
      if (!metadataShapeIsValid(parsed)) {
        throw new Error("Lifecycle metadata candidate is invalid");
      }
      await rename(tempPath, metadataPath);
    } catch (error) {
      await rm(tempPath, { force: true });
      throw error;
    }
  }

  async bootstrap(metadata: ProjectBrainMetadata, knowledge: BootstrapKnowledge, options: BootstrapOptions = {}): Promise<string> {
    const initial = await this.inspect();
    if (initial.health !== "not-found") {
      throw new Error(`Fresh initialization blocked: Project Brain state is ${initial.health}`);
    }

    const targetPath = initial.path;
    const tempPath = resolve(this.projectRoot, `.project-brain.tmp-${randomUUID()}`);
    assertPathWithinRoot(this.projectRoot, targetPath, "Project Brain target path");
    assertPathWithinRoot(this.projectRoot, tempPath, "Project Brain temporary path");

    try {
      await mkdir(tempPath, { recursive: false });

      const projectLines = ["# Project", "", "## Identity", ""];
      if (knowledge.projectName) {
        projectLines.push(`- Confirmed package name: ${knowledge.projectName}`);
      } else {
        projectLines.push("- Project name: Unknown");
      }
      projectLines.push("", "This file contains project-owned canonical knowledge.", "");

      const knowledgeLines = [
        "# Knowledge",
        "",
        "## Verified discovery evidence",
        "",
        ...(knowledge.evidence.length > 0 ? knowledge.evidence.map((item) => `- ${item}`) : ["- No additional project signals confirmed."]),
        "",
        "## Known unknowns",
        "",
        ...knowledge.unknowns.map((item) => `- ${item}`),
        "",
      ];

      await writeFile(resolve(tempPath, "project.md"), projectLines.join("\n"), { encoding: "utf8", flag: "wx" });
      await writeFile(resolve(tempPath, "goals.md"), "# Goals\n\nNo confirmed project goals have been recorded yet.\n", { encoding: "utf8", flag: "wx" });
      await writeFile(resolve(tempPath, "decisions.md"), "# Decisions\n\nNo accepted project decisions have been recorded yet.\n", { encoding: "utf8", flag: "wx" });
      await writeFile(resolve(tempPath, "knowledge.md"), knowledgeLines.join("\n"), { encoding: "utf8", flag: "wx" });
      await writeFile(resolve(tempPath, "metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`, { encoding: "utf8", flag: "wx" });

      await this.validateCandidate(tempPath);
      await options.beforePromote?.();

      const finalCheck = await this.inspect();
      if (finalCheck.health !== "not-found") {
        throw new Error(`Fresh initialization blocked before promotion: Project Brain state became ${finalCheck.health}`);
      }

      await rename(tempPath, targetPath);
      return targetPath;
    } catch (error) {
      await rm(tempPath, { recursive: true, force: true });
      throw error;
    }
  }

  private async validateCandidate(candidatePath: string): Promise<void> {
    const entries = new Set(await readdir(candidatePath));
    const missing = REQUIRED_FILES.filter((file) => !entries.has(file));
    if (missing.length > 0) throw new Error(`Bootstrap candidate is incomplete: ${missing.join(", ")}`);
    for (const file of REQUIRED_FILES) await assertRegularFile(resolve(candidatePath, file), `Bootstrap candidate file '${file}'`);

    const metadata = JSON.parse(await readFile(resolve(candidatePath, "metadata.json"), "utf8")) as Partial<ProjectBrainMetadata>;
    if (!metadataShapeIsValid(metadata)) {
      throw new Error("Bootstrap candidate metadata is invalid");
    }
  }
}
