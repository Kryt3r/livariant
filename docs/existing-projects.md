# Existing Project Guide

<p align="center">
  <strong>English</strong> · <a href="de/existing-projects.md">Deutsch</a>
</p>

Existing projects are a core Livariant use case. Livariant is preservation-first: it should inspect what already exists before proposing new managed state, and it must not reorganize a repository merely to make it look like a Livariant project.

> [!IMPORTANT]
> The **normal end-to-end Desktop existing-project adoption path is still being completed**. The current Project Truth / First Steps renderer is useful foundation UI, but it is not yet a finished persistent Project Brain adoption editor. The lower-level Core/CLI contracts below describe the current explicit project-state boundaries.

## Inspect before adoption

From the project root, current Core/CLI inspection can start with:

```bash
livariant status
livariant doctor
livariant init
```

`livariant init` without authorization/application is plan-first and read-only. Review what Livariant detected and which managed Project Brain state it proposes.

Initialization must not silently:

- reorganize source code;
- rewrite unrelated configuration;
- resolve contradictory documentation by guessing;
- copy secrets into Project Brain;
- replace `CLAUDE.md`, `AGENTS.md`, or other provider instruction files;
- treat discovery evidence as already accepted Project Truth.

## Initialization requires the current lifecycle Authority path

A bare `--apply` is not lifecycle Authority.

Where the current protected lifecycle prerequisites are ready, the explicit sequence is:

```bash
livariant init
livariant init --authorize
livariant init --apply
```

The plan, authorization, and apply phases are separate. Authority is bound to the exact physical project, operation, and material; stale or mismatched material must fail closed.

If protected Guardian/machine prerequisites are not ready, do not bypass them by editing state or copying package files into protected locations. Diagnose the machine/project state first.

See [Installation](installation.md), [First Run](first-run.md), and [Updates, Migrations & Recovery](lifecycle-guide.md).

## Discovery is evidence, not Project Truth

Livariant can use bounded direct evidence such as:

- valid package metadata;
- repository/directory structure relevant to supported discovery;
- Git-repository presence/state;
- selected provider instruction-file presence;
- supported project/lifecycle signals.

It should narrow claims when evidence is malformed or contradictory instead of guessing through it.

For example, a malformed `package.json` can be reported as unreadable. The presence of `.env` can matter for safe discovery without copying secret contents into Project Brain.

## Existing provider files remain project-owned

Files such as `CLAUDE.md` and `AGENTS.md` remain project-owned evidence/instruction surfaces.

Livariant can notice them, but their text does not become canonical Project Truth merely because a provider uses it. Provider memory and agent output likewise do not outrank accepted Project Brain state.

The intended adoption direction is:

```text
inspect
-> discover evidence
-> understand / review
-> propose candidate knowledge
-> explicitly adopt where supported
```

not:

```text
scan repository
-> guess truth
-> rewrite project
```

## After a Project Brain exists

A Project Brain owns only the durable context domains Livariant explicitly manages:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

Semantic change follows the current proposal/review/Authority model. Legacy-looking `--apply` convenience must not be read as permission to bypass protected semantic mutation Authority.

Use the current semantic proposal, conflict/drift assessment, controlled-adoption, and semantic-maintenance surfaces rather than manually editing managed state or relying on stale examples from older release documentation.

Relevant guides:

- [Semantic Proposal Core](semantic-proposal-core.md)
- [Conflict & Drift Assessment](conflict-drift-assessment.md)
- [Controlled Understanding Adoption](controlled-understanding-adoption.md)
- [Semantic Maintenance](semantic-maintenance.md)

## Do not re-initialize as repair

Once a valid Project Brain exists, fresh initialization is not the normal repair action.

If project/lifecycle state is damaged, partial, drifted, or recovery-required, inspect first:

```bash
livariant doctor
livariant recover
```

> [!CAUTION]
> Do not delete or manually replace `.project-brain/` and then run initialization again as a shortcut. That can discard history and bypass supported recovery/integrity boundaries.

If Livariant reports a supported recovery strategy that requires protected authorization, follow the exact recovery authorization/application path rather than using a bare apply from an older example.

## Filesystem and Authority boundaries

Livariant-managed Project Brain/lifecycle state must stay inside the authorized project boundary.

Symlink/topology/path substitutions that would redirect a managed write outside the allowed boundary are rejected by the supported hardened paths.

Permanent rules include:

```text
Capability != Authority
Evidence != Project Truth
Proposal != Authorization
Existing project file != Livariant-managed canonical state
```

## Desktop direction

The current Desktop already provides Project Truth / First Steps UI, connection management, Diagnostics, Updates, and Settings. The next adoption work is to connect the normal existing-project flow more completely without creating a second source of truth or bypassing the single mutation/Authority model.

That future integration is planned direction, not a claim that the current renderer already persists all adoption decisions.
