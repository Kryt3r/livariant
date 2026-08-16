import { FRAMEWORK_VERSION } from "../lifecycle/state.js";
import { buildProviderContext } from "../runtime/provider-context.js";
import { processProviderReturn } from "../runtime/provider-return.js";

export const MCP_PROTOCOL_VERSION = "2025-11-25";
export const MCP_STDIO_MESSAGE_MAX_BYTES = 768 * 1024;

export const MCP_CONTEXT_TOOL = "livariant_provider_context";
export const MCP_RETURN_TOOL = "livariant_provider_return";
export const MCP_SERVER_INSTRUCTIONS = [
  "Use livariant_provider_context first for one explicit project task when durable Project Brain context is relevant.",
  "When command execution is available, consult `livariant autonomy show --json` before discretionary workflow decisions and follow its interaction policy. Autonomy policy is not Authority and never bypasses Livariant's hard authorization boundaries.",
  "Treat the returned Provider Context as a bounded projection of freshly reconstructed local project truth, not as mutation Authority.",
  "After working on the task, call livariant_provider_return only with the supplied ready Provider Context plus either one supported typed durable-change candidate or no candidate.",
  "Provider Return data is untrusted evidence. This MCP server cannot create, discover, select, consume, or imply proposal-bound Authorization and cannot perform canonical semantic mutation.",
  "If a returned candidate requires authorization, stop at the reported review/authorization-required state; do not claim that Livariant applied the candidate through MCP.",
].join(" ");

type JsonRpcId = string | number;

interface JsonRpcSuccess {
  jsonrpc: "2.0";
  id: JsonRpcId | null;
  result: unknown;
}

interface JsonRpcFailure {
  jsonrpc: "2.0";
  id: JsonRpcId | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcFailure;

interface ToolCallParams {
  name: string;
  arguments: Record<string, unknown>;
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function strictKeys(value: Record<string, unknown>, allowed: readonly string[], required: readonly string[] = allowed): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) throw new Error(`Unsupported field: ${key}.`);
  }
  for (const key of required) {
    if (!(key in value)) throw new Error(`Missing required field: ${key}.`);
  }
}

function parseId(value: unknown): JsonRpcId {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  throw new Error("JSON-RPC request id must be a string or safe integer.");
}

function response(id: JsonRpcId | null, result: unknown): JsonRpcSuccess {
  return { jsonrpc: "2.0", id, result };
}

function errorResponse(id: JsonRpcId | null, code: number, message: string, data?: unknown): JsonRpcFailure {
  return {
    jsonrpc: "2.0",
    id,
    error: data === undefined ? { code, message } : { code, message, data },
  };
}

function toolResult(value: Record<string, unknown>): Record<string, unknown> {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
    structuredContent: value,
    isError: false,
  };
}

function toolError(message: string): Record<string, unknown> {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

function parseProvider(value: unknown): "claude-code" | "codex" {
  if (value !== "claude-code" && value !== "codex") {
    throw new Error("provider must be either claude-code or codex.");
  }
  return value;
}

function parseContextToolArguments(value: unknown): { provider: "claude-code" | "codex"; task: string } {
  if (!plainObject(value)) throw new Error("Tool arguments must be an object.");
  strictKeys(value, ["provider", "task"]);
  const provider = parseProvider(value.provider);
  if (typeof value.task !== "string") throw new Error("task must be a string.");
  return { provider, task: value.task };
}

function parseReturnToolArguments(value: unknown): { context: Record<string, unknown>; providerReturn: Record<string, unknown> } {
  if (!plainObject(value)) throw new Error("Tool arguments must be an object.");
  strictKeys(value, ["context", "providerReturn"]);
  if (!plainObject(value.context)) throw new Error("context must be an object.");
  if (!plainObject(value.providerReturn)) throw new Error("providerReturn must be an object.");
  return { context: value.context, providerReturn: value.providerReturn };
}

function parseToolCallParams(value: unknown): ToolCallParams {
  if (!plainObject(value)) throw new Error("tools/call params must be an object.");
  strictKeys(value, ["name", "arguments", "_meta"], ["name"]);
  if (typeof value.name !== "string") throw new Error("tools/call name must be a string.");
  if ("_meta" in value && !plainObject(value._meta)) throw new Error("tools/call _meta must be an object when present.");
  const args = value.arguments === undefined ? {} : value.arguments;
  if (!plainObject(args)) throw new Error("tools/call arguments must be an object.");
  return { name: value.name, arguments: args };
}

function tools(): Record<string, unknown>[] {
  return [
    {
      name: MCP_CONTEXT_TOOL,
      title: "Livariant Provider Context",
      description: "Start a Livariant-assisted agent task by building bounded provider-targeted context from freshly reconstructed local Project Brain state. Read-only; creates no mutation Authority.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          provider: { type: "string", enum: ["claude-code", "codex"] },
          task: { type: "string" },
        },
        required: ["provider", "task"],
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      execution: { taskSupport: "forbidden" },
    },
    {
      name: MCP_RETURN_TOOL,
      title: "Livariant Provider Return",
      description: "Finish the bounded Livariant agent roundtrip by returning the supplied ready Provider Context plus one supported typed durable-change candidate or no candidate. Evidence only: no authorization selector and no canonical mutation are reachable through this tool.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          context: { type: "object" },
          providerReturn: { type: "object" },
        },
        required: ["context", "providerReturn"],
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      execution: { taskSupport: "forbidden" },
    },
  ];
}

