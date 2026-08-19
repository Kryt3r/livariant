# Install Livariant and connect it to a project

Livariant is installed once as local machine/user tooling and then used from the root directory of the project you develop with AI assistance.

The CLI installation and the coding-agent connection are **separate steps**:

```text
install Livariant CLI
-> open project
-> run First Run
-> initialize deliberately if needed
-> explicitly connect Claude Code or Codex through MCP
-> work normally with the coding agent
```

Livariant is not added to your application's `package.json` merely to use the normal local workflow, and it does not silently rewrite provider configuration.

## Published release and current source

The currently published release is **`v0.1.0-rc.4` - Public Preview prerelease**.

RC4 contains the guided First Run, local MCP bridge, Verification Trace, protected Guardian/Self-Integrity hardening, and the other capabilities present in the exact qualified RC4 source.

At the time of publication, canonical repository `main` is the exact qualified RC4 source `4f547751d9d53e7325e6ea1f2401f1dea45779dc`. Future repository development may move ahead again; repository presence alone is never release publication.

`v0.1.0-rc.3` remains immutable historical Foundation Preview evidence and is not retroactively rewritten.

## What you need

- Node.js 20 or newer;
- npm from your Node.js installation;
- a local software project;
- the verified Livariant RC4 release files from the canonical `Kryt3r/livariant` GitHub Release.

A release bundle includes at least:

```text
livariant-<version>.tgz
release-manifest.json
SHA256SUMS
```

## 1. Verify the published RC4 download

Before installing executable release code, compare the tarball SHA-256 with the qualified RC4 value and, when present in your downloaded release bundle, with `SHA256SUMS` and `release-manifest.json`.

Qualified RC4 tarball SHA-256:

```text
6a8a287e55344e22c97c543cb4a9e071d27d9e18c5ff585cab8235aaa37dce8e
```

### Linux

```bash
sha256sum livariant-0.1.0-rc.4.tgz
```

### macOS

```bash
shasum -a 256 livariant-0.1.0-rc.4.tgz
```

### Windows PowerShell

```powershell
(Get-FileHash .\livariant-0.1.0-rc.4.tgz -Algorithm SHA256).Hash.ToLower()
```

If the value does not match exactly, do not install the tarball.

> [!IMPORTANT]
> Use the canonical Livariant GitHub Release for release artifacts. Do not install executable Livariant code from an unknown repository, mirror, chat attachment, or arbitrary package source just because the filename looks correct.

## 2. Install the CLI

From the directory containing the verified tarball:

### Linux / macOS

```bash
npm install --global --ignore-scripts ./livariant-0.1.0-rc.4.tgz
```

### Windows PowerShell

```powershell
npm install --global --ignore-scripts .\livariant-0.1.0-rc.4.tgz
```

Then verify:

```bash
livariant version
```

The install step does not initialize a project and does not add Livariant to the target project's `package.json` or `node_modules`.

If the command is not found, open a new terminal and verify npm's global executable directory is on your `PATH`. Prefer a user-writable npm prefix over manually copying Livariant files into project, Runtime, or trust directories.

## 3. Open the project

Use the root directory of the project you already work on.

Linux/macOS:

```bash
cd /path/to/your-project
```

Windows PowerShell:

```powershell
Set-Location C:\path\to\your-project
```

Livariant is preservation-first: it is designed to inspect and adopt an existing project without silently reshaping it into a preferred template.

## 4. Use First Run

The guided Public Preview entry point is:

```bash
livariant first-run
```

First Run composes read-only project discovery, initialization assessment, Autonomy Profile choice, optional external knowledge evidence, Guided Project Understanding Review, and optional provider setup guidance.

It ends with `Changes made: 0` and does not silently initialize the project, persist an Autonomy Profile, adopt evidence, configure a provider, or grant Authority.

For deterministic use:

```bash
livariant first-run --language English
```

If you already know which supported provider you want to connect, First Run can surface that setup path:

```bash
livariant first-run --language English --provider claude-code
livariant first-run --language English --provider codex
```

See [First-Run Composition](first-run.md).

## 5. Initialize deliberately when needed

If the project needs a Project Brain, inspect the initialization plan first:

```bash
livariant init
```

Only proceed through the supported explicit authorization path after reviewing the plan. First Run itself never performs the initialization.

After supported initialization, useful read-only checks include:

```bash
livariant status
livariant doctor
livariant context
livariant resume
```

## 6. Explicitly connect Claude Code or Codex through MCP

Installing Livariant does **not** automatically configure your coding agent.

RC4 can render the provider-native setup path:

### Claude Code

```bash
livariant mcp setup --provider claude-code
```

### Codex

```bash
livariant mcp setup --provider codex
```

This command returns provider-specific registration/configuration guidance and performs **zero provider-configuration writes** itself. You or the provider apply the displayed step through that provider's own configuration surface.

Once the provider is connected to `livariant mcp`, the agent can discover Livariant MCP tools and server instructions during the normal MCP session.

Current bounded MCP capabilities include:

- `livariant_provider_context`;
- `livariant_provider_return`;
- `livariant_verification_trace`.

That means normal use can be agent-native: you work in natural language with the coding agent, and the agent can call Livariant tools when relevant. You do not have to manually type a Livariant CLI command for every ordinary interaction.

The CLI remains the direct control and diagnostic surface when you explicitly want it.

## 7. Verification Trace in the agent workflow

With the MCP bridge connected, an MCP-capable coding agent can call:

`livariant_verification_trace`

It uses the same explicit Verification Trace v1 structure as the core/CLI assessor and returns deterministic states:

```text
SUPPORTED
CONTRADICTED
UNPROVEN
```

That is evidence coverage, not accepted completion.

The boundaries remain:

```text
Evidence != Truth
Verification evidence != accepted completion
SUPPORTED != DONE
MCP transport != independent trust
Capability != Authority
```

Livariant does not currently discover every requirement automatically or manufacture trustworthy verification evidence automatically.

See [Verification Trace](verification-trace.md).

## What installation and MCP setup do not do

They do not:

- automatically initialize projects;
- silently rewrite `CLAUDE.md`, `AGENTS.md`, or provider memory;
- watch every AI conversation and decide automatically what becomes Project Truth;
- grant mutation, Runtime, Guardian, or release Authority to a provider;
- treat agent evidence as trusted merely because it arrived through MCP;
- migrate Project Brain state merely because the CLI package changed;
- publish or authorize a future Livariant release.

## Later updates are separate

Installing a newer Livariant CLI package is not the same thing as migrating Project Brain state, activating a new Runtime, or granting release/runtime Authority.

Use the supported update, migration, and recovery flows in [Updates, Migrations & Recovery](lifecycle-guide.md). Do not manually replace `.project-brain/`, managed Runtime state, Guardian state, Runtime-trust evidence, or release-authorization evidence.

## Next reads

- [Five-Minute Quickstart](quickstart.md)
- [First-Run Composition](first-run.md)
- [Verification Trace](verification-trace.md)
- [Existing Projects](existing-projects.md)
- [Provider Handoff](provider-handoff.md)
- [Architecture & Safety](architecture-and-safety.md)
