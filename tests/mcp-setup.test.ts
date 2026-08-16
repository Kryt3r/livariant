import assert from "node:assert/strict";
import test from "node:test";
import { buildMcpSetupPlan, parseMcpSetupArgs, renderMcpSetupPlan } from "../src/cli/mcp-setup.js";
import { MCP_CONTEXT_TOOL, MCP_RETURN_TOOL, MCP_SERVER_INSTRUCTIONS, createMcpSession } from "../src/mcp/server.js";

test("Claude Code setup renders current native stdio registration without writing provider config", () => {
  const parsed = parseMcpSetupArgs(["--provider", "claude-code"]);
  assert.deepEqual(parsed, { provider: "claude-code", json: false });
  const plan = buildMcpSetupPlan(parsed.provider, "/tmp/project");
  assert.equal(plan.mutatesProviderConfiguration, false);
  assert.equal(plan.registrationCommand, "claude mcp add --transport stdio --scope local livariant -- livariant mcp");
  assert.equal(plan.projectScopedConfig, undefined);
  assert.match(renderMcpSetupPlan(plan), /zero provider-configuration writes/);
});

test("Codex setup renders native CLI registration plus a project-bound TOML option", () => {
  const parsed = parseMcpSetupArgs(["--json", "--provider", "codex"]);
  assert.deepEqual(parsed, { provider: "codex", json: true });
  const plan = buildMcpSetupPlan(parsed.provider, "C:\\work\\livariant demo");
  assert.equal(plan.mutatesProviderConfiguration, false);
  assert.equal(plan.registrationCommand, "codex mcp add livariant -- livariant mcp");
  assert.match(plan.projectScopedConfig ?? "", /\[mcp_servers\.livariant\]/);
  assert.match(plan.projectScopedConfig ?? "", /enabled_tools = \["livariant_provider_context", "livariant_provider_return"\]/);
  assert.match(plan.projectScopedConfig ?? "", /cwd = "C:\\\\work\\\\livariant demo"/);
});

test("MCP setup parsing rejects ambiguous or unsupported setup requests", () => {
  assert.throws(() => parseMcpSetupArgs([]), /Usage:/);
  assert.throws(() => parseMcpSetupArgs(["--provider", "unknown"]), /claude-code or codex/);
  assert.throws(() => parseMcpSetupArgs(["--provider", "codex", "--apply"]), /Usage:/);
});

test("server instructions describe context-return workflow without expanding the tool or Authority surface", async () => {
  assert.match(MCP_SERVER_INSTRUCTIONS, /livariant_provider_context first/);
  assert.match(MCP_SERVER_INSTRUCTIONS, /livariant_provider_return/);
  assert.match(MCP_SERVER_INSTRUCTIONS, /cannot create, discover, select, consume/);
  assert.match(MCP_SERVER_INSTRUCTIONS, /cannot perform canonical semantic mutation/);

  const session = createMcpSession("/tmp/livariant-mcp-guidance-test");
  const initialized = await session.handleMessage({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "guidance-test", version: "1" },
    },
  });
  assert.ok(initialized && "result" in initialized);
  if (!initialized || !("result" in initialized)) return;
  const result = initialized.result as { instructions?: string };
  assert.equal(result.instructions, MCP_SERVER_INSTRUCTIONS);

  await session.handleMessage({ jsonrpc: "2.0", method: "notifications/initialized" });
  const listed = await session.handleMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  assert.ok(listed && "result" in listed);
  if (!listed || !("result" in listed)) return;
  const tools = (listed.result as { tools: Array<{ name: string; inputSchema: { properties?: Record<string, unknown> } }> }).tools;
  assert.deepEqual(tools.map((tool) => tool.name), [MCP_CONTEXT_TOOL, MCP_RETURN_TOOL]);
  assert.equal("authorization" in (tools[1]?.inputSchema.properties ?? {}), false);
  assert.equal("authorizationId" in (tools[1]?.inputSchema.properties ?? {}), false);
});
