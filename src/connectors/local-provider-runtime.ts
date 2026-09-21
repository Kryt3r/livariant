import { spawnSync } from "node:child_process";
import {
  launchWithManualPath,
  resolveLocalCli,
  type LocalCliLaunch,
  type ResolveLocalCliOptions,
} from "./local-cli-command.js";

export type LocalProviderId = "claude" | "gemini" | "custom";
export type LocalProviderInstallationState = "available" | "not-found" | "unusable";
export type LocalProviderAuthState = "authenticated" | "configured" | "unknown" | "unavailable";

export interface LocalProviderInspection {
  provider: LocalProviderId;
  installationState: LocalProviderInstallationState;
  authState: LocalProviderAuthState;
  command: string;
  argsPrefix: readonly string[];
  launchSource: LocalCliLaunch["source"];
  version?: string;
  detail?: string;
}

export interface LocalProviderProbeResult {
  status: number | null;
  stdout: string;
  stderr: string;
  errorCode?: string;
  errorMessage?: string;
}

export type LocalProviderProbe = (
  command: string,
  args: readonly string[],
) => LocalProviderProbeResult;

function defaultProbe(command: string, args: readonly string[]): LocalProviderProbeResult {
  const result = spawnSync(command, [...args], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    timeout: 10_000,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    errorCode: result.error && "code" in result.error
      ? String((result.error as NodeJS.ErrnoException).code)
      : undefined,
    errorMessage: result.error?.message,
  };
}

function versionFrom(output: string): string | undefined {
  return /\b(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)\b/.exec(output)?.[1];
}

function inspectVersion(
  provider: LocalProviderId,
  launch: LocalCliLaunch,
  versionArgs: readonly string[],
  probe: LocalProviderProbe,
): LocalProviderInspection {
  const result = probe(launch.command, [...launch.argsPrefix, ...versionArgs]);
  if (result.errorCode === "ENOENT") {
    return {
      provider,
      installationState: "not-found",
      authState: "unavailable",
      command: launch.command,
      argsPrefix: launch.argsPrefix,
      launchSource: launch.source,
      detail: result.errorMessage ?? "Provider CLI executable was not found.",
    };
  }
  if (result.errorCode !== undefined || result.status !== 0) {
    return {
      provider,
      installationState: "unusable",
      authState: "unavailable",
      command: launch.command,
      argsPrefix: launch.argsPrefix,
      launchSource: launch.source,
      detail: result.errorMessage ?? (result.stderr.trim() || result.stdout.trim() || `exit ${String(result.status)}`),
    };
  }
  const version = versionFrom(`${result.stdout}\n${result.stderr}`);
  return {
    provider,
    installationState: "available",
    authState: "unknown",
    command: launch.command,
    argsPrefix: launch.argsPrefix,
    launchSource: launch.source,
    ...(version ? { version } : { detail: "Provider CLI responded, but no semantic version could be identified." }),
  };
}

export interface InspectBundledProviderOptions {
  provider: "claude" | "gemini";
  manualPath?: string;
  probe?: LocalProviderProbe;
  resolveOptions?: Partial<Omit<ResolveLocalCliOptions, "commandName">>;
}
function defaultWindowsProviderCandidates(provider: "claude" | "gemini"): string[] {
  if (process.platform !== "win32") return [];
  const result: string[] = [];
  const userProfile = process.env.USERPROFILE?.trim() || process.env.HOME?.trim();
  const localAppData = process.env.LOCALAPPDATA?.trim();

  if (provider === "claude") {
    if (userProfile) result.push(`${userProfile}\\.local\\bin\\claude.exe`);
    if (localAppData) result.push(`${localAppData}\\Programs\\Claude Code\\claude.exe`);
  }
  return result;
}


