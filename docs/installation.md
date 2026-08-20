# Install Livariant and connect it to a project

Livariant has two deliberately separate installation roles:

1. the ordinary global CLI used from your user account;
2. the release-bound protected Guardian bootstrap source used only to establish the machine's protected Guardian foundation.

The ordinary CLI is **not** a root of trust. Installing `livariant-<version>.tgz` globally must never make same-user/requester-controlled package bytes authoritative merely because they are installed.

## Published release and current remediation state

The currently published release is **`v0.1.0-rc.4` - Public Preview prerelease**.

The exact qualified RC4 source is `4f547751d9d53e7325e6ea1f2401f1dea45779dc`. RC4 contains the protected Guardian enforcement code, but real Fresh-Install dogfooding on Windows showed that its public installation/distribution path does **not** provision the protected Stage-A bootstrap source required by that Guardian design.

Therefore RC4 must not be described as a complete fresh-machine -> protected Guardian -> first-project installation path. Do not work around this by copying arbitrary CLI/package files into `C:\Program Files\Livariant` or `/opt/livariant`.

The WP-044 remediation described below is the installation contract for the **next qualified release that contains it**. Repository implementation is not publication; until such a release is explicitly qualified and published, RC4 remains the current public release with the limitation above.

`v0.1.0-rc.3` remains immutable historical Foundation Preview evidence and is not retroactively rewritten.

## Supported protected platforms

| Platform | Ordinary CLI | Protected Guardian v1 |
| --- | --- | --- |
| Windows | supported | supported by the WP-044 Stage-A/Stage-B design |
| Linux | supported | supported by the WP-044 Stage-A/Stage-B design |
| macOS | supported for ordinary CLI surfaces | **not supported by Guardian v1** |

Do not interpret a working macOS CLI as protected Guardian readiness.

## Protected Stage-B Node prerequisite

The ordinary CLI may run under any otherwise supported Node.js 20+ installation. The protected Guardian bootstrap is stricter because privileged Stage B must not resolve an interpreter through requester-controlled `PATH` state.

For the WP-044 protected path, Stage A requires Node.js 20+ at the fixed OS-protected location:

```text
Windows: C:\Program Files\nodejs\node.exe
Linux:   /usr/bin/node
```

Stage A verifies that fixed interpreter and its filesystem/ACL or ownership chain **before** privileged Node execution. `guardian status` inspects the same expected Stage-B interpreter independently of whichever Node executable happens to run the ordinary user CLI.

A user-local Node installation, version-manager shim, or alternate `PATH` entry may be sufficient for the ordinary CLI but is **not** sufficient for protected Guardian Stage B. Install/provision a supported system-protected Node runtime first; do not redirect Livariant to a same-user interpreter as a workaround.

## Release assets for the remediated path

A qualified release containing WP-044 must expose explicit release assets including:

```text
livariant-<version>.tgz
livariant-protected-bootstrap-<version>.tgz
install-livariant-bootstrap-<version>.ps1
install-livariant-bootstrap-<version>.sh
release-manifest.json
SHA256SUMS
PROTECTED-SHA256SUMS
protected-bootstrap-assets.json
```

Additional evidence files such as the SBOM, RC metadata, release decision dossier and attestation-related evidence may also be present.

> [!IMPORTANT]
> GitHub's automatically generated **Source code (zip)** and **Source code (tar.gz)** downloads are not the installable Livariant CLI package and are not the protected Stage-A package. Use only the explicitly named qualified release assets.

## Trust model before privileged installation

A checksum embedded inside a downloaded installer is not sufficient by itself: an attacker who could replace both an unprivileged installer and its neighboring archive could otherwise replace both values together.

For the remediated release path, the RC workflow therefore creates GitHub Artifact Attestations for the installable artifacts and critical release metadata. Before running Stage A with Administrator/root privileges, verify the downloaded artifact provenance with GitHub CLI against the canonical repository and exact RC workflow.

For each executable/installable input you intend to use:

