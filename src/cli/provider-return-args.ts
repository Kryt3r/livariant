export interface ProviderReturnCliArgs {
  contextPath: string;
  inputPath: string;
  authorizationId?: string;
  json: boolean;
}

export function parseProviderReturnArgs(args: string[]): ProviderReturnCliArgs {
  let contextPath: string | null = null;
  let inputPath: string | null = null;
  let authorizationId: string | undefined;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--context") {
      if (contextPath !== null) throw new Error("--context must be supplied exactly once.");
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--context requires a Provider Context file path.");
      contextPath = value;
      index += 1;
      continue;
    }
    if (token === "--input") {
      if (inputPath !== null) throw new Error("--input must be supplied exactly once.");
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--input requires a provider-return file path.");
      inputPath = value;
      index += 1;
      continue;
    }
    if (token === "--authorization") {
      if (authorizationId !== undefined) throw new Error("--authorization may be supplied at most once.");
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--authorization requires an authorization id.");
      authorizationId = value;
      index += 1;
      continue;
    }
    if (token === "--json") {
      if (json) throw new Error("--json may be supplied at most once.");
      json = true;
      continue;
    }
    throw new Error("Unsupported provider return argument.");
  }

  if (contextPath === null) throw new Error("--context must be supplied exactly once.");
  if (inputPath === null) throw new Error("--input must be supplied exactly once.");
  return { contextPath, inputPath, authorizationId, json };
}
