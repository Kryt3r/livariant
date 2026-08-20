# Livariant Five-Minute Quickstart

The shortest way to understand Livariant is:

> You work with your coding agent. Livariant provides a local reliability/governance layer, while durable Project Truth and consequential Authority remain explicit.

## Current Public Preview warning

The currently published release is **`v0.1.0-rc.4`**. Its ordinary CLI package works, but Fresh-Install dogfooding proved that RC4 does **not** publish/provision the protected Stage-A Guardian bootstrap source needed for a complete fresh-machine first-project lifecycle.

Do not manually copy RC4 package files into protected system locations to bypass this gap. The complete sequence below describes the WP-044 remediation and becomes a supported public Fresh-Install path only in a later release that explicitly contains and qualifies it.

See [Installation & First Project](installation.md) for the full trust/provenance details.

## 1. Verify the qualified release artifacts

A remediated qualified release provides explicit assets including the ordinary CLI package, protected bootstrap package, platform Stage-A installer, manifest and checksums.

Do **not** use GitHub's automatically generated `Source code (zip)` or `Source code (tar.gz)` as an installable Livariant package.

Before privileged Stage A, verify the downloaded installable inputs with GitHub Artifact Attestations against:

```text
Repository: Kryt3r/livariant
Signer workflow: Kryt3r/livariant/.github/workflows/rc-bundle.yml
Source ref: refs/heads/main
Source digest: exact qualified release source SHA
```

Then verify `SHA256SUMS` and `PROTECTED-SHA256SUMS`.

## 2. Install the ordinary CLI

```bash
npm install --global --ignore-scripts ./livariant-<version>.tgz
livariant version
```

This installs user tooling only. It does not create Guardian readiness or Authority.

## 3. Establish the protected machine foundation

Check the state first:

```bash
livariant guardian status
```

On a fresh Windows/Linux machine the remediated path is:

```text
verified release artifacts
-> ordinary CLI install
-> protected Stage A install from exact release material
-> guardian status
-> protected Stage B Guardian bootstrap
-> guardian status: ready
```

Stage A and Stage B require already privileged local terminals and do not initiate UAC/`sudo`/`pkexec` themselves. They do not manufacture mutation, Runtime or Release Authority.

macOS currently has no Guardian v1 protected bootstrap path.

## 4. Open the project and run First Run

From the project root:

```bash
livariant first-run --language English
```

or:

```bash
livariant first-run --language Deutsch
```

English and German are built-in interaction locales in the remediation. User-facing First-Run prompts and human-readable output use the selected supported language from the first localized prompt onward.

First Run is read-only. It reports project state **and machine Guardian readiness** and ends with zero changes. It does not silently initialize the project, persist an Autonomy Profile, configure your coding agent or grant Authority.

If Guardian readiness is missing/unsafe, First Run must not direct you immediately to lifecycle authorization/application.

See [First-Run Composition](first-run.md).

## 5. Initialize deliberately when the machine is ready

If Guardian is ready and the project needs a Project Brain:

```bash
livariant init
```

Review the plan first. Then, where appropriate:

```bash
livariant init --authorize
livariant init --apply
```

Verify the result:

```bash
livariant status
livariant doctor
```

The Project Brain is project-owned durable state:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

Evidence, inference, Project Truth, authorization and mutation remain distinct concepts.

## 6. Connect your coding agent through MCP

Provider configuration remains explicit:

```bash
livariant mcp setup --provider claude-code
```

or:

```bash
livariant mcp setup --provider codex
```

The command renders provider-specific setup guidance and performs zero provider-configuration writes itself.

Current bounded MCP tools include:

- `livariant_provider_context`;
- `livariant_provider_return`;
- `livariant_verification_trace`.

After normal provider registration, day-to-day use can remain natural-language/agent-native rather than command-heavy.

## 7. The core reliability moment

`livariant_verification_trace` assesses explicit requirements/claims against supplied verification evidence and returns:

```text
SUPPORTED
CONTRADICTED
UNPROVEN
```

The boundaries remain:

```text
SUPPORTED != DONE
verification evidence != accepted completion
evidence != Project Truth
MCP transport != independent trust
capability != Authority
```

Livariant does not automatically discover every requirement or manufacture trustworthy verification evidence.

See [Verification Trace](verification-trace.md).

## Fresh-Install acceptance for WP-044

WP-044 is not complete merely because tests pass. Its required real flow is:

```text
clean machine/user state
-> verified RC install
-> protected Stage A provisioning
-> protected Stage B Guardian bootstrap
-> guardian status ready
-> existing-project First Run
-> init plan
-> init --authorize
-> init --apply
-> Project Brain valid
-> status/doctor clean
```

Windows must pass this without manual trust-bypass copying.

## Next reads

- [Installation & First Project](installation.md)
- [First-Run Composition](first-run.md)
- [Verification Trace](verification-trace.md)
- [Existing Projects](existing-projects.md)
- [Provider Handoff](provider-handoff.md)
- [Architecture & Safety](architecture-and-safety.md)
- [Updates, Migrations & Recovery](lifecycle-guide.md)
