# Livariant Five-Minute Quickstart

Livariant gives an AI-assisted software project a persistent, project-owned source of truth called the **Project Brain**. It is designed to keep project identity, confirmed goals, accepted decisions, known facts, unresolved unknowns, lifecycle state, and provider handoff context coherent across sessions and supported coding agents.

## Before you start

Current executable baseline requirements:

- Node.js 20 or newer,
- a local project directory,
- the Livariant package/release artifact for the current Preview candidate.

The repository package identity and installed CLI namespace are both `livariant`. The package remains private during Public Preview preparation; do not publish a package-manager installation command until the public distribution source itself is finalized.

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

The provider output is an ephemeral projection of canonical Project Brain state. It is not a second source of truth and does not gain authority from provider memory or from `CLAUDE.md` / `AGENTS.md`.

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

If the target changes Project Brain schema, `livariant update` routes through the supported migration lifecycle automatically. Do not manually edit schema/version metadata and do not run a separate ad-hoc migration.

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

A missing, moved, tampered, or ambiguous checkpoint is not guessed through. Automatic recovery remains blocked and diagnosis stays visible.

## 7. Keep the safety boundary intact

Do **not** manually replace `.project-brain/` files with files from another Livariant version. Do **not** manually copy a newer runtime into framework-managed lifecycle storage in order to simulate an update.

The supported lifecycle verifies release identity, artifact integrity, migration checkpoints, installed runtime integrity, activation state, and recovery evidence before protected state becomes active.

## Product identity note

The preliminary collision review and the decision to use **Livariant** are recorded in [`../distribution/product-naming-decision.md`](../distribution/product-naming-decision.md). The decision is a product/engineering decision, not a formal trademark-clearance opinion.

## Next reads

- [Existing Projects](existing-projects.md)
- [Architecture & Safety](architecture-and-safety.md)
- [Provider Handoff](provider-handoff.md)
- [Updates, Migrations & Recovery](lifecycle-guide.md)
- [Preview Scope & Limitations](preview-scope.md)
