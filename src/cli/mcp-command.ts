import {
  MCP_STDIO_MESSAGE_MAX_BYTES,
  createMcpSession,
  jsonRpcOversizeError,
  jsonRpcParseError,
  parseMcpJsonLine,
  type JsonRpcResponse,
} from "../mcp/server.js";

const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

function writeMessage(message: JsonRpcResponse): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

export async function handleMcpCommand(args: readonly string[]): Promise<void> {
  if (args.length !== 0) throw new Error("Usage: livariant mcp");

  const session = createMcpSession(process.cwd());
  let pending = Buffer.alloc(0);
  let droppingOversize = false;
  let queue: Promise<void> = Promise.resolve();

  const enqueueLine = (line: Buffer): void => {
    queue = queue.then(async () => {
      let normalized = line;
      if (normalized.length > 0 && normalized[normalized.length - 1] === 0x0d) {
        normalized = normalized.subarray(0, normalized.length - 1);
      }
      let value: unknown;
      try {
        const decoded = utf8Decoder.decode(normalized);
        value = parseMcpJsonLine(decoded);
      } catch {
        writeMessage(jsonRpcParseError());
        return;
      }
      const result = await session.handleMessage(value);
      if (result) writeMessage(result);
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown MCP runtime failure";
      process.stderr.write(`Livariant MCP runtime error: ${message}\n`);
      process.exitCode = 1;
    });
  };

  process.stdin.on("data", (value: Buffer | string) => {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
    let offset = 0;

    while (offset < chunk.length) {
      const newline = chunk.indexOf(0x0a, offset);
      const end = newline === -1 ? chunk.length : newline;
      const segment = chunk.subarray(offset, end);

      if (droppingOversize) {
        if (newline !== -1) {
          droppingOversize = false;
          writeMessage(jsonRpcOversizeError());
        }
      } else if (pending.length + segment.length > MCP_STDIO_MESSAGE_MAX_BYTES) {
        pending = Buffer.alloc(0);
        if (newline === -1) {
          droppingOversize = true;
        } else {
          writeMessage(jsonRpcOversizeError());
        }
      } else {
        pending = pending.length === 0 ? Buffer.from(segment) : Buffer.concat([pending, segment]);
        if (newline !== -1) {
          const line = pending;
          pending = Buffer.alloc(0);
          enqueueLine(line);
        }
      }

      if (newline === -1) break;
      offset = newline + 1;
    }
  });

  process.stdin.on("error", (error: Error) => {
    process.stderr.write(`Livariant MCP stdin error: ${error.message}\n`);
    process.exitCode = 1;
  });

  await new Promise<void>((resolve) => {
    process.stdin.on("end", () => {
      if (droppingOversize) {
        writeMessage(jsonRpcOversizeError());
      } else if (pending.length > 0) {
        pending = Buffer.alloc(0);
        writeMessage(jsonRpcParseError());
      }
      void queue.finally(resolve);
    });
    process.stdin.resume();
  });
}
