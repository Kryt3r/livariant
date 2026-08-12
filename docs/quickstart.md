# Livariant Five-Minute Quickstart

If you are new to Livariant, start with one idea: your project gets its own durable knowledge store, called the **Project Brain**. Important context no longer has to live only in chat history or in one AI tool's memory.

This Quickstart shows the shortest safe path from installation to your first Resume context.

## Before you start

You need:

- Node.js 20 or newer;
- a local project directory;
- the verified Livariant release tarball for the current Preview candidate once it is published.

The package and CLI command are both named `livariant`.

## 0. Install Livariant

Livariant is not installed inside Claude Code or Codex. You install the CLI once on your computer and then use it from your project directory.

From the directory containing the verified release tarball:

### Linux / macOS

```bash
npm install --global --ignore-scripts ./livariant-0.1.0-rc.2.tgz
```

### Windows PowerShell

```powershell
npm install --global --ignore-scripts .\livariant-0.1.0-rc.2.tgz
```

Check the installation:

```bash
livariant version
```

Then open the root directory of the project you want to use with Livariant.

The install step does not add Livariant to your project's `package.json` or `node_modules`, and it does not initialize the project automatically.

For download verification, SHA-256 checks, PATH help, and Windows details, read [Install Livariant and add it to a project](installation.md).

## 1. Inspect the project first

From the project root:

```bash
livariant status
livariant doctor
livariant init
```

`livariant init` without `--apply` does not change anything. It shows what Livariant found and which Project Brain files it would create.

> [!IMPORTANT]
> Read this plan carefully for an existing project. Livariant is designed to adopt the project that already exists instead of reshaping it into a preferred template.

## 2. Create the Project Brain

If the plan looks correct:

```bash
livariant init --apply
```

This creates the minimal Project Brain:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

Supported initialization does not simply rewrite existing project-owned files.

## 3. Check the result

```bash
livariant status
livariant doctor
```

A healthy initialized project should report the Project Brain as present and the lifecycle as initialized.

`doctor` is diagnostic and read-only. It does not silently repair damaged or ambiguous state.

## 4. Create context for a new working session

Provider-neutral output:

```bash
livariant resume
```

For Claude Code or Codex on Linux and macOS:

```bash
LIVARIANT_PROVIDER_ENV=claude-code livariant resume --provider claude-code
LIVARIANT_PROVIDER_ENV=codex livariant resume --provider codex
```

On Windows PowerShell, for example:

```powershell
$env:LIVARIANT_PROVIDER_ENV = "claude-code"
livariant resume --provider claude-code
```

Resume output is temporary working context. The Project Brain remains the durable project record.

> [!IMPORTANT]
> Current Claude Code and Codex support is deliberately limited to Project Brain Resume handoff. Livariant is not a complete native plugin for either provider.

## What normal use looks like after setup

You do not run `init` again every time you start a new AI session.

A normal start to a work session can be as simple as:

```bash
livariant status
livariant resume
```

If something looks unclear or unhealthy:

```bash
livariant doctor
```

Use Resume context to give a new AI session the current project state. Durable decisions and confirmed knowledge should live in the Project Brain rather than only in one chat transcript.

## 5. Plan an update before applying it

With a release manifest from the trusted Preview distribution path:

```bash
livariant update --manifest ./release-manifest.json
```

This only plans the update. Livariant reports the source and target version, channel, source ID, artifact identity, SHA-256, and any Project Brain or migration impact.

After you review the plan:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --apply \
  --artifact ./livariant-runtime.tgz \
  --trusted-source <source-id>
```

A manifest cannot make its own `sourceId` trusted. `--trusted-source` is separate trust evidence. The artifact bytes must also match the digest recorded in the manifest.

Executable updates require one more condition. The exact artifact digest must already be authorized by independent machine-local release policy outside the project. Project files, the manifest, `--trusted-source`, and the project-facing Livariant CLI cannot create that authority.

If the authority is missing, the update stops before candidate Runtime code can execute. There is no project-facing `authorize-runtime` command.

> [!WARNING]
> Do not manually replace `.project-brain/`, lifecycle state, `metadata.json`, managed Runtime files, or Runtime trust and release-authorization records to simulate an update or migration.

Schema-changing releases use the same `update` path and are routed through the supported migration lifecycle.

## 6. Recover an interrupted migration

Start read-only:

```bash
livariant doctor
livariant recover
```

If Livariant reports a valid checkpoint and a supported rollback strategy:

```bash
livariant recover --apply
```

A missing, moved, tampered, or ambiguous checkpoint is not guessed through. Automatic recovery remains blocked in that case.

After a verified rollback, Livariant removes displaced Recovery state before deleting the final valid checkpoint. A late cleanup failure must not destroy the restored Project Brain or that checkpoint.

## 7. Keep the safety boundary intact

Do not replace `.project-brain/` with files from another Livariant version and do not copy a newer Runtime manually into framework-managed lifecycle storage to simulate an update.

The supported lifecycle checks release identity, artifact integrity, independent release authority, migration checkpoints, installed Runtime integrity, activation state, and recovery evidence before protected state becomes active.

## Next reads

- [Installation & first project](installation.md)
- [Existing Projects](existing-projects.md)
- [Provider Handoff](provider-handoff.md)
- [Updates, Migrations & Recovery](lifecycle-guide.md)
- [Architecture & Safety](architecture-and-safety.md)
- [Preview Scope & Limitations](preview-scope.md)
