import { readProviderContextTaskFile } from "../runtime/provider-context.js";
import { buildProtectedProviderContext } from "../runtime/protected-provider-context.js";
import { parseProviderContextArgs } from "./provider-context-args.js";
import { printProviderContext } from "./provider-context-output.js";

export async function handleProviderContextCommand(args: string[]): Promise<void> {
  let parsed;
  try {
    parsed = parseProviderContextArgs(args);
    const task = await readProviderContextTaskFile(parsed.taskPath);
    printProviderContext(await buildProtectedProviderContext(parsed.provider, task), parsed.json);
  } catch (error) {
    const json = args.includes("--json");
    const message = error instanceof Error ? error.message : "Provider context input is invalid.";
    if (json) console.log(JSON.stringify({ state: "invalid-input", error: { code: "provider-context-invalid", message }, changesMade: 0 }));
    else {
      console.log("Provider context input invalid");
      console.log(`Reason: ${message}`);
      console.log("Changes made: 0");
    }
    process.exitCode = 2;
  }
}
