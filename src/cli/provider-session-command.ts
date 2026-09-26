import { readFileSync } from "node:fs";
import { appendProviderHookObservation, parseProviderHookObservation, type HookEvidenceProvider } from "../connectors/provider-hook-observation.js";

function parseProvider(args: readonly string[]): HookEvidenceProvider {
  if (args.length !== 2 || args[0] !== "--provider" || (args[1] !== "claude" && args[1] !== "gemini")) {
    throw new Error("Usage: livariant provider-session observe --provider <claude|gemini>");
  }
  return args[1];
}

function hookSetup(provider: HookEvidenceProvider): Record<string, unknown> {
  const command = provider === "claude"
    ? "livariant provider-session observe --provider claude"
    : "livariant provider-session observe --provider gemini";
  return {
    schemaVersion: 1,
    provider,
    mutatesProviderConfiguration: false,
    command,
    recommendedEvents: ["SessionStart", "SessionEnd"],
    notes: [
      "Livariant does not install this hook automatically.",
      "Configure the command through the provider's own hook settings if you want session evidence captured while Livariant Desktop is closed.",
      "The hook stores bounded machine-local correlation evidence only: provider session id, cwd, transcript path, event name and timestamps.",
      "Hook evidence is never Project Truth and grants no Authority.",
    ],
  };
}

export async function handleProviderSessionCommand(args: readonly string[]): Promise<void> {
  const action = args[0];
  if (action === "observe") {
    const provider = parseProvider(args.slice(1));
    const raw = readFileSync(0, "utf8");
    const observation = parseProviderHookObservation(provider, raw);
    await appendProviderHookObservation(observation);
    return;
  }
  if (action === "setup") {
    const provider = parseProvider(args.slice(1));
    process.stdout.write(`${JSON.stringify(hookSetup(provider), null, 2)}\n`);
    return;
  }
  throw new Error("Usage: livariant provider-session <observe|setup> --provider <claude|gemini>");
}
