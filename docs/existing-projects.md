# Existing Project Guide

Existing projects are a first-class use case. The framework is discovery-first and preservation-first: it should understand the project that exists before proposing framework-owned state.

## Safe adoption flow

From the project root:

```bash
livariant status
livariant doctor
livariant init
```

The inspection phase is read-only. Review the detected evidence and proposed Project Brain files before authorizing anything.

If initialization is applicable:

```bash
livariant init --apply
```

Supported adoption creates framework-owned Project Brain state. It does not reorganize source code, rewrite configuration, resolve contradictory documentation, ingest secrets, or replace existing agent instruction files simply to make the repository look cleaner.

> [!IMPORTANT]
> Existing project-owned files remain authoritative for their own domains unless Livariant has an explicit framework-owned contract for them. Discovery capability does not grant mutation authority.

## What the framework may observe

The current baseline can use direct project evidence such as a package name, source-directory presence, Git presence, and selected structural signals. It deliberately does not invent project goals or architectural intent from weak signals.

Malformed or conflicting evidence narrows what may be concluded. For example, a malformed `package.json` can be recorded as unreadable evidence rather than guessed through.

Sensitive-file presence such as `.env` may be observed as a safety signal. Secret contents are not adopted into Project Brain knowledge by the supported initialization path.

## Human-owned provider files

Existing `CLAUDE.md` and `AGENTS.md` remain project-owned. Their presence is detected, but supported adoption does not overwrite them or promote contradictory text from those files into canonical Project Brain truth.

Provider projections and provider-native memory are not competing Sources of Truth. The Project Brain remains the project-owned canonical truth for Livariant-managed project knowledge.

## Re-running initialization

Once a valid Project Brain exists, fresh initialization is no longer the supported action. Re-running `init --apply` must not overwrite or normalize it.

If the Brain is damaged, partial, drifted, or lifecycle recovery is required, use diagnosis first:

```bash
livariant doctor
livariant recover
```

> [!CAUTION]
> Do not delete or manually replace `.project-brain/` and initialize again as a repair technique. That would discard or reinterpret project history and bypass the supported lifecycle/recovery model.

Apply recovery only when Livariant reports a valid supported strategy:

```bash
livariant recover --apply
```

## Filesystem boundaries

Managed Project Brain write surfaces must be real files/directories inside their authorized project boundary. Symlinked canonical Brain files or lifecycle directories are rejected rather than followed for writes.

This is intentional: filesystem write capability must never expand semantic authority beyond the Project Brain storage boundary.
