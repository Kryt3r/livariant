export type McpSetupProvider = "claude-code" | "codex";

export interface McpSetupPlan {
  schemaVersion: 1;
  provider: McpSetupProvider;
  transport: "stdio";
  mutatesProviderConfiguration: false;
  registrationCommand: string;
  verificationCommands: string[];
  projectScopedConfig?: string;
  notes: string[];
}

function tomlString(value: string): string {
  return `"${value
    .replaceAll("\\", "\\\\")
    .replaceAll("\"", "\\\"")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")}"`;
}

export function buildMcpSetupPlan(provider: McpSetupProvider, projectPath: string = process.cwd()): McpSetupPlan {
  if (provider === "claude-code") {
    return {
      schemaVersion: 1,
      provider,
      transport: "stdio",
      mutatesProviderConfiguration: false,
      registrationCommand: "claude mcp add --transport stdio --scope local livariant -- livariant mcp",
      verificationCommands: ["claude mcp get livariant", "claude mcp list"],
      notes: [
        "Run the registration command from the Livariant project directory.",
        "Claude Code owns and applies its MCP configuration; Livariant only renders this command.",
        "The registered server still exposes only livariant_provider_context and livariant_provider_return and cannot create or consume mutation Authority.",
      ],
    };
  }

  const projectScopedConfig = [
    "[mcp_servers.livariant]",
    'command = "livariant"',
    'args = ["mcp"]',
    `cwd = ${tomlString(projectPath)}`,
    'enabled_tools = ["livariant_provider_context", "livariant_provider_return"]',
  ].join("\n");

  return {
    schemaVersion: 1,
    provider,
    transport: "stdio",
    mutatesProviderConfiguration: false,
    registrationCommand: "codex mcp add livariant -- livariant mcp",
    verificationCommands: ["codex mcp list"],
    projectScopedConfig,
    notes: [
      "The CLI registration command uses Codex's native MCP configuration surface.",
      "For an explicit project-bound setup, place the rendered TOML in the trusted project's .codex/config.toml.",
      "Livariant does not write either Codex configuration location; the user or Codex remains responsible for applying the configuration.",
      "The registered server still exposes only livariant_provider_context and livariant_provider_return and cannot create or consume mutation Authority.",
    ],
  };
}

export function parseMcpSetupArgs(args: readonly string[]): { provider: McpSetupProvider; json: boolean } {
  let provider: McpSetupProvider | undefined;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--provider") {
      if (provider !== undefined) throw new Error("--provider may be specified exactly once.");
      const value = args[index + 1];
      if (value !== "claude-code" && value !== "codex") {
        throw new Error("--provider must be claude-code or codex.");
      }
      provider = value;
      index += 1;
      continue;
    }
    throw new Error("Usage: livariant mcp setup --provider <claude-code|codex> [--json]");
  }

  if (!provider) throw new Error("Usage: livariant mcp setup --provider <claude-code|codex> [--json]");
  return { provider, json };
}

export function renderMcpSetupPlan(plan: McpSetupPlan): string {
  const lines = [
    `Livariant MCP setup for ${plan.provider}`,
    "",
    "Registration command:",
    plan.registrationCommand,
  ];

  if (plan.projectScopedConfig) {
    lines.push("", "Optional project-scoped Codex config (.codex/config.toml):", plan.projectScopedConfig);
  }

  lines.push("", "Verify:", ...plan.verificationCommands.map((command) => `- ${command}`));
  lines.push("", "Safety:", ...plan.notes.map((note) => `- ${note}`));
  lines.push("- This command only renders setup guidance; it performs zero provider-configuration writes.");
  return lines.join("\n");
}
