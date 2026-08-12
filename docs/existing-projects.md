# Existing Project Guide

You do not need a fresh repository to start using Livariant. Existing projects are a normal use case.

Livariant inspects the project first and tries to preserve what is already there. It should not reorganize your repository simply to make it look more like a Livariant project.

## Safe adoption flow

From the project root:

```bash
livariant status
livariant doctor
livariant init
```

These commands let you inspect the project before any Livariant-managed state is created.

`livariant init` without `--apply` is read-only planning. Review what Livariant detected and which Project Brain files it proposes to create.

If the plan is correct:

```bash
livariant init --apply
```

Supported initialization adds the Project Brain. It does not automatically:

- reorganize your source code;
- rewrite configuration files;
- resolve contradictory documentation;
- copy secrets into the Project Brain;
- replace existing agent instruction files just to make the repository cleaner.

> [!IMPORTANT]
> Existing project-owned files remain under project ownership. Livariant being able to inspect a file does not give it permission to rewrite that file.

## After adoption: add only confirmed project truth

Initialization does not mean Livariant now watches the project or decides what belongs in the Project Brain. You choose what becomes durable project truth.

Inspect the current semantic state with:

```bash
livariant goals
livariant knowledge
livariant decisions
```

When something is confirmed and should survive future AI sessions, plan the change first:

```bash
livariant goals add "Keep backward compatibility during the migration"
livariant knowledge add "The existing API is used by the mobile client"
livariant decisions add "Keep the current API shape for the Preview"
```

These commands do not write until you repeat the chosen command with `--apply`.

This matters especially for existing projects. Livariant should not convert guesses from repository discovery into project truth. Discovery helps with safe adoption; semantic Project Brain changes remain explicit and authorized.

If an accepted decision later changes, supersede it instead of deleting history:

```bash
livariant decisions
livariant decisions supersede <decision-id> "Adopt the new API shape" --reason "Migration completed"
```

Review the supersession first and add `--apply` only when it is correct.

## What Livariant can notice during discovery

The current baseline can use direct evidence such as:

- a package name from valid package metadata;
- the presence of source directories;
- whether the directory is a Git repository;
- selected structural signals relevant to supported initialization.

Livariant deliberately avoids inventing project goals or architecture from weak hints.

If evidence is malformed or contradictory, Livariant narrows what it claims to know. For example, a malformed `package.json` can be reported as unreadable instead of being guessed through.

Livariant may notice that a sensitive file such as `.env` exists because that matters for safe discovery. The supported initialization path does not copy secret contents into Project Brain knowledge.

## Existing Claude Code and Codex files

Files such as `CLAUDE.md` and `AGENTS.md` remain project-owned.

Livariant can detect that they exist, but supported adoption does not overwrite them. Text in those files also does not become canonical Project Brain truth merely because a provider uses it.

Provider memory and Resume projections are useful working context, not competing project records.

After you explicitly record confirmed goals, knowledge, or decisions through Livariant, a new `livariant resume` is generated from the current Project Brain rather than from stale provider memory.

## Do not initialize again as a repair method

Once a valid Project Brain exists, fresh initialization is no longer the normal action.

Running `init --apply` again must not overwrite or normalize an existing valid Project Brain.

If the Project Brain is damaged, partial, drifted, or waiting for lifecycle recovery, diagnose first:

```bash
livariant doctor
livariant recover
```

> [!CAUTION]
> Do not delete or manually replace `.project-brain/` and then run initialization again as a repair shortcut. That can discard project history and bypass the supported recovery model.

Apply recovery only when Livariant reports a valid supported strategy:

```bash
livariant recover --apply
```

## Filesystem boundaries

Livariant-managed Project Brain files and lifecycle directories must stay inside the authorized project boundary.

If a canonical Project Brain file or managed lifecycle directory is replaced with a symlink that would redirect writes elsewhere, Livariant rejects that write path instead of following it.

This keeps filesystem access from silently expanding Livariant's authority beyond the Project Brain storage boundary.
