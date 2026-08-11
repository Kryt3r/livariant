---
type: POLICY
status: accepted
owner: core-governance
language: en
updated: 2026-08-11
---

# Localization Policy

## Principle

The Project Brain Framework is internationally usable by design.

Machine-facing framework truth remains language-stable and canonical. Human-facing communication is localized.

> Canonical framework rules are written in English. Human-facing documentation and interaction may be translated or localized without creating competing sources of truth.

## Canonical language

English is the canonical language for normative framework content, including:

- Core policies and standards,
- reusable Patterns,
- domain Profiles,
- tool/environment Adapters,
- specifications,
- internal identifiers,
- machine-consumed configuration keys.

Translations must never become an independent normative source.

## Human-facing documentation

Public documentation intended for people should be available in English by default and may provide maintained translations such as German.

Recommended convention:

- `README.md` — English default
- `README.de.md` — German translation
- `docs/en/...` — canonical public documentation
- `docs/de/...` — German translation

Translated documents should identify their canonical source and translation status where practical.

Example metadata:

```yaml
language: de
source: ../en/getting-started.md
translation_status: current
```

If translation and canonical source conflict, the canonical English source wins and the translation must be corrected.

## User interaction language

Agent questions, explanations, interactive setup prompts, CLI prompts, and other user-facing interaction should use the user's preferred language whenever possible.

Locale resolution order:

1. explicit user preference,
2. stored project/user preference,
3. language of the current interaction,
4. environment/system locale when available,
5. English fallback.

Automatic language detection may be used to avoid unnecessary setup friction, but a persistent preference should be confirmed when the framework first needs to store the choice.

Example:

> Detected language: German (de-DE). Use German for questions, explanations, and interactive output?

A confident detection should not force the user through an unnecessary language questionnaire.

## Separate language concerns

The framework distinguishes at least three language concepts:

```yaml
language:
  framework: en
  documentation: de
  interaction: de-DE
```

- `framework` — canonical machine-facing framework language; normally `en`.
- `documentation` — preferred language for human-readable guides and public docs.
- `interaction` — locale used by agents and interactive tools when communicating with the user.

These settings must not change stable internal identifiers.

For example, a localized German setup may display `Discord-Plattform`, while the stored identifier remains:

```yaml
profile: discord-platform
```

## Localized decisions and questions

When a framework gate requires human input, the semantic question is part of framework logic, but its rendered text should use the resolved interaction locale.

Conceptually:

```text
framework logic
    ↓
semantic question / decision key
    ↓
locale renderer
    ↓
human-facing language
```

This keeps decision logic stable while allowing international interaction.

## Translation freshness

Translations are derived artifacts and may become stale when their canonical source changes.

Current or future diagnostics such as `livariant doctor` should be able to detect outdated translations and report them without treating the translation as canonical truth.

Example:

```text
✓ English documentation current
⚠ German translation of migration-guide.md is outdated
```

## Development-phase rule

During early private foundation work, full duplication of every human-facing document was not required.

The resulting rule remains relevant for future translation expansion:

- normative Core remains English,
- English is the default canonical README/documentation source,
- additional translations are dependent current truth rather than independent normative sources,
- a public release must not claim maintained language support that its current translated user documentation does not actually provide.

This avoids unnecessary translation churn while preserving internationalization as a first-class architectural concern.
