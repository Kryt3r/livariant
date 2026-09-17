import type { CodexAppServerSession } from "./codex-runtime.js";

export interface CodexModelCatalogEntry {
  id: string;
  model: string;
  displayName: string;
  hidden: boolean;
  isDefault: boolean;
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${field} must be a non-blank string.`);
  return value;
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${field} must be boolean.`);
  return value;
}

function requireObject(value: unknown, field: string): JsonObject {
  if (!isObject(value)) throw new Error(`${field} must be an object.`);
  return value;
}

function requireArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array.`);
  return value;
}

async function requestModelPage(
  session: CodexAppServerSession,
  cursor: string | null,
  page: number,
): Promise<{ data: CodexModelCatalogEntry[]; nextCursor: string | null }> {
  if (!session.isOpen()) throw new Error("Codex model discovery requires an open App Server session.");
  const id = `livariant-model-list-${Date.now()}-${page}-${Math.random().toString(36).slice(2)}`;
  const response = new Promise<JsonObject>((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error("Codex model/list request timed out."));
    }, 15_000);
    const unsubscribe = session.onMessage((message) => {
      if (message.id !== id || message.method !== undefined) return;
      clearTimeout(timeout);
      unsubscribe();
      if (message.error !== undefined) {
        reject(new Error("Codex model/list request failed."));
        return;
      }
      try { resolve(requireObject(message.result, "Codex model/list result")); }
      catch (error) { reject(error instanceof Error ? error : new Error(String(error))); }
    });
  });

  session.send({
    method: "model/list",
    id,
    params: { cursor, limit: 100, includeHidden: false },
  });

  const result = await response;
  const data = requireArray(result.data, "Codex model/list result.data").map((raw, index) => {
    const model = requireObject(raw, `Codex model/list result.data[${index}]`);
    return {
      id: requireText(model.id, `Codex model/list result.data[${index}].id`),
      model: requireText(model.model, `Codex model/list result.data[${index}].model`),
      displayName: requireText(model.displayName, `Codex model/list result.data[${index}].displayName`),
      hidden: requireBoolean(model.hidden, `Codex model/list result.data[${index}].hidden`),
      isDefault: requireBoolean(model.isDefault, `Codex model/list result.data[${index}].isDefault`),
    };
  });
  const nextCursor = result.nextCursor === null || result.nextCursor === undefined
    ? null
    : requireText(result.nextCursor, "Codex model/list result.nextCursor");
  return { data, nextCursor };
}

export async function listCodexModels(session: CodexAppServerSession): Promise<CodexModelCatalogEntry[]> {
  const models: CodexModelCatalogEntry[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 20; page += 1) {
    const result = await requestModelPage(session, cursor, page);
    models.push(...result.data.filter((model) => !model.hidden));
    if (!result.nextCursor) return models;
    cursor = result.nextCursor;
  }
  throw new Error("Codex model/list pagination exceeded the Livariant safety bound.");
}
