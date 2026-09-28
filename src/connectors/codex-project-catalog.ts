import { randomUUID } from "node:crypto";
import type { CodexAppServerSession } from "./codex-runtime.js";

export interface CodexProjectCatalogEntry {
  projectId: string;
  name: string;
  roots: string[];
}

type JsonObject = Record<string, unknown>;
function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function requireObject(value: unknown, field: string): JsonObject {
  if (!isObject(value)) throw new Error(`${field} must be an object.`);
  return value;
}
function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${field} must be a non-blank string.`);
  return value;
}

async function requestProjectPage(
  session: CodexAppServerSession,
  cursor: string | null,
  page: number,
): Promise<{ data: CodexProjectCatalogEntry[]; nextCursor: string | null }> {
  if (!session.isOpen()) throw new Error("Codex project discovery requires an open App Server session.");
  const id = `livariant-project-list-${randomUUID()}-${page}`;
  const response = new Promise<JsonObject>((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error("Codex project/list request timed out."));
    }, 15_000);
    const unsubscribe = session.onMessage((message) => {
      if (message.id !== id || message.method !== undefined) return;
      clearTimeout(timeout);
      unsubscribe();
      if (message.error !== undefined) {
        reject(new Error("Codex project/list request failed."));
        return;
      }
      try {
        resolve(requireObject(message.result, "Codex project/list result"));
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  });

  session.send({
    method: "project/list",
    id,
    params: {
      cursor,
      limit: 100,
      sortKey: "position",
      sortDirection: "asc",
    },
  });

  const result = await response;
  if (!Array.isArray(result.data)) throw new Error("Codex project/list result.data must be an array.");
  const data = result.data.map((raw, index) => {
    const project = requireObject(raw, `Codex project/list result.data[${index}]`);
    if (!Array.isArray(project.roots)) throw new Error(`Codex project/list result.data[${index}].roots must be an array.`);
    return {
      projectId: requireText(project.id, `Codex project/list result.data[${index}].id`),
      name: requireText(project.name, `Codex project/list result.data[${index}].name`),
      roots: project.roots.map((root, rootIndex) => {
        const item = requireObject(root, `Codex project/list result.data[${index}].roots[${rootIndex}]`);
        return requireText(item.path, `Codex project/list result.data[${index}].roots[${rootIndex}].path`);
      }),
    };
  });
  const nextCursor = result.nextCursor === null || result.nextCursor === undefined
    ? null
    : requireText(result.nextCursor, "Codex project/list result.nextCursor");
  return { data, nextCursor };
}

export async function listCodexProjects(session: CodexAppServerSession): Promise<CodexProjectCatalogEntry[]> {
  const projects: CodexProjectCatalogEntry[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 20; page += 1) {
    const result = await requestProjectPage(session, cursor, page);
    projects.push(...result.data);
    if (!result.nextCursor) return projects;
    cursor = result.nextCursor;
  }
  throw new Error("Codex project/list pagination exceeded the Livariant safety bound.");
}
