import { readFile } from "node:fs/promises";

export const PROVIDER_CONTEXT_TASK_MAX_BYTES = 64 * 1024;

export async function readProviderContextTaskFile(path: string): Promise<string> {
  const bytes = await readFile(path);
  if (bytes.length === 0) throw new Error("Provider context task input must not be empty.");
  if (bytes.length > PROVIDER_CONTEXT_TASK_MAX_BYTES) throw new Error("Provider context task input exceeds the supported size limit.");
  const text = bytes.toString("utf8").trim();
  if (!text) throw new Error("Provider context task input must contain non-whitespace text.");
  return text;
}
