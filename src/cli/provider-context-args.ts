import type { ProviderContextProvider } from "../runtime/provider-context.js";

export interface ProviderContextCliArgs {
  provider: ProviderContextProvider;
  taskPath: string;
  json: boolean;
}

export function parseProviderContextArgs(args: string[]): ProviderContextCliArgs {
  let provider: ProviderContextProvider | null = null;
  let taskPath: string | null = null;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--provider") {
      if (provider !== null) throw new Error("--provider must be supplied exactly once.");
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--provider requires a value.");
      if (value !== "claude-code" && value !== "codex") throw new Error("Unsupported provider context target.");
      provider = value;
      index += 1;
      continue;
    }
    if (token === "--task") {
      if (taskPath !== null) throw new Error("--task must be supplied exactly once.");
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--task requires a value.");
      taskPath = value;
      index += 1;
      continue;
    }
    if (token === "--json") {
      if (json) throw new Error("--json may be supplied at most once.");
      json = true;
      continue;
    }
    throw new Error("Unsupported provider context argument.");
  }

  if (provider === null) throw new Error("--provider must be supplied exactly once.");
  if (taskPath === null) throw new Error("--task must be supplied exactly once.");
  return { provider, taskPath, json };
}
