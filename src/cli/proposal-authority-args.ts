export interface ProposalAuthorityCliArgs {
  inputPath: string;
  json: boolean;
}

export function parseProposalAuthorityArgs(args: string[]): ProposalAuthorityCliArgs {
  let inputPath: string | null = null;
  let json = false;
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--input") {
      if (inputPath !== null) throw new Error("--input must be supplied exactly once.");
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--input requires a file path.");
      inputPath = value;
      index += 1;
      continue;
    }
    if (token === "--json") {
      if (json) throw new Error("--json may be supplied at most once.");
      json = true;
      continue;
    }
    throw new Error("Unsupported proposal authority argument.");
  }
  if (inputPath === null) throw new Error("--input must be supplied exactly once.");
  return { inputPath, json };
}