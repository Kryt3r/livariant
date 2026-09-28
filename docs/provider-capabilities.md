# Provider capability truth

A local connection does **not** imply that every provider exposes the same Livariant capabilities.

| Capability | Codex | Claude Code | Gemini CLI | Custom |
| --- | --- | --- | --- | --- |
| Live project-bound Provider Context/Return | supported | supported through project-local MCP | supported through project-scoped MCP | bridge-dependent |
| Live conversation/session separation | provider-native Codex thread metadata + Livariant MCP session | Livariant MCP session only today | Livariant MCP session only today | bridge-dependent |
| Retrospective session -> project attribution | supported from persisted Codex thread/session metadata + cwd | provider exposes session/cwd/transcript hook metadata, Livariant path not yet qualified | provider exposes session/cwd/transcript hook metadata, Livariant path not yet qualified | bridge-dependent |
| Provider-owned usage telemetry in Diagnostics | supported from qualified Codex App Server usage events | not integrated | provider hook usage metadata exists, Livariant path not yet qualified | bridge-dependent |

## Boundaries

- Desktop project selection is navigation only and never provider routing.
- Provider Context remains project-bound through the actual project path, stable Project Brain identity and baseline.
- MCP ready context remains same-session and single-use.
- Provider-native session/thread metadata is correlation evidence, never Authority.
- A Custom provider reporting `ready` through the current probe contract proves only local readiness. It does not prove MCP context, session recovery or telemetry support.
- Livariant does not silently install Claude or Gemini hooks. Provider configuration remains provider/user owned.
- Missing provider history is represented as missing; Livariant may still reconstruct repository, Git and Project Brain state later.
