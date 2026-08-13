import type { ProviderContextProvider } from "../runtime/provider-context.js";

export interface ProviderContextCliArgs {
  provider: ProviderContextProvider;
  taskPath: string;
  json: boolean;
}

function valueAfter(args: string[], flag: string): string {
  const positions = args.map((value, index) => value === flag ? index : -1).filter((index) => index >= 0);
  if (positions.length !== 1) throw new Error(`${flag} must be supplied exactly once.`);
  const value = args[positions[0] + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value.`);
  return value;
}

export function parseProviderContextArgs(args: string[]): ProviderContextCliArgs {
  const providerValue = valueAfter(args, "--provider");
  const taskPath = valueAfter(args, "--task");
  if (providerValue !== "claude-code" && providerValue !== "codex") throw new Error("Unsupported provider context target.");
  const jsonCount = args.filter((value) => value === "--json").length;
  if (jsonCount > 1) throw new Error("--json may be supplied at most once.");
  const allowed = new Set(["--provider", providerValue, "--task", taskPath, "--json"]);
  if (args.some((value) => !allowed.has(value))) throw new Error("Unsupported provider context argument.");
  return { provider: providerValue, taskPath, json: jsonCount === 1 };
}