```bash
gh attestation verify <artifact> \
  --repo Kryt3r/livariant \
  --signer-workflow Kryt3r/livariant/.github/workflows/rc-bundle.yml \
  --source-ref refs/heads/main \
  --source-digest <exact-qualified-source-sha> \
  --deny-self-hosted-runners
```

At minimum verify:

- `livariant-<version>.tgz`;
- `livariant-protected-bootstrap-<version>.tgz`;
- the platform-specific Stage-A installer;
- `release-manifest.json`;
- `SHA256SUMS` and `PROTECTED-SHA256SUMS`.

A failed or missing attestation is a stop condition. Do not continue privileged installation.

Artifact attestation establishes provenance/integrity for the produced bytes; it does not mean the code is automatically safe. Livariant's own release qualification, Guardian protection checks and Authority boundaries remain separate requirements.

## 1. Verify release checksums

After provenance verification, compare the ordinary CLI tarball with `SHA256SUMS` and the protected bootstrap archive/installers with `PROTECTED-SHA256SUMS`. `release-manifest.json` binds the runtime and protected-bootstrap release identity to the exact release source.

Examples:

### Linux

```bash
sha256sum -c SHA256SUMS
sha256sum -c PROTECTED-SHA256SUMS
```

### Windows PowerShell

```powershell
Get-FileHash .\livariant-<version>.tgz -Algorithm SHA256
Get-FileHash .\livariant-protected-bootstrap-<version>.tgz -Algorithm SHA256
Get-FileHash .\install-livariant-bootstrap-<version>.ps1 -Algorithm SHA256
```

Compare the Windows values exactly with the corresponding checksum files. If any value differs, stop.

## 2. Install the ordinary CLI

From the directory containing the verified runtime tarball:

### Linux / macOS

```bash
npm install --global --ignore-scripts ./livariant-<version>.tgz
```

### Windows PowerShell

```powershell
npm install --global --ignore-scripts .\livariant-<version>.tgz
```

Then verify:

```bash
livariant version
```

This installs only the ordinary CLI. It does not initialize a project, provision the protected Guardian source, create Guardian Authority, or add Livariant to a target project's `package.json`.

## 3. Inspect machine readiness before opening a project lifecycle

From an ordinary user terminal:

```bash
livariant guardian status
```

On a fresh supported machine before Stage A, the expected state is that the protected bootstrap source is not ready. This is not permission to bypass the check; it means Stage A is required.

## 4. Stage A - provision exact release bytes under OS protection

Stage A is a separate privileged installation operation. The Stage-A installer does **not** initiate UAC, `sudo`, or `pkexec`; you deliberately open an already privileged terminal after completing provenance/checksum verification as an ordinary user.

### Windows

Open an **Administrator PowerShell** and run the verified release installer from the release-asset directory:

```powershell
& .\install-livariant-bootstrap-<version>.ps1
```

The protected source is installed to:

```text
C:\Program Files\Livariant\Bootstrap\v1
```

and the protected Guardian parent is prepared beneath:

```text
C:\ProgramData\Livariant\Guardian
```

### Linux

Open an already-root shell and run:

```bash
./install-livariant-bootstrap-<version>.sh
```

The protected source is installed to:

```text
/opt/livariant/bootstrap/v1
```

and the Guardian parent is prepared beneath:

```text
/var/lib/livariant-guardian
```

Stage A validates the release archive before installation, refuses unsafe path forms, verifies the fixed protected Stage-B Node runtime before executing it, protects the installed tree, and issues **no mutation, Runtime, Guardian-operation, integrity, or release Authority**.

If a protected bootstrap source already exists, Stage A refuses implicit replacement. A release transition must be explicit (`-Replace` on Windows or `--replace` on Linux) and must use a separately verified new release.

## 5. Verify Stage A from an ordinary terminal

Close the privileged terminal. From the ordinary user account run:

```bash
livariant guardian status
```

The status command is read-only. It should now report that the protected source and expected Stage-B interpreter are ready and that Guardian bootstrap is the next required step. If the source/interpreter state is reported `unsafe`, stop; do not repair/bless it by presence.

