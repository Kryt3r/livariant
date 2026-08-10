# Existing Project Guide

Existing projects are a first-class use case. The framework is discovery-first and preservation-first: it should understand the project that exists before proposing framework-owned state.

## Safe adoption flow

From the project root:

```bash
pb-dev status
pb-dev doctor
pb-dev init
```

The inspection phase is read-only. Review the detected evidence and proposed Project Brain files before authorizing anything.

If initialization is applicable:

```bash
pb-dev init --apply
```

Supported adoption creates framework-owned Project Brain state. It does not reorganize source code, rewrite configuration, resolve contradictory documentation, ingest secrets, or replace existing agent instruction files simply to make the repository look cleaner.

## What the framework may observe

The current baseline can use direct project evidence such as a package name, source-directory presence, Git presence, and selected structural signals. It deliberately does not invent project goals or architectural intent from weak signals.

Malformed or conflicting evidence narrows what may be concluded. For example, a malformed `package.json` can be recorded as unreadable evidence rather than guessed through.

Sensitive-file presence such as `.env` may be observed as a safety signal. Secret contents are not adopted into Project Brain knowledge by the supported initialization path.

## Human-owned provider files

Existing `CLAUDE.md` and `AGENTS.md` remain project-owned. Their presence is detected, but supported adoption does not overwrite them or promote contradictory text from those files into canonical Project Brain truth.

## Re-running initialization

Once a valid Project Brain exists, fresh initialization is no longer the supported action. Re-running `init --apply` must not overwrite or normalize it.

If the Brain is damaged, partial, drifted, or lifecycle recovery is required, use diagnosis first:

```bash
pb-dev doctor
```

Do not delete `.project-brain/` and initialize again as a repair technique. That would discard project history and bypass the lifecycle/recovery model.

## Filesystem boundaries

Managed Project Brain write surfaces must be real files/directories inside their authorized project boundary. Symlinked canonical Brain files or lifecycle directories are rejected rather than followed for writes.

This is intentional: filesystem write capability must never expand semantic authority beyond the Project Brain storage boundary.
