import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import {
  CODEX_APP_SERVER_CONNECTOR,
  CODEX_APP_SERVER_LAUNCH,
  createCodexInitializedNotification,
  createCodexInitializeRequest,
  parseCodexAppServerLine,
} from "./codex-app-server.js";
import type { ConnectorInstance } from "./connector-registry.js";

export type CodexInstallationState = "available" | "not-found" | "unusable";

export interface CodexInstallationInspection {
  state: CodexInstallationState;
  command: string;
  version?: string;
  evidence: "codex --version";
  detail?: string;
}

export interface CodexVersionProbeResult {
  status: number | null;
  stdout: string;
  stderr: string;
  errorCode?: string;
  errorMessage?: string;
}

export type CodexVersionProbe = (command: string) => CodexVersionProbeResult;

const VERSION_PATTERN = /\b(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)\b/;

function defaultVersionProbe(command: string): CodexVersionProbeResult {
  const result = spawnSync(command, ["--version"], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
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

export function inspectCodexInstallation(
  command = "codex",
  probe: CodexVersionProbe = defaultVersionProbe,
): CodexInstallationInspection {
  if (command.trim().length === 0) throw new Error("Codex command must not be blank.");

  const result = probe(command);
  if (result.errorCode === "ENOENT") {
    return {
      state: "not-found",
      command,
      evidence: "codex --version",
      detail: result.errorMessage ?? "Codex executable was not found.",
    };
  }

  if (result.errorCode !== undefined || result.status !== 0) {
    const detail = result.errorMessage ?? (result.stderr.trim() || result.stdout.trim() || `exit ${String(result.status)}`);
    return { state: "unusable", command, evidence: "codex --version", detail };
  }

  const output = `${result.stdout}\n${result.stderr}`;
  const version = VERSION_PATTERN.exec(output)?.[1];
  return {
    state: "available",
    command,
    evidence: "codex --version",
    ...(version === undefined ? {} : { version }),
    ...(version === undefined ? { detail: "Codex responded, but no semantic version could be identified." } : {}),
  };
}

export interface CodexHandshakeEvidence {
  state: "connected";
  observedAt: string;
  connectorTypeId: "openai.codex.app-server";
  installationVersion?: string;
  initializeRequestId: number;
  server: {
    userAgent?: string;
    codexHome?: string;
    platformFamily?: string;
    platformOs?: string;
  };
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function resetCapabilities(instance: ConnectorInstance): void {
  instance.observedCapabilities = Object.fromEntries(
    Object.keys(instance.observedCapabilities).map((capability) => [capability, "unknown" as const]),
  );
}

export class CodexAppServerHandshake {
  readonly #requestId: number;
  readonly #installation: CodexInstallationInspection;
  #state: "created" | "initialize-sent" | "connected" | "failed" = "created";

  constructor(installation: CodexInstallationInspection, requestId = 0) {
    if (installation.state !== "available") {
      throw new Error("Codex App Server handshake requires an available Codex installation.");
    }
    if (!Number.isSafeInteger(requestId) || requestId < 0) {
      throw new Error("Codex handshake request id must be a non-negative safe integer.");
    }
    this.#installation = { ...installation };
    this.#requestId = requestId;
  }

  get state(): "created" | "initialize-sent" | "connected" | "failed" {
    return this.#state;
  }

  begin(clientVersion: string): string {
    if (this.#state !== "created") {
      throw new Error("Codex App Server initialize request can only be sent once per handshake.");
    }
    this.#state = "initialize-sent";
    return JSON.stringify(createCodexInitializeRequest(clientVersion, this.#requestId));
  }

  acceptInitializeResponse(line: string, observedAt = new Date().toISOString()): {
    initializedNotification: string;
    evidence: CodexHandshakeEvidence;
    connector: ConnectorInstance;
  } {
    if (this.#state !== "initialize-sent") {
      throw new Error("Codex initialize response is not expected in the current handshake state.");
    }

    try {
      const message = parseCodexAppServerLine(line);
      if (message.id !== this.#requestId) {
        throw new Error("Codex initialize response id does not match the outstanding request.");
      }
      if (message.error !== undefined) throw new Error("Codex App Server rejected initialization.");
      if (typeof message.result !== "object" || message.result === null || Array.isArray(message.result)) {
        throw new Error("Codex initialize response must contain a result object.");
      }
      if (Number.isNaN(Date.parse(observedAt))) {
        throw new Error("Codex handshake observation timestamp must be valid ISO-compatible time.");
      }

      const result = message.result as Record<string, unknown>;
      const userAgent = optionalText(result.userAgent);
      const codexHome = optionalText(result.codexHome);
      const platformFamily = optionalText(result.platformFamily);
      const platformOs = optionalText(result.platformOs);
      const evidence: CodexHandshakeEvidence = {
        state: "connected",
        observedAt: new Date(observedAt).toISOString(),
        connectorTypeId: "openai.codex.app-server",
        initializeRequestId: this.#requestId,
        ...(this.#installation.version === undefined ? {} : { installationVersion: this.#installation.version }),
        server: {
          ...(userAgent === undefined ? {} : { userAgent }),
          ...(codexHome === undefined ? {} : { codexHome }),
          ...(platformFamily === undefined ? {} : { platformFamily }),
          ...(platformOs === undefined ? {} : { platformOs }),
        },
      };

      this.#state = "connected";
      return {
        initializedNotification: JSON.stringify(createCodexInitializedNotification()),
        evidence,
        connector: {
          instanceId: "codex-local",
          connectorTypeId: CODEX_APP_SERVER_CONNECTOR.typeId,
          label: "Local Codex",
          state: "connected",
          observedCapabilities: {
            "task.execute": "unknown",
            "session.resume": "unknown",
            "approval.bidirectional": "unknown",
            "telemetry.usage.provider-owned": "unknown",
          },
          roles: [],
        },
      };
    } catch (error) {
      this.#state = "failed";
      throw error;
    }
  }
}

export interface CodexLineTransport {
  write(line: string): void;
  onLine(listener: (line: string) => void): () => void;
  onError(listener: (error: Error) => void): () => void;
  onExit(listener: (code: number | null, signal: NodeJS.Signals | null) => void): () => void;
  close(): void;
}

export type CodexTransportFactory = (command: string) => CodexLineTransport;

function defaultTransportFactory(command: string): CodexLineTransport {
  const child = spawn(command, [...CODEX_APP_SERVER_LAUNCH.args], {
    shell: false,
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });

  return {
    write(line) {
      if (child.stdin.destroyed || !child.stdin.writable) throw new Error("Codex App Server stdin is not writable.");
      child.stdin.write(`${line}\n`, "utf8");
    },
    onLine(listener) {
      lines.on("line", listener);
      return () => lines.off("line", listener);
    },
    onError(listener) {
      child.on("error", listener);
      return () => child.off("error", listener);
    },
    onExit(listener) {
      child.on("exit", listener);
      return () => child.off("exit", listener);
    },
    close() {
      lines.close();
      if (!child.stdin.destroyed) child.stdin.end();
      if (!child.killed) child.kill();
    },
  };
}

export interface CodexAppServerSession {
  evidence: CodexHandshakeEvidence;
  connector: ConnectorInstance;
  isOpen(): boolean;
  send(message: Record<string, unknown>): void;
  onMessage(listener: (message: Record<string, unknown>) => void): () => void;
  onDisconnect(listener: (reason: string) => void): () => void;
  close(): void;
}

export interface ConnectCodexAppServerOptions {
  clientVersion: string;
  command?: string;
  requestId?: number;
  timeoutMs?: number;
  versionProbe?: CodexVersionProbe;
  transportFactory?: CodexTransportFactory;
  now?: () => string;
}

export async function connectCodexAppServer(options: ConnectCodexAppServerOptions): Promise<CodexAppServerSession> {
  const command = options.command ?? CODEX_APP_SERVER_LAUNCH.command;
  const installation = inspectCodexInstallation(command, options.versionProbe ?? defaultVersionProbe);
  if (installation.state !== "available") throw new Error(`Codex is not connectable: ${installation.state}.`);

  const timeoutMs = options.timeoutMs ?? 5000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error("Codex handshake timeout must be a positive safe integer.");
  }

  const handshake = new CodexAppServerHandshake(installation, options.requestId ?? 0);
  const transport = (options.transportFactory ?? defaultTransportFactory)(command);
  const messageListeners = new Set<(message: Record<string, unknown>) => void>();
  const disconnectListeners = new Set<(reason: string) => void>();

  return await new Promise<CodexAppServerSession>((resolve, reject) => {
    let promiseSettled = false;
    let connected = false;
    let runtimeOpen = true;
    let connector: ConnectorInstance | undefined;

    const timeout = setTimeout(() => failBeforeConnect(new Error("Codex App Server initialize handshake timed out.")), timeoutMs);

    const unsubscribeLine = transport.onLine((line) => {
      if (!connected) {
        if (promiseSettled) return;
        try {
          const result = handshake.acceptInitializeResponse(line, (options.now ?? (() => new Date().toISOString()))());
          transport.write(result.initializedNotification);
          connector = result.connector;
          connected = true;
          promiseSettled = true;
          clearTimeout(timeout);

          const session: CodexAppServerSession = {
            evidence: result.evidence,
            connector,
            isOpen() {
              return runtimeOpen;
            },
            send(message) {
              if (!runtimeOpen) throw new Error("Codex App Server session is closed.");
              transport.write(JSON.stringify(message));
            },
            onMessage(listener) {
              if (!runtimeOpen) throw new Error("Codex App Server session is closed.");
              messageListeners.add(listener);
              return () => messageListeners.delete(listener);
            },
            onDisconnect(listener) {
              if (!runtimeOpen) throw new Error("Codex App Server session is closed.");
              disconnectListeners.add(listener);
              return () => disconnectListeners.delete(listener);
            },
            close() {
              if (!runtimeOpen) return;
              runtimeOpen = false;
              connector!.state = "disconnected";
              resetCapabilities(connector!);
              unsubscribeLine();
              unsubscribeError();
              unsubscribeExit();
              messageListeners.clear();
              disconnectListeners.clear();
              transport.close();
            },
          };
          resolve(session);
        } catch (error) {
          failBeforeConnect(error instanceof Error ? error : new Error(String(error)));
        }
        return;
      }

      if (!runtimeOpen) return;
      try {
        const message = parseCodexAppServerLine(line);
        for (const listener of messageListeners) listener(message);
      } catch {
        // Malformed runtime lines are drained but never promoted to trusted connector evidence.
      }
    });

    const unsubscribeError = transport.onError((error) => {
      if (!connected) {
        failBeforeConnect(new Error(`Codex App Server process error: ${error.message}`));
        return;
      }
      disconnectAfterConnect(`process-error: ${error.message}`);
    });

    const unsubscribeExit = transport.onExit((code, signal) => {
      const reason = `process-exit: ${String(code ?? signal ?? "unknown")}`;
      if (!connected) {
        failBeforeConnect(new Error(`Codex App Server exited before initialization (${String(code ?? signal ?? "unknown")}).`));
        return;
      }
      disconnectAfterConnect(reason);
    });

    function cleanupListeners(): void {
      unsubscribeLine();
      unsubscribeError();
      unsubscribeExit();
    }

    function failBeforeConnect(error: Error): void {
      if (promiseSettled) return;
      promiseSettled = true;
      runtimeOpen = false;
      clearTimeout(timeout);
      cleanupListeners();
      transport.close();
      reject(error);
    }

    function disconnectAfterConnect(reason: string): void {
      if (!runtimeOpen) return;
      runtimeOpen = false;
      connector!.state = "error";
      resetCapabilities(connector!);
      clearTimeout(timeout);
      cleanupListeners();
      messageListeners.clear();
      transport.close();
      for (const listener of disconnectListeners) listener(reason);
      disconnectListeners.clear();
    }

    try {
      transport.write(handshake.begin(options.clientVersion));
    } catch (error) {
      failBeforeConnect(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
