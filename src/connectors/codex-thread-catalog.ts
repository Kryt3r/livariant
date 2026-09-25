import { randomUUID } from "node:crypto";
import type { CodexAppServerSession } from "./codex-runtime.js";

export interface CodexThreadCatalogEntry {
  threadId: string;
  sessionId: string;
  cwd: string;
  projectId: string | null;
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

function optionalText(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  return requireText(value, field);
}

async function requestThreadPage(
  session: CodexAppServerSession,
  cursor: string | null,
  page: number,
): Promise<{ data: CodexThreadCatalogEntry[]; nextCursor: string | null }> {
  if (!session.isOpen()) throw new Error("Codex thread discovery requires an open App Server session.");
  const id = `livariant-thread-list-${randomUUID()}-${page}`;
  const response = new Promise<JsonObject>((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error("Codex thread/list request timed out."));
    }, 15_000);
    const unsubscribe = session.onMessage((message) => {
      if (message.id !== id || message.method !== undefined) return;
      clearTimeout(timeout);
      unsubscribe();
      if (message.error !== undefined) {
        reject(new Error("Codex thread/list request failed."));
        return;
      }
      try {
        resolve(requireObject(message.result, "Codex thread/list result"));
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  });

  session.send({
    method: "thread/list",
    id,
    params: {
      cursor,
      limit: 100,
      sortKey: "updated_at",
      sortDirection: "desc",
    },
  });

  const result = await response;
  if (!Array.isArray(result.data)) throw new Error("Codex thread/list result.data must be an array.");
  const data = result.data.map((raw, index) => {
    const thread = requireObject(raw, `Codex thread/list result.data[${index}]`);
    return {
      threadId: requireText(thread.id, `Codex thread/list result.data[${index}].id`),
      sessionId: requireText(thread.sessionId, `Codex thread/list result.data[${index}].sessionId`),
      cwd: requireText(thread.cwd, `Codex thread/list result.data[${index}].cwd`),
      projectId: optionalText(thread.projectId, `Codex thread/list result.data[${index}].projectId`),
    };
  });
  const nextCursor = result.nextCursor === null || result.nextCursor === undefined
    ? null
    : requireText(result.nextCursor, "Codex thread/list result.nextCursor");
  return { data, nextCursor };
}

export async function listCodexThreads(session: CodexAppServerSession): Promise<CodexThreadCatalogEntry[]> {
  const threads: CodexThreadCatalogEntry[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 20; page += 1) {
    const result = await requestThreadPage(session, cursor, page);
    threads.push(...result.data);
    if (!result.nextCursor) return threads;
    cursor = result.nextCursor;
  }
  throw new Error("Codex thread/list pagination exceeded the Livariant safety bound.");
}