export function inspectBundledLocalProvider(options: InspectBundledProviderOptions): LocalProviderInspection {
  const probe = options.probe ?? defaultProbe;
  const launch = options.manualPath
    ? launchWithManualPath(options.manualPath, options.resolveOptions?.nodeExecutable)
    : resolveLocalCli({
        commandName: options.provider === "claude" ? "claude" : "gemini",
        nativeWindowsBasenames: options.provider === "claude" ? ["claude.exe"] : ["gemini.exe"],
        npmPackages: options.provider === "claude"
          ? [{ packagePath: ["@anthropic-ai", "claude-code"], entrypoints: ["dist\\cli.js", "cli.js", "dist\\index.js"] }]
          : [{ packagePath: ["@google", "gemini-cli"], entrypoints: ["bundle\\gemini.js", "dist\\index.js", "dist\\gemini.js"] }],
        ...options.resolveOptions,
        additionalWindowsCandidates: [
          ...defaultWindowsProviderCandidates(options.provider),
          ...(options.resolveOptions?.additionalWindowsCandidates ?? []),
        ],
      });

  if (!launch) {
    return {
      provider: options.provider,
      installationState: "not-found",
      authState: "unavailable",
      command: options.provider,
      argsPrefix: [],
      launchSource: "path-command",
      detail: `${options.provider === "claude" ? "Claude Code" : "Gemini CLI"} executable could not be resolved without a shell.`,
    };
  }

  const inspected = inspectVersion(options.provider, launch, ["--version"], probe);
  if (inspected.installationState !== "available") return inspected;

  if (options.provider === "claude") {
    const auth = probe(launch.command, [...launch.argsPrefix, "auth", "status"]);
    return {
      ...inspected,
      authState: auth.status === 0 && auth.errorCode === undefined ? "authenticated" : "unavailable",
      ...(auth.status === 0 && auth.errorCode === undefined
        ? {}
        : { detail: auth.errorMessage ?? (auth.stderr.trim() || auth.stdout.trim() || "Claude Code is installed but not authenticated.") }),
    };
  }

  return {
    ...inspected,
    authState: "configured",
    detail: inspected.detail ?? "Gemini CLI is installed. Authentication is owned by the local Gemini CLI and is verified when the user starts a provider operation.",
  };
}

type CustomProbePayload = {
  schemaVersion: 1;
  ready: boolean;
  displayName?: string;
  version?: string;
};

function parseCustomProbe(stdout: string): CustomProbePayload {
  const line = stdout.trim();
  if (!line) throw new Error("Custom provider probe returned no JSON.");
  const value = JSON.parse(line) as unknown;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Custom provider probe must return a JSON object.");
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== 1 || typeof record.ready !== "boolean") {
    throw new Error("Custom provider probe schema is invalid.");
  }
  if (record.displayName !== undefined && (typeof record.displayName !== "string" || !record.displayName.trim())) {
    throw new Error("Custom provider displayName must be non-blank when present.");
  }
  if (record.version !== undefined && (typeof record.version !== "string" || !record.version.trim())) {
    throw new Error("Custom provider version must be non-blank when present.");
  }
  return {
    schemaVersion: 1,
    ready: record.ready,
    ...(typeof record.displayName === "string" ? { displayName: record.displayName.trim() } : {}),
    ...(typeof record.version === "string" ? { version: record.version.trim() } : {}),
  };
}

export function inspectCustomLocalProvider(
  manualPath: string,
  probe: LocalProviderProbe = defaultProbe,
  nodeExecutable = process.execPath,
): LocalProviderInspection {
  const launch = launchWithManualPath(manualPath, nodeExecutable);
  const result = probe(launch.command, [...launch.argsPrefix, "--livariant-provider-probe"]);
  if (result.errorCode === "ENOENT") {
    return {
      provider: "custom",
      installationState: "not-found",
      authState: "unavailable",
      command: launch.command,
      argsPrefix: launch.argsPrefix,
      launchSource: launch.source,
      detail: result.errorMessage ?? "Custom provider executable was not found.",
    };
  }
  if (result.errorCode !== undefined || result.status !== 0) {
    return {
      provider: "custom",
      installationState: "unusable",
      authState: "unavailable",
      command: launch.command,
      argsPrefix: launch.argsPrefix,
      launchSource: launch.source,
      detail: result.errorMessage ?? (result.stderr.trim() || result.stdout.trim() || `exit ${String(result.status)}`),
    };
  }

  try {
    const payload = parseCustomProbe(result.stdout);
    return {
      provider: "custom",
      installationState: payload.ready ? "available" : "unusable",
      authState: payload.ready ? "configured" : "unavailable",
      command: launch.command,
      argsPrefix: launch.argsPrefix,
      launchSource: launch.source,
      ...(payload.version ? { version: payload.version } : {}),
      detail: payload.ready
        ? `${payload.displayName ?? "Custom provider"} reported ready through the Livariant local provider bridge.`
        : `${payload.displayName ?? "Custom provider"} reported that it is not ready.`,
    };
  } catch (error) {
    return {
      provider: "custom",
      installationState: "unusable",
      authState: "unavailable",
      command: launch.command,
      argsPrefix: launch.argsPrefix,
      launchSource: launch.source,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
