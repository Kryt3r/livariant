import { inspectExternalKnowledgeSource, parseExternalKnowledgeSourceKind } from "../external-knowledge/index.js";
import { escapeTerminalControlText } from "./understand-command.js";

interface ExternalSourceArgs {
  json: boolean;
  type: string;
  path: string;
}

function parseArgs(args: string[]): ExternalSourceArgs {
  if (args[0] !== "inspect") throw new Error("External-source requires subcommand: inspect.");
  let json = false;
  let type: string | undefined;
  let path: string | undefined;

  for (let i = 1; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--json") {
      if (json) throw new Error("External-source inspect accepts --json at most once.");
      json = true;
      continue;
    }
    if (arg === "--type" || arg === "--path") {
      const value = args[i + 1];
      if (!value || value.startsWith("--")) throw new Error(`External-source inspect ${arg} requires a value.`);
      if (arg === "--type") {
        if (type !== undefined) throw new Error("External-source inspect accepts --type at most once.");
        type = value;
      } else {
        if (path !== undefined) throw new Error("External-source inspect accepts --path at most once.");
        path = value;
      }
      i += 1;
      continue;
    }
    throw new Error(`Unknown external-source argument: ${arg}`);
  }

  if (!type) throw new Error("External-source inspect requires --type <source-type>.");
  if (!path) throw new Error("External-source inspect requires --path <source-path>.");
  return { json, type, path };
}

export async function handleExternalSourceCommand(args: string[]): Promise<void> {
  const parsed = parseArgs(args);
  const kind = parseExternalKnowledgeSourceKind(parsed.type);
  const bundle = await inspectExternalKnowledgeSource(kind, parsed.path);

  if (parsed.json) {
    console.log(JSON.stringify(bundle));
    return;
  }

  console.log("Read-only external knowledge source inspection");
  console.log("");
  console.log(`Source: ${escapeTerminalControlText(bundle.source.sourceId)}`);
  console.log(`Type: ${bundle.source.kind}`);
  console.log(`Location: ${escapeTerminalControlText(bundle.source.location)}`);
  console.log(`Evidence items: ${bundle.evidence.length}`);
  console.log(`Skipped materials: ${bundle.skipped.length}`);
  console.log("");
  console.log("Retrieved external evidence:");
  if (bundle.evidence.length === 0) console.log("- none");
  else for (const item of bundle.evidence) {
    console.log(`- ${escapeTerminalControlText(item.provenance.materialPath)} [external-evidence] sha256:${item.provenance.contentSha256}`);
  }
  console.log("");
  console.log("Skipped material:");
  if (bundle.skipped.length === 0) console.log("- none");
  else for (const item of bundle.skipped) {
    console.log(`- ${escapeTerminalControlText(item.materialPath)}: ${item.reason}`);
  }
  console.log("");
  console.log("External evidence is not Project Brain truth and grants no Authority.");
  console.log("Source changes made: 0");
  console.log("Project changes made: 0");
}
