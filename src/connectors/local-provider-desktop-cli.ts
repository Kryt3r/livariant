import {
  inspectBundledLocalProvider,
  inspectCustomLocalProvider,
  type LocalProviderId,
} from "./local-provider-runtime.js";
import { providerCapabilityMatrix } from "./provider-capabilities.js";

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

const [operation, providerRaw, manualPathRaw] = process.argv.slice(2);
if (operation !== "inspect") fail("Local provider desktop CLI only supports inspect.");

const provider = providerRaw as LocalProviderId | undefined;
if (provider !== "claude" && provider !== "gemini" && provider !== "custom") {
  fail("Local provider desktop CLI provider is unsupported.");
}

const manualPath = manualPathRaw?.trim() || undefined;
const result = provider === "custom"
  ? manualPath
    ? inspectCustomLocalProvider(manualPath)
    : fail("Custom provider inspection requires an explicit executable path.")
  : inspectBundledLocalProvider({
      provider,
      ...(manualPath ? { manualPath } : {}),
    });

process.stdout.write(`${JSON.stringify({
  ...result,
  capabilities: providerCapabilityMatrix(
    provider,
    provider === "custom" ? result.customCapabilities : undefined,
  ).capabilities,
})}\n`);
