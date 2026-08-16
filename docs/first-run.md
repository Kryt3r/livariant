# First-Run Composition

`livariant first-run` is the guided entry point for bringing Livariant into a project without silently changing that project.

The command composes capabilities that already exist independently: read-only project discovery, initialization assessment, Autonomy Profile selection, optional external knowledge evidence, Guided Project Understanding Review, and optional provider setup guidance.

## Start with a language preference

Interactive use asks for the preferred interaction language first.

For deterministic or agent-driven use, provide it explicitly:

```bash
livariant first-run --language English
livariant first-run --language Deutsch
livariant first-run --language Español --json
```

The language value is a communication preference only. It is not trust evidence and grants no authority.

The current CLI records and reports the preference so a human or connected agent can carry it through the onboarding experience. Built-in deterministic CLI labels are not automatically translated into every possible language by Livariant itself.

## Choose how often the agent should ask

First-Run now includes an Autonomy Profile choice:

- `ask-always` - stop before routine and important discretionary next steps;
- `ask-important` - continue routine/read-only work, stop before important or consequential discretionary decisions; this is the balanced default;
- `continue-without-confirmation` - continue through discretionary workflow decisions without extra confirmation where no hard Livariant Authority is required.

Example:

```bash
livariant first-run --language English --autonomy-profile ask-important
```

The highest-autonomy profile requires a clear risk acknowledgement in deterministic/non-interactive use:

```bash
livariant first-run \
  --language English \
  --autonomy-profile continue-without-confirmation \
  --acknowledge-autonomy-risk \
  --json
```

Autonomy Profile != Authority. Even `continue-without-confirmation` cannot bypass mutation authorization, Semantic Apply validation, Runtime Authority, or Release Authority.

First-Run does not persist the profile. It remains read-only and surfaces a separate explicit `livariant autonomy set ...` next step. Persistent profile state is machine-local and bound to the stable project identity.

See [Autonomy Profiles](autonomy-profiles.md) for the complete behavior and trust model.

## Add an existing Second Brain optionally

A supported local text/Markdown knowledge source can be attached read-only:

```bash
livariant first-run \
  --language English \
  --external-source-type local-directory \
  --external-source ../my-notes
```

External material remains External Evidence. It does not become Project Brain truth and cannot be adopted directly.

## Surface a provider setup path

You may ask First-Run to include the separate MCP setup command as an optional next step:

```bash
livariant first-run --language English --provider claude-code
livariant first-run --language English --provider codex
```

First-Run does not execute provider setup. It only tells you which explicit command would do so.

## What First-Run does

First-Run:

1. establishes the preferred interaction language;
2. surfaces/selects an Autonomy Profile without persisting it;
3. inspects the project and current Project Brain state read-only;
4. optionally reads a supported external knowledge source through the existing safe adapter boundary;
5. builds the initial Guided Project Understanding Review;
6. reports concrete findings and open review items;
7. explains that discovery and external material are evidence, not Project Truth;
8. lists the next explicit commands that may be useful.

## What First-Run does not do

First-Run does **not**:

- persist the Autonomy Profile;
- grant Authority through the Autonomy Profile;
- run `livariant init --apply`;
- create or rewrite Project Brain state;
- turn discovery into Project Truth;
- turn external evidence into Project Truth;
- create adoption candidates from raw external text;
- adopt candidate evidence;
- configure Claude Code or Codex;
- grant Runtime Authority;
- grant Release Authority.

Human output ends with `Changes made: 0`.

Machine-readable use is available with `--json`. In JSON mode, `--language` is required so automated use cannot stall on an interactive prompt. High-autonomy selection additionally requires `--acknowledge-autonomy-risk`.

## The next authority boundaries remain separate

If Project Brain initialization is needed, First-Run may surface:

```bash
livariant init --apply
```

That command remains a separate explicit mutation authorization.

After a stable project identity exists, First-Run may surface the explicit machine-local profile persistence command, for example:

```bash
livariant autonomy set --profile ask-important
```

That changes machine-local preference state only. It does not grant mutation, Runtime, or Release Authority.

If Guided Project Understanding Review reveals unknowns, use the existing review flow to provide answers or corrections. Only reviewed candidate material may later enter Controlled Starting Understanding Adoption.

If native agent access is desired, run the separately surfaced provider setup command explicitly.

First-Run is therefore composition and guidance, not a shortcut around Livariant's safety model.
