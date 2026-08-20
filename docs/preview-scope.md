# Public Preview Scope & Limitations

This page states the scope of the **currently published Livariant Public Preview**. It is a release-truth surface, not a historical development log or a promise that roadmap work is already implemented.

## Current published release

The current public prerelease is:

```text
v0.1.0-rc.4
```

RC4 was qualified from exact source:

```text
4f547751d9d53e7325e6ea1f2401f1dea45779dc
```

Qualified installable CLI artifact:

```text
livariant-0.1.0-rc.4.tgz
```

SHA-256:

```text
6a8a287e55344e22c97c543cb4a9e071d27d9e18c5ff585cab8235aaa37dce8e
```

`v0.1.0-rc.3` remains immutable historical Foundation Preview evidence. RC4 does not rewrite RC3 history; it is the later separately qualified Public Preview candidate.

## Important RC4 Fresh Install limitation

Real Windows dogfooding found an important distribution gap in RC4:

- the ordinary RC4 CLI `.tgz` installs and runs;
- Guardian enforcement correctly requires an already protected bootstrap source;
- the published RC4 installation/distribution path does **not** provision that protected Stage-A source;
- therefore RC4 does not provide a complete supported clean-machine -> protected Guardian -> first-project initialization path.

This is not a reason to weaken Guardian checks. Do not copy arbitrary/global npm package bytes into `C:\Program Files\Livariant` or `/opt/livariant` as a workaround.

WP-044 is remediating this for a later separately qualified release by adding release-bound Stage-A/Stage-B provisioning, machine-readiness guidance, EN/DE First-Run localization and qualified release-asset publication/provenance. Those changes are **not retroactively part of RC4**.

See [Installation & First Project](installation.md).

## What RC4 includes

RC4 combines the hardened project-owned continuity/lifecycle foundation with bounded Active Project Intelligence and an agent-native MCP path.

### Project-owned continuity and lifecycle

The Public Preview includes the Project Brain and supported lifecycle surfaces for:

- initialization and status/diagnostic inspection;
- confirmed goals, project knowledge, and accepted decisions;
- plan-first supported mutation flows;
- decision supersession with preserved history;
- Project Brain Resume handoff;
- stale-context protection;
- update and supported migration/recovery flows;
- Runtime/release integrity and protected Authority boundaries;
- stable logical Project Brain identity;
- filesystem/topology safety for the implemented lifecycle operations;
- an installable ordinary CLI package.

The last item does **not** imply that RC4's release distribution completed the separate protected Stage-A Guardian provisioning prerequisite described above.

### Active Project Intelligence foundations

RC4 includes bounded read-only/review-oriented foundations such as:

- Project Context Snapshot;
- Semantic Proposal and Conflict/Drift Assessment;
- Provider Context and Provider Return evidence intake;
- Guided Project Understanding Review and controlled adoption;
- External Knowledge evidence foundations;
- Autonomy Profiles;
- Evidence-backed Findings;
- Requirement -> Implementation -> Verification Trace.

These capabilities preserve the distinction between evidence, inference, Project Truth, verification, authorization, and mutation.

### First Run

RC4 includes the guided entry point:

```bash
livariant first-run
```

RC4 First Run composes existing read-only setup/understanding surfaces and records an interaction-language choice. Real dogfooding showed that RC4's human-readable First-Run localization is incomplete and that its next-action guidance does not sufficiently surface missing Guardian machine prerequisites. WP-044 addresses both findings for a future qualified release.

RC4 First Run still ends with `Changes made: 0` and does not silently initialize the project, adopt evidence, configure a provider, persist Authority, or turn agent output into Project Truth.

See [First-Run Composition](first-run.md).

### Local MCP agent bridge

RC4 includes the local stdio MCP bridge:

```bash
livariant mcp
```

and explicit provider setup guidance:

```bash
livariant mcp setup --provider claude-code
livariant mcp setup --provider codex
```

Current bounded MCP tools include:

- `livariant_provider_context`;
- `livariant_provider_return`;
- `livariant_verification_trace`.

Provider configuration remains explicit. Livariant does not silently rewrite provider configuration, and MCP transport does not grant independent trust or mutation Authority.

See [Local MCP Agent Bridge](mcp-agent-bridge.md), [Provider Handoff](provider-handoff.md), and [Verification Trace](verification-trace.md).

### Verification Trace

RC4 can assess explicit requirements or acceptance criteria against supplied implementation claims and verification evidence using:

```text
SUPPORTED
CONTRADICTED
UNPROVEN
```

These states describe evidence support. They do **not** automatically mean accepted completion or Project Truth.

Permanent boundaries include:

```text
SUPPORTED != DONE
Verification evidence != accepted completion
Evidence != Project Truth
Capability != Authority
MCP transport != independent trust
```

## Provider support

The current Public Preview provides explicit integration/setup paths for **Claude Code** and **Codex**.

Provider selection or provider output does not itself grant Livariant Authority. Provider/client material entering Livariant remains evidence or candidate material unless it passes the appropriate existing Project Truth/Authority process.

Livariant does not claim to manage every provider feature, authentication mechanism, model-selection option, native memory surface, or future MCP behavior.

## Platform and packaging scope

RC4 release qualification exercised release-relevant CI across **Ubuntu and Windows**. The package declares Node.js `>=20`.

That CI evidence does not prove a complete clean-machine protected Guardian installation path. The real Windows Fresh-Install path is now an explicit WP-044 acceptance requirement.

Guardian v1 protected provisioning is designed for Windows and Linux; macOS does not currently have a protected Guardian v1 path.

See [Installation & First Project](installation.md).

## What RC4 does not claim

The Public Preview does **not** claim:

- a complete RC4 fresh-machine protected Guardian provisioning path;
- complete RC4 First-Run localization for every selected language;
- universal automatic requirement discovery;
- automatic manufacture of trustworthy verification evidence;
- universal correctness verification for arbitrary code;
- provider-driven, wildcard, or standing semantic mutation authorization;
- provider output becoming Project Truth merely because it arrived through MCP;
- remote/cloud MCP hosting as a Livariant service;
- broad repository graph/index/search ownership;
- automatic drift repair;
- unrestricted autonomous repository mutation;
- broad multi-agent orchestration or concurrent-agent containment;
- a general third-party plugin/marketplace execution model;
- exact provider-billed token savings.

RC4 includes deterministic context/token proxy evidence, but those measurements are not exact Claude/Codex billing-token counts and do not establish a universal token-savings percentage.

## Stable-release work remains separate

RC4 is a **Public Preview prerelease**, not Stable.

Before a first Stable release, Livariant still needs representative real-agent workflow qualification, including where feasible:

- correct MCP tool selection;
- missed or unnecessary tool calls;
- interpretation of `SUPPORTED / CONTRADICTED / UNPROVEN`;
- Claude Code / Codex differences;
- longer-session and context-loss behavior;
- failure modes;
- provider-observed token/context behavior where practical.

WP-044 separately requires provenance-attested release inputs and a real Windows Fresh-Install/First-Project qualification before its own GO. That requirement does not automatically decide every future Stable provenance/audit policy.

## Historical RC3

`v0.1.0-rc.3` remains available as immutable historical Foundation Preview evidence. Statements about what RC3 contained should remain historical and must not be interpreted as the scope of the current RC4 Public Preview.

For the current user path, start with:

- [Installation & First Project](installation.md)
- [Five-Minute Quickstart](quickstart.md)
- [Architecture & Safety](architecture-and-safety.md)
