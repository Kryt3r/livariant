# Install Livariant and add it to a project

Livariant is installed as **local machine tooling**, then used from the root of the project you want it to manage. It is not installed *inside* Claude Code, Codex, or another coding agent, and the supported Preview install does not add Livariant as a dependency to your project's `package.json`.

The current Public Preview distribution path is a Livariant release tarball from the canonical GitHub Release together with its release manifest and checksums.

## What you need

- Node.js 20 or newer;
- npm supplied with your Node.js installation;
- a local copy of the project you want to use with Livariant;
- the Livariant Preview release assets from the canonical `Kryt3r/livariant` GitHub Release once that release is published.

The release bundle contains at least:

```text
livariant-<version>.tgz
release-manifest.json
SHA256SUMS
```

For `0.1.0-rc.2`, the package filename is:

```text
livariant-0.1.0-rc.2.tgz
```

> [!IMPORTANT]
> Obtain the release files from the canonical Livariant GitHub Release. Do not install a tarball copied from an unknown project, chat attachment, mirror, or arbitrary package source merely because its filename says `livariant`.

## 1. Verify the downloaded tarball

Before installing executable tooling, compare the tarball SHA-256 with the value published in `SHA256SUMS` and `release-manifest.json`.

### Linux

From the directory containing the downloaded release files:

```bash
sha256sum livariant-0.1.0-rc.2.tgz
cat SHA256SUMS
```

The digests must match exactly.

### macOS

```bash
shasum -a 256 livariant-0.1.0-rc.2.tgz
cat SHA256SUMS
```

The digests must match exactly.

### Windows PowerShell

```powershell
(Get-FileHash .\livariant-0.1.0-rc.2.tgz -Algorithm SHA256).Hash.ToLower()
Get-Content .\SHA256SUMS
```

The digests must match exactly.

If they do not match, **stop and do not install the tarball**.

## 2. Install the Livariant CLI from the verified release tarball

From the directory containing the tarball:

### Linux / macOS

```bash
npm install --global --ignore-scripts ./livariant-0.1.0-rc.2.tgz
```

### Windows PowerShell

```powershell
npm install --global --ignore-scripts .\livariant-0.1.0-rc.2.tgz
```

This installs the `livariant` command as machine/user tooling. It does **not** initialize a project and does not add Livariant to the target project's `package.json` or `node_modules`.

> [!NOTE]
> If your npm global prefix is not writable, fix or use a user-writable Node/npm installation or prefix. Do not work around a permissions problem by copying Livariant files into the project or into Livariant-managed Runtime/trust locations.

## 3. Verify the installed CLI

```bash
livariant version
```

For this Preview candidate, the output must identify Livariant `0.1.0-rc.2` on the `preview` channel.

If your shell cannot find `livariant`, open a new terminal and confirm that npm's global executable directory is on your `PATH`.

## 4. Open the project you already use with Claude Code, Codex, or another tool

Livariant works with the **project directory**, not with a provider account or editor installation.

If your project already exists locally, open a terminal in its root directory. If it only exists in Git hosting, clone it first using your normal Git workflow, then enter the project root.

Example:

```bash
cd /path/to/your-project
```

On Windows PowerShell:

```powershell
Set-Location C:\path\to\your-project
```

If you already use Claude Code or Codex in that directory, this is the same project root. There is no separate Livariant plugin installation step for those providers in the current Preview.

## 5. Inspect the project before initialization

From the project root:

```bash
livariant status
livariant doctor
livariant init
```

These commands let you inspect the current state before adopting the project. `livariant init` without `--apply` is planning-only.

For an existing project, review the plan carefully. Livariant is preservation-first: supported initialization should add the Project Brain without rewriting established project-owned files into a preferred template.

## 6. Initialize deliberately

If the plan is correct:

```bash
livariant init --apply
```

Then verify:

```bash
livariant status
livariant doctor
livariant resume
```

Your project now contains the minimal `.project-brain/` state managed by Livariant.

## 7. Use the current Claude Code or Codex Resume handoff

The Preview integration is intentionally narrow: Livariant can project canonical Project Brain context for the selected provider, but it is not yet a native Claude Code/Codex plugin and does not silently rewrite provider-native instruction files.

### Claude Code — Linux / macOS

```bash
LIVARIANT_PROVIDER_ENV=claude-code livariant resume --provider claude-code
```

### Claude Code — Windows PowerShell

```powershell
$env:LIVARIANT_PROVIDER_ENV = "claude-code"
livariant resume --provider claude-code
```

### Codex — Linux / macOS

```bash
LIVARIANT_PROVIDER_ENV=codex livariant resume --provider codex
```

### Codex — Windows PowerShell

```powershell
$env:LIVARIANT_PROVIDER_ENV = "codex"
livariant resume --provider codex
```

The generated Resume output is an ephemeral provider handoff. The Project Brain remains canonical.

## What installation does — and does not do

```text
verified GitHub Release tarball
        ↓
install Livariant CLI as machine/user tooling
        ↓
open your existing project root
        ↓
inspect with status / doctor / init
        ↓
explicitly init --apply
        ↓
use Livariant normally and request provider Resume handoff when needed
```

Installation of the CLI does **not**:

- initialize projects automatically;
- modify `CLAUDE.md`, `AGENTS.md`, or provider memory;
- give a coding provider mutation or Runtime execution authority;
- migrate an existing Project Brain merely because the CLI package changed;
- authorize future executable Runtime update artifacts.

## Updating later is a different operation

Installing a newer Livariant CLI package is not equivalent to migrating an existing Project Brain or authorizing a new Runtime. Existing projects must use Livariant's supported `update` / migration / recovery lifecycle described in [Updates, Migrations & Recovery](lifecycle-guide.md).

Do not manually replace `.project-brain/`, managed Runtime state, Runtime trust evidence, or release-authorization evidence.

## Next steps

- [Five-Minute Quickstart](quickstart.md)
- [Existing Projects](existing-projects.md)
- [Provider Handoff](provider-handoff.md)
- [Architecture & Safety](architecture-and-safety.md)
- [Updates, Migrations & Recovery](lifecycle-guide.md)
