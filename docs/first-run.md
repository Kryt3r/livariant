# First-Run Composition

`livariant first-run` is the guided entry point for bringing Livariant into a project without silently changing that project.

The command composes capabilities that already exist independently: read-only project discovery, initialization assessment, optional external knowledge evidence, Guided Project Understanding Review, and optional provider setup guidance.

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
2. inspects the project and current Project Brain state read-only;
3. optionally reads a supported external knowledge source through the existing safe adapter boundary;
4. builds the initial Guided Project Understanding Review;
5. reports how much is confirmed, inferred, uncertain, or still unknown;
6. explains that discovery and external material are evidence, not Project Truth;
7. lists the next explicit commands that may be useful.

## What First-Run does not do

First-Run does **not**:

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

Machine-readable use is available with `--json`. In JSON mode, `--language` is required so automated use cannot stall on an interactive prompt.

## The next authority boundaries remain separate

If Project Brain initialization is needed, First-Run may surface:

```bash
livariant init --apply
```

That command remains a separate explicit mutation authorization.

If Guided Project Understanding Review reveals unknowns, use the existing review flow to provide answers or corrections. Only reviewed candidate material may later enter Controlled Starting Understanding Adoption.

If native agent access is desired, run the separately surfaced provider setup command explicitly.

First-Run is therefore composition and guidance, not a shortcut around Livariant's safety model.