## 6. Stage B - bootstrap Guardian from protected bytes

Run only the protected Stage-B launcher shown by `guardian status`.

### Windows

From an already elevated Administrator PowerShell:

```powershell
& 'C:\Program Files\Livariant\Bootstrap\v1\guardian-bootstrap.ps1'
```

### Linux

From an already-root terminal:

```bash
/opt/livariant/bootstrap/v1/guardian-bootstrap
```

Stage B verifies that its bootstrap module/helper, release descriptor, protected filesystem chain and the **actually running** Node interpreter chain satisfy the Guardian trust requirements. It requires the existing interactive bootstrap confirmation and establishes only the protected Guardian foundation. It does **not** manufacture lifecycle Authority.

After Stage B, close the privileged terminal again and verify from the ordinary account:

```bash
livariant guardian status
```

Do not continue to project lifecycle authorization unless the result reports Guardian readiness.

## 7. Open the existing project and run First Run

```bash
cd /path/to/your-project
livariant first-run --language English
```

Windows example:

```powershell
Set-Location C:\path\to\your-project
livariant first-run --language English
```

German is a supported interaction locale in the remediated First Run:

```bash
livariant first-run --language Deutsch
```

All supported-language First-Run prompts and human-readable headings/explanations are localized from the first prompt onward. Machine identifiers, command names, Project Truth language and JSON enum values remain separate from interaction localization.

First Run is read-only and reports `Changes made: 0`. It inspects machine readiness as well as project initialization state. If the Guardian path is not ready or is unsafe, First Run must not tell the user to proceed directly with lifecycle authorization/application.

## 8. Initialize deliberately

When Guardian readiness is confirmed and the project needs a Project Brain:

```bash
livariant init
```

Review the plan first. Then use the supported explicit authorization/application sequence only when appropriate:

```bash
livariant init --authorize
livariant init --apply
```

Afterwards verify:

```bash
livariant status
livariant doctor
```

For WP-044 acceptance, a real fresh-machine/first-project qualification must additionally prove the resulting Project Brain valid. Unit tests alone are not sufficient.

## 9. Connect Claude Code or Codex through MCP

Installing Livariant does **not** automatically configure a coding agent.

### Claude Code

```bash
livariant mcp setup --provider claude-code
```

### Codex

```bash
livariant mcp setup --provider codex
```

The setup command renders provider-specific guidance and performs zero provider-configuration writes itself. MCP capability does not grant mutation, Runtime, Guardian, integrity, or release Authority.

## What this installation flow does not do

It does not:

- trust a package merely because it exists in a familiar directory;
- make the ordinary global npm CLI a protected root of trust;
- allow project files, CLI flags or provider output to self-authorize Guardian/lifecycle actions;
- automatically initialize projects;
- silently rewrite `CLAUDE.md`, `AGENTS.md`, provider memory or provider configuration;
- convert Artifact Attestation, release evidence or Guardian presence into mutation/Runtime/release Authority;
- publish or authorize a future Livariant release.

## Updates and uninstall boundaries

Ordinary CLI installation, protected Stage-A source, Guardian state, Runtime trust and release authorization are different state classes.

Updating the npm CLI does not silently update or authorize the protected bootstrap source. Replacing a protected source requires an explicit verified release transition. Removing the ordinary CLI must not silently delete Guardian/Authority history, and removing protected system state must not be treated as an ordinary package uninstall side effect.

Use the supported lifecycle/update documentation rather than manually replacing `.project-brain/`, protected Guardian state, managed Runtime state, Runtime-trust evidence or release-authorization evidence.

## Next reads

- [Five-Minute Quickstart](quickstart.md)
- [First-Run Composition](first-run.md)
- [Verification Trace](verification-trace.md)
- [Existing Projects](existing-projects.md)
- [Provider Handoff](provider-handoff.md)
- [Updates, Migrations & Recovery](lifecycle-guide.md)
- [Architecture & Safety](architecture-and-safety.md)
