# Install Livariant and add it to a project

Livariant is installed once as a command-line tool on your computer. You then run it from the root directory of the project you want to use with AI-assisted development.

Livariant is not installed inside Claude Code, Codex, or another coding agent. The current Preview install path also does not add Livariant as a dependency to your project's `package.json`.

## What you need

- Node.js 20 or newer;
- npm from your Node.js installation;
- a local copy of your project;
- the Livariant release files from the canonical `Kryt3r/livariant` GitHub Release once the Preview candidate is published.

The release bundle contains at least:

```text
livariant-<version>.tgz
release-manifest.json
SHA256SUMS
```

For `0.1.0-rc.2`, the package file is:

```text
livariant-0.1.0-rc.2.tgz
```

> [!IMPORTANT]
> Get the release files from the canonical Livariant GitHub Release. Do not install a tarball from an unknown repository, chat attachment, mirror, or arbitrary package source just because the filename contains `livariant`.

## 1. Verify the download

Before installing executable code, compare the tarball SHA-256 with the values published in `SHA256SUMS` and `release-manifest.json`.

### Linux

From the directory containing the downloaded release files:

```bash
sha256sum livariant-0.1.0-rc.2.tgz
cat SHA256SUMS
```

The hashes must match exactly.

### macOS

```bash
shasum -a 256 livariant-0.1.0-rc.2.tgz
cat SHA256SUMS
```

The hashes must match exactly.

### Windows PowerShell

```powershell
(Get-FileHash .\livariant-0.1.0-rc.2.tgz -Algorithm SHA256).Hash.ToLower()
Get-Content .\SHA256SUMS
```

The hashes must match exactly.

If they do not match, do not install the tarball.

## 2. Install Livariant

From the directory containing the verified tarball:

### Linux / macOS

```bash
npm install --global --ignore-scripts ./livariant-0.1.0-rc.2.tgz
```

### Windows PowerShell

```powershell
npm install --global --ignore-scripts .\livariant-0.1.0-rc.2.tgz
```

This installs the `livariant` command for your computer or user account.

Nothing is done to your project yet. Livariant is not initialized automatically and is not added to the target project's `package.json` or `node_modules`.

> [!NOTE]
> If npm cannot write to its global install location, use a user-writable npm prefix or a suitable Node.js installation. Do not work around the permission problem by copying Livariant files manually into your project or into Livariant-managed Runtime and trust directories.

## 3. Check the installation

```bash
livariant version
```

For this Preview candidate, the output must identify Livariant `0.1.0-rc.2` on the `preview` channel.

If your terminal cannot find the `livariant` command, open a new terminal first. Then check whether npm's global executable directory is on your `PATH`.

## 4. Open your project

Livariant works with the project directory on your computer. Basic local use does not depend on a Claude, OpenAI, or editor account.

If the project already exists locally, open a terminal in its root directory.

Linux or macOS example:

```bash
cd /path/to/your-project
```

Windows PowerShell:

```powershell
Set-Location C:\path\to\your-project
```

If the project exists only on GitHub or another Git host, clone it using your normal Git workflow and then enter the project directory.

If you already use Claude Code or Codex there, this is the same directory. There is no separate Livariant plugin installation step for those providers in the current Preview.

## 5. Inspect the project first

From the project root:

```bash
livariant status
livariant doctor
livariant init
```

These commands help you understand the current state before Livariant creates managed project state.

`livariant init` without `--apply` only shows the initialization plan. It does not change the project.

For an existing project, read that plan before applying it. Livariant is designed to adopt the project that already exists rather than reshape it into a preferred template.

## 6. Create the Project Brain deliberately

If the plan looks correct:

```bash
livariant init --apply
```

Then verify the result:

```bash
livariant status
livariant doctor
livariant resume
```

The project now contains the minimal `.project-brain/` state managed by Livariant.

## 7. Continue with Claude Code or Codex

The current Preview can render Project Brain context as a Resume handoff for Claude Code or Codex. Livariant is not a native plugin for either provider and does not silently rewrite provider-owned instruction files.

### Claude Code on Linux / macOS

```bash
LIVARIANT_PROVIDER_ENV=claude-code livariant resume --provider claude-code
```

### Claude Code on Windows PowerShell

```powershell
$env:LIVARIANT_PROVIDER_ENV = "claude-code"
livariant resume --provider claude-code
```

### Codex on Linux / macOS

```bash
LIVARIANT_PROVIDER_ENV=codex livariant resume --provider codex
```

### Codex on Windows PowerShell

```powershell
$env:LIVARIANT_PROVIDER_ENV = "codex"
livariant resume --provider codex
```

The Resume output is temporary working context. The Project Brain remains the durable project record.

## What installation does and does not do

```text
verify GitHub Release tarball
        |
        v
install Livariant CLI
        |
        v
open your project directory
        |
        v
inspect with status / doctor / init
        |
        v
run init --apply deliberately
        |
        v
use Livariant during normal project work
```

Installing the CLI does not:

- initialize projects automatically;
- modify `CLAUDE.md`, `AGENTS.md`, or provider memory automatically;
- give a coding provider project or Runtime authority;
- migrate an existing Project Brain just because the CLI package changed;
- authorize future executable Runtime update artifacts.

## Updating later is a separate operation

Installing a newer Livariant CLI package is not the same as migrating an existing Project Brain or authorizing a new Runtime.

Existing projects use the supported update, migration, and recovery flow described in [Updates, Migrations & Recovery](lifecycle-guide.md).

Do not manually replace `.project-brain/`, managed Runtime state, Runtime trust evidence, or release-authorization evidence.

## Next steps

- [Five-Minute Quickstart](quickstart.md)
- [Existing Projects](existing-projects.md)
- [Provider Handoff](provider-handoff.md)
- [Architecture & Safety](architecture-and-safety.md)
- [Updates, Migrations & Recovery](lifecycle-guide.md)
