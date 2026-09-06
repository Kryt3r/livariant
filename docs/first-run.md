# First-Run Composition

<p align="center">
  <strong>English</strong> · <a href="de/first-run.md">Deutsch</a>
</p>

`livariant first-run` is the **CLI** guided, read-only project-entry surface. It is separate from the current Desktop **Project Truth / First Steps** workspace.

The two surfaces share Livariant's preservation/trust model, but they are not interchangeable:

- CLI First Run composes read-only project/machine understanding and next-action guidance;
- Desktop First Steps / Project Truth is the graphical workspace and still contains renderer/session-state foundation behavior rather than a finished persistent Project Brain editor.

## Interaction localization

For deterministic CLI use, select a supported interaction locale explicitly:

```bash
livariant first-run --language English
livariant first-run --language Deutsch
```

English and German are built-in CLI interaction locales. Visible prompts, warnings, headings, explanations, and next-action descriptions use the selected supported locale.

Interaction localization remains separate from:

- Project Truth language/content;
- command names;
- machine identifiers/enums;
- provider protocol fields;
- Authority/trust evidence.

Language preference grants no Authority.

## Autonomy Profile choice

CLI First Run can include an Autonomy Profile choice:

- `ask-always` - stop before routine and important discretionary next steps;
- `ask-important` - continue routine/read-only work, stop before important/consequential discretionary decisions; balanced default;
- `continue-without-confirmation` - continue discretionary workflow decisions without extra confirmation where no hard Livariant Authority is required.

Example:

```bash
livariant first-run --language English --autonomy-profile ask-important
```

Autonomy is interaction policy, not hard Authority. Even the highest-autonomy profile cannot bypass mutation, Runtime, Guardian, lifecycle, or release Authority.

CLI First Run does not silently persist the selected profile.

## Project and machine readiness

CLI First Run inspects project state and the protected machine/Guardian readiness expected by the lower-level Core lifecycle.

It can distinguish states such as:

```text
protected bootstrap source missing
protected bootstrap source unsafe
guardian bootstrap required
guardian ready
unsupported Guardian platform
```

This inspection is read-only and grants no Authority.

> [!IMPORTANT]
> These lower-level Guardian readiness states are **not** the normal installation instructions for the current Windows Desktop Preview. Normal Desktop users should start with [Installation](installation.md). The CLI/Guardian path remains relevant for advanced Core/lifecycle workflows.

If protected state is unsafe or incomplete for a lifecycle operation, First Run must not advise bypassing it or present project mutation as immediately safe.

## Optional external knowledge

A supported local text/Markdown knowledge source can be attached read-only:

```bash
livariant first-run \
  --language English \
  --external-source-type local-directory \
  --external-source ../my-notes
```

External material remains External Evidence. It does not automatically become Project Truth or mutation Authority.

## Optional provider setup guidance

First Run can include provider setup guidance as a next action:

```bash
livariant first-run --language English --provider claude-code
livariant first-run --language English --provider codex
```

First Run does not execute provider setup and does not silently modify provider configuration.

The current Desktop has a separate live Codex connection surface. Additional Desktop providers/connection methods remain future extensions unless implemented and qualified.

## What CLI First Run does

CLI First Run can:

1. resolve interaction language;
2. surface/select an Autonomy Profile without silently turning it into Authority;
3. inspect project and current Project Brain state read-only;
4. inspect lower-level protected machine/Guardian readiness read-only;
5. optionally read supported External Knowledge through the safe adapter boundary;
6. compose Guided Project Understanding Review information;
7. report findings/open review items;
8. explain evidence/Project Truth and capability/Authority boundaries;
9. list next actions valid for the observed state.

## What CLI First Run does not do

It does **not**:

- initialize/rewrite Project Brain automatically;
- silently persist an Autonomy Profile;
- convert discovery/external evidence into Project Truth;
- configure Claude Code or Codex automatically;
- create mutation/Runtime/lifecycle/release Authority;
- repair unsafe protected state by guessing;
- make the current Desktop Project Truth renderer persistent;
- publish or install a release.

Human output remains a zero-change onboarding/inspection path. Machine-readable use is available with `--json` under the command's current deterministic-input requirements.

## Lifecycle next actions remain state-dependent

Where lower-level project initialization is appropriate and protected prerequisites are ready, the current lifecycle still separates:

```bash
livariant init
livariant init --authorize
livariant init --apply
```

First Run itself performs none of those mutations.

For the current normal Desktop flow use:

- [Installation](installation.md)
- [Five-Minute Quickstart](quickstart.md)
- [Existing Projects](existing-projects.md)

For lower-level trust/lifecycle details use:

- [Architecture & Safety](architecture-and-safety.md)
- [Updates, Migrations & Recovery](lifecycle-guide.md)
