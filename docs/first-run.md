# First-Run Composition

`livariant first-run` is the guided, read-only entry point for bringing Livariant into a project without silently changing that project.

The remediated First Run composes project discovery, initialization assessment, Autonomy Profile selection, optional external knowledge evidence, Guided Project Understanding Review, provider setup guidance **and machine Guardian readiness**.

## Interaction localization

For deterministic use, provide the preferred interaction language explicitly:

```bash
livariant first-run --language English
livariant first-run --language Deutsch
```

English and German are built-in supported CLI interaction locales in the WP-044 remediation. When either is selected, user-facing First-Run prompts, warnings, headings, explanations and next-action descriptions use that language from the first localized prompt onward.

Common aliases such as `en`, `en-US`, `de`, `de-DE`, `English` and `Deutsch` resolve to the corresponding locale.

A language that is not yet implemented as a CLI locale may still be preserved as the preferred interaction-language value for machine-readable/project context, but the CLI explicitly reports that its visible UI is falling back to English. Livariant does not pretend that arbitrary languages are fully localized when they are not.

Interaction localization is separate from:

- Project Truth language;
- command names;
- machine identifiers and enum values;
- provider protocol fields;
- Authority or trust evidence.

Language preference grants no Authority.

## Choose how often the agent should ask

First Run includes an Autonomy Profile choice:

- `ask-always` - stop before routine and important discretionary next steps;
- `ask-important` - continue routine/read-only work, stop before important or consequential discretionary decisions; balanced default;
- `continue-without-confirmation` - continue discretionary workflow decisions without extra confirmation where no hard Livariant Authority is required.

Example:

```bash
livariant first-run --language English --autonomy-profile ask-important
```

The highest-autonomy profile requires explicit risk acknowledgement in deterministic/non-interactive use:

```bash
livariant first-run \
  --language English \
  --autonomy-profile continue-without-confirmation \
  --acknowledge-autonomy-risk \
  --json
```

Autonomy Profile != Authority. Even `continue-without-confirmation` cannot bypass mutation authorization, Runtime Authority, Guardian Authority or Release Authority.

First Run does not persist the profile. Persistent Autonomy Profile state remains a separate explicit machine-local action bound to a stable project identity.

## Machine readiness is part of onboarding

First Run now inspects the protected machine lifecycle foundation as well as the project.

The report distinguishes at least these states:

```text
protected bootstrap source missing
protected bootstrap source unsafe
guardian bootstrap required
guardian ready
unsupported Guardian platform
```

This inspection is read-only and grants no Authority.

### Fresh supported machine

If the protected Stage-A source has not been provisioned, First Run must direct the user to the verified protected installation path. It must **not** present `livariant init --authorize` or `livariant init --apply` as the immediate lifecycle path.

If Stage A is ready but Guardian has not yet been bootstrapped, First Run points to the protected Stage-B flow.

If protected state is `unsafe`, First Run stops lifecycle guidance rather than blessing, repairing or trusting the state by presence.

Only after Guardian readiness is established may First Run surface the normal project initialization sequence.

See [Installation & First Project](installation.md) for the Stage-A/Stage-B trust path.

## Add an existing Second Brain optionally

A supported local text/Markdown knowledge source can be attached read-only:

```bash
livariant first-run \
  --language English \
  --external-source-type local-directory \
  --external-source ../my-notes
```

External material remains External Evidence. It does not become Project Truth and cannot be adopted directly.

## Surface a provider setup path

You may ask First Run to include the separate MCP setup command as an optional next step:

```bash
livariant first-run --language English --provider claude-code
livariant first-run --language English --provider codex
```

First Run does not execute provider setup and performs zero provider-configuration writes.

## What First Run does

First Run:

1. resolves the preferred interaction language and supported CLI locale;
2. surfaces/selects an Autonomy Profile without persisting it;
3. inspects the project and current Project Brain state read-only;
4. inspects protected bootstrap/Guardian machine readiness read-only;
5. optionally reads a supported external knowledge source through the safe adapter boundary;
6. builds the initial Guided Project Understanding Review;
7. reports concrete findings and open review items;
8. explains evidence/Project Truth and capability/Authority boundaries;
9. lists only next actions that are valid for the current machine/project state.

## What First Run does not do

First Run does **not**:

- provision Stage A;
- bootstrap Guardian;
- create Guardian/lifecycle Authority;
- persist the Autonomy Profile;
- create or rewrite Project Brain state;
- run `init --authorize` or `init --apply` automatically;
- convert discovery or external evidence into Project Truth;
- create adoption candidates from raw external text;
- configure Claude Code or Codex;
- grant Runtime or Release Authority;
- treat a protected-looking path as trusted merely because it exists.

Human output ends with zero changes (`Changes made: 0` in English; localized equivalent in German).

Machine-readable use is available with `--json`. In JSON mode `--language` remains required so automated use cannot stall on an interactive prompt. The report preserves stable machine identifiers while exposing interaction-locale state separately.

## Lifecycle next actions remain state-dependent

When Guardian is not ready, First Run surfaces machine preparation/diagnostic actions rather than project lifecycle authorization.

When Guardian is ready and Project Brain initialization is needed, the safe sequence remains explicit:

```bash
livariant init
livariant init --authorize
livariant init --apply
```

The plan, authorization and application remain distinct operations. First Run itself performs none of them.

After a stable project identity exists, First Run may separately surface Autonomy Profile persistence, for example:

```bash
livariant autonomy set --profile ask-important
```

That changes machine-local preference state only; it grants no mutation, Runtime, Guardian or Release Authority.

First Run is therefore composition and state-aware guidance, not a shortcut around Livariant's safety model.
