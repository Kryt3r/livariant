# Livariant Five-Minute Quickstart

Livariant gives an AI-assisted software project a persistent, project-owned source of truth called the **Project Brain**. It is designed to keep project identity, confirmed goals, accepted decisions, known facts, unresolved unknowns, lifecycle state, and provider handoff context coherent across sessions and supported coding agents.

## Before you start

Current executable baseline requirements:

- Node.js 20 or newer,
- a local project directory,
- the Livariant release artifact for the current Public Preview baseline.

The repository package identity and installed CLI namespace are both `livariant`.

## 0. Install Livariant tooling

Livariant is not installed inside Claude Code or Codex. Install the verified Preview release tarball as machine/user tooling, then run Livariant from the root of the project you already use with your coding agent.

From the directory containing the verified release tarball:

### Linux / macOS

```bash
npm install --global --ignore-scripts ./livariant-0.1.0-rc.2.tgz
```

### Windows PowerShell

```powershell
npm install --global --ignore-scripts .\livariant-0.1.0-rc.2.tgz
```

Verify the installed CLI:

```bash
livariant version
```

Then open the root of the project you want Livariant to manage. The install step does not add Livariant to that project's `package.json` or `node_modules` and does not initialize it automatically.

For release-source verification, SHA-256 checks, PATH guidance, and the complete Claude Code/Codex onboarding flow, read [Install Livariant and add it to a project](installation.md).

## 1. Inspect before changing anything

From the project root:

```bash
livariant status
livariant doctor
livariant init
```

`livariant init` without `--apply` is inspection-only. It reports what Livariant found, whether initialization is applicable, which existing project files would be modified, and which Project Brain files would be created.

For an existing project, this discovery step is important: Livariant is designed to adopt the project that already exists rather than normalize it into a preferred template.

## 2. Initialize deliberately

If the plan is correct:

```bash
livariant init --apply
```

Initialization creates the minimal Project Brain under `.project-brain/`:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

Existing project-owned files are not rewritten as part of supported initialization.

## 3. Check the resulting state

```bash
livariant status
livariant doctor
```

A healthy initialized project should report the Project Brain as present and the lifecycle as initialized. `doctor` is diagnostic and read-only: it does not silently repair drift, damaged state, or unsupported manual changes.

## 4. Resume project context

Provider-neutral human-readable resume:

```bash
livariant resume
```

For the currently supported Preview handoff surface, select the provider environment explicitly:

```bash
LIVARIANT_PROVIDER_ENV=claude-code livariant resume --provider claude-code
LIVARIANT_PROVIDER_ENV=codex livariant resume --provider codex
```

On Windows PowerShell, set the environment variable separately, for example:

```powershell
$env:LIVARIANT_PROVIDER_ENV = "claude-code"
livariant resume --provider claude-code
```

The provider output is an ephemeral projection of canonical Project Brain state. It is not a second source of truth and does not gain authority from provider memory or from `CLAUDE.md` / `AGENTS.md`.

> [!IMPORTANT]
> Claude Code and Codex support in the current Preview is intentionally limited to Project Brain Resume handoff. Livariant does not claim full integration with every provider feature, model, authentication surface, tool invocation, or native instruction mechanism.

## 5. Inspect an update before applying it

Given a release manifest obtained through the chosen trusted Preview distribution path:

```bash
livariant update --manifest ./release-manifest.json
```

This is planning-only. It reports source and target versions, channel, source ID, artifact identity and SHA-256, project impact, and whether a Project Brain migration/checkpoint is required.

To apply the reviewed plan, provide the matching artifact and explicitly name the source ID you trust:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --apply \
  --artifact ./livariant-runtime.tgz \
  --trusted-source <source-id>
```

The manifest cannot silently make its own `sourceId` trusted. `--trusted-source` is separate evidence of the trust context selected for this operation. Artifact bytes still must match the digest bound by the release manifest.

Executable updates have one additional prerequisite: the exact artifact digest must already be authorized by independent machine-local release policy outside the project. Project files, the manifest, `--trusted-source`, and the Livariant project CLI cannot create that authority. If it is missing, update fails closed before candidate Runtime code can execute. There is intentionally no project-facing `authorize-runtime` command.

If the target changes Project Brain schema, `livariant update` routes through the supported migration lifecycle automatically. Do not manually edit schema/version metadata and do not run a separate ad-hoc migration.

> [!WARNING]
> Do not update Livariant by manually replacing `.project-brain/`, copying framework-managed lifecycle files, editing schema/version metadata, dropping a newer Runtime into managed storage, or fabricating Runtime trust/release-authorization records. Manual replacement bypasses compatibility, authority, integrity, checkpoint, activation, and recovery guarantees.

## 6. Recover an interrupted migration

Inspect first:

```bash
livariant doctor
livariant recover
```

If Livariant reports a valid checkpoint and a supported rollback strategy, authorize it separately:

```bash
livariant recover --apply
```

A missing, moved, tampered, or ambiguous checkpoint is not guessed through. Automatic recovery remains blocked and diagnosis stays visible. After a verified rollback is committed, Livariant removes displaced recovery state before deleting the final valid checkpoint; a late cleanup failure must not destroy the restored Project Brain or that checkpoint.

## 7. Keep the safety boundary intact

Do **not** manually replace `.project-brain/` files with files from another Livariant version. Do **not** manually copy a newer runtime into framework-managed lifecycle storage in order to simulate an update.

The supported lifecycle verifies release identity, artifact integrity, independent release authority, migration checkpoints, installed runtime integrity, activation state, and recovery evidence before protected state becomes active.

## Product identity note

The preliminary collision review and the decision to use **Livariant** are recorded in [`../distribution/product-naming-decision.md`](../distribution/product-naming-decision.md). The decision is a product/engineering decision, not a formal trademark-clearance opinion.

## Next reads

- [Installation & first project](installation.md)
- [Existing Projects](existing-projects.md)
- [Architecture & Safety](architecture-and-safety.md)
- [Provider Handoff](provider-handoff.md)
- [Updates, Migrations & Recovery](lifecycle-guide.md)
- [Preview Scope & Limitations](preview-scope.md)
