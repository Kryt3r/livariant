export interface SemanticApplyCliArgs {
  authorizationId: string;
  inputPath: string;
  json: boolean;
}

export function parseSemanticApplyArgs(args: string[]): SemanticApplyCliArgs {
  let authorizationId: string | null = null;
  let inputPath: string | null = null;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--authorization") {
      if (authorizationId !== null) throw new Error("--authorization must be supplied exactly once.");
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--authorization requires an authorization id.");
      authorizationId = value;
      index += 1;
      continue;
    }
    if (token === "--input") {
      if (inputPath !== null) throw new Error("--input must be supplied exactly once.");
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--input requires an actionable proposal file path.");
      inputPath = value;
      index += 1;
      continue;
    }
    if (token === "--json") {
      if (json) throw new Error("--json may be supplied at most once.");
      json = true;
      continue;
    }
    throw new Error("Unsupported semantic apply argument.");
  }

  if (authorizationId === null) throw new Error("--authorization must be supplied exactly once.");
  if (inputPath === null) throw new Error("--input must be supplied exactly once.");
  return { authorizationId, inputPath, json };
}