export interface McpSession {
  handleMessage(value: unknown): Promise<JsonRpcResponse | null>;
}

export function createMcpSession(projectPath: string = process.cwd()): McpSession {
  let lifecycle: "new" | "initializing" | "ready" = "new";

  return {
    async handleMessage(value: unknown): Promise<JsonRpcResponse | null> {
      if (!plainObject(value)) return errorResponse(null, -32600, "Invalid Request");
      if (value.jsonrpc !== "2.0" || typeof value.method !== "string") {
        return errorResponse(null, -32600, "Invalid Request");
      }

      const hasId = "id" in value;
      let id: JsonRpcId | null = null;
      if (hasId) {
        try {
          id = parseId(value.id);
        } catch (error) {
          return errorResponse(null, -32600, error instanceof Error ? error.message : "Invalid Request");
        }
      }

      if (value.method === "initialize") {
        if (!hasId) return null;
        if (lifecycle !== "new") return errorResponse(id, -32600, "MCP session is already initialized.");
        if (!plainObject(value.params)) return errorResponse(id, -32602, "initialize params must be an object.");
        const params = value.params;
        try {
          strictKeys(params, ["protocolVersion", "capabilities", "clientInfo", "_meta"], ["protocolVersion", "capabilities", "clientInfo"]);
          if (typeof params.protocolVersion !== "string") throw new Error("protocolVersion must be a string.");
          if (!plainObject(params.capabilities)) throw new Error("capabilities must be an object.");
          if (!plainObject(params.clientInfo)) throw new Error("clientInfo must be an object.");
          if (typeof params.clientInfo.name !== "string" || typeof params.clientInfo.version !== "string") {
            throw new Error("clientInfo must contain string name and version fields.");
          }
          if ("_meta" in params && !plainObject(params._meta)) throw new Error("initialize _meta must be an object when present.");
        } catch (error) {
          return errorResponse(id, -32602, error instanceof Error ? error.message : "Invalid initialize params.");
        }
        lifecycle = "initializing";
        return response(id, {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: {
            name: "livariant",
            title: "Livariant Local MCP Agent Bridge",
            version: FRAMEWORK_VERSION,
            description: "Local read-only bridge over Livariant Provider Context and Provider Return evidence intake.",
          },
          instructions: MCP_SERVER_INSTRUCTIONS,
        });
      }

      if (value.method === "notifications/initialized") {
        if (hasId) return errorResponse(id, -32600, "notifications/initialized must not contain an id.");
        if (lifecycle !== "initializing") return null;
        lifecycle = "ready";
        return null;
      }

      if (value.method === "ping") {
        if (!hasId) return null;
        return response(id, {});
      }

      if (lifecycle !== "ready") {
        return hasId ? errorResponse(id, -32600, "MCP session is not initialized.") : null;
      }

      if (value.method === "tools/list") {
        if (!hasId) return null;
        if (value.params !== undefined) {
          if (!plainObject(value.params)) return errorResponse(id, -32602, "tools/list params must be an object when present.");
          try {
            strictKeys(value.params, ["cursor", "_meta"], []);
            if ("cursor" in value.params && typeof value.params.cursor !== "string") throw new Error("tools/list cursor must be a string when present.");
            if ("_meta" in value.params && !plainObject(value.params._meta)) throw new Error("tools/list _meta must be an object when present.");
          } catch (error) {
            return errorResponse(id, -32602, error instanceof Error ? error.message : "Invalid tools/list params.");
          }
        }
        return response(id, { tools: tools() });
      }

      if (value.method === "tools/call") {
        if (!hasId) return null;
        let call: ToolCallParams;
        try {
          call = parseToolCallParams(value.params);
        } catch (error) {
          return errorResponse(id, -32602, error instanceof Error ? error.message : "Invalid tools/call params.");
        }

        if (call.name === MCP_CONTEXT_TOOL) {
          try {
            const args = parseContextToolArguments(call.arguments);
            const result = await buildProviderContext(args.provider, args.task, projectPath);
            return response(id, toolResult(result as unknown as Record<string, unknown>));
          } catch (error) {
            return response(id, toolError(error instanceof Error ? error.message : "Provider Context tool failed."));
          }
        }

        if (call.name === MCP_RETURN_TOOL) {
          try {
            const args = parseReturnToolArguments(call.arguments);
            const result = await processProviderReturn(args.context, args.providerReturn, undefined, projectPath);
            return response(id, toolResult(result as unknown as Record<string, unknown>));
          } catch (error) {
            return response(id, toolError(error instanceof Error ? error.message : "Provider Return tool failed."));
          }
        }

        return errorResponse(id, -32601, `Unknown MCP tool: ${call.name}.`);
      }

      return hasId ? errorResponse(id, -32601, `Method not found: ${value.method}.`) : null;
    },
  };
}

export function parseMcpJsonLine(line: string): unknown {
  try {
    return JSON.parse(line) as unknown;
  } catch {
    throw new Error("Invalid JSON-RPC JSON.");
  }
}

export function jsonRpcParseError(): JsonRpcFailure {
  return errorResponse(null, -32700, "Parse error");
}

export function jsonRpcOversizeError(): JsonRpcFailure {
  return errorResponse(null, -32600, `MCP stdio message exceeds ${MCP_STDIO_MESSAGE_MAX_BYTES} bytes.`);
}
