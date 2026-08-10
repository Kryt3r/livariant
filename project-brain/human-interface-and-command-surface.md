# Human Interface, Localization, and Command Surface

## Purpose

The Project Brain Framework should be usable through project intent and canonical knowledge rather than through direct manipulation of storage files. Human-facing commands provide stable semantic entry points into the Project Brain while adapters may expose the same framework intents through provider-native interaction models.

The human interface must preserve the same framework semantics regardless of language, agent, provider, or storage layout.

> **The human interface operates on project intent and canonical knowledge, not on storage files. Commands provide stable semantic entry points while natural language, localization, impact analysis, and transparent explanation keep the Project Brain usable without requiring framework internals.**

## Command Namespace

The command namespace is product-defined and provider-independent.

During framework development, `pb` may be used as a placeholder namespace. It is not a permanent product decision. Before the first public product baseline, the namespace should be derived from the final product identity so that the CLI, documentation, package naming, and brand remain coherent.

Examples in this document use `<cmd>` to represent the product-defined namespace.

For example:

```text
<cmd> init
<cmd> resume
<cmd> status
<cmd> doctor
```

The namespace changes presentation, not command semantics.

## Provider-Independent Command Intent

Framework commands define provider-independent intents.

An adapter may expose a command through:

- a CLI,
- a native slash command,
- an agent skill,
- a tool call,
- a provider-native instruction surface,
- or natural-language intent recognition.

Adapters may translate the invocation mechanism but must not silently change the meaning, authority, or completion semantics of the command.

For example, `<cmd> resume` means conceptually:

> Restore the relevant canonical project context required to continue work safely and coherently.

Claude Code, Codex, a future agent runtime, and a standalone CLI may implement that intent differently while preserving the same framework meaning.

## Initial Command Surface

The first public baseline should keep the command surface intentionally small.

Recommended semantic entry points include:

- `<cmd> init` — run Bootstrap Discovery and initialize a Project Brain when appropriate,
- `<cmd> status` — show current project and framework state,
- `<cmd> resume` — restore the relevant continuation context for current work,
- `<cmd> project` — inspect or guide changes to project identity and project-level context,
- `<cmd> vision` — inspect or guide changes to product vision and intent,
- `<cmd> goals` — inspect or guide changes to current goals,
- `<cmd> decisions` — inspect or guide changes to durable decisions,
- `<cmd> knowledge` — inspect, explain, or propose changes to project knowledge,
- `<cmd> profile` — inspect Profile candidates, activation, and scope,
- `<cmd> explain` — explain project knowledge, decisions, requirements, or framework behavior with relevant evidence,
- `<cmd> doctor` — diagnose Project Brain, adapter, projection, compatibility, drift, or framework-state problems,
- `<cmd> design` — expose Design Intelligence where the concrete Project Brain provides a meaningful design knowledge surface.

The first baseline should not grow commands merely because a storage file or internal subsystem exists.

## Commands Are Semantic Operations, Not File Operations

A command such as:

```text
<cmd> goals
```

must not mean "open goals.md".

It means:

> Work with the canonical project-goal knowledge surface.

The framework may later migrate or reorganize physical storage without changing the human-facing semantic command contract.

The interface therefore abstracts storage layout from user intent.

## Natural Language Is a First-Class Interface

Users should not need to memorize commands for normal operation.

Natural-language requests such as:

- "Where did we leave off?"
- "Why are we using this architecture?"
- "Remember that we do not use third-party analytics for privacy reasons."
- "What are the current project goals?"

may map to the same semantic framework intents as `<cmd> resume`, `<cmd> explain`, `<cmd> knowledge`, or `<cmd> goals`.

The framework should prefer understandable interaction over complex flag syntax.

Avoid requiring interfaces such as:

```text
<cmd> knowledge --scope architecture --promote inference --confidence 0.83
```

when the same intent can be safely established through guided natural language.

## Proposed Changes, Not Silent Knowledge Mutation

A natural-language statement that appears to change durable Project Brain knowledge should be interpreted as a proposed knowledge mutation within the current authority model.

For example:

> "We are becoming multi-tenant."

may affect:

- project identity,
- SaaS Profile relevance,
- architecture assumptions,
- tenant-isolation constraints,
- security requirements,
- existing decisions,
- and future verification expectations.

The human interface should therefore perform proportional impact analysis before material knowledge changes rather than treating all natural-language statements as isolated text edits.

## Explainability

`<cmd> explain` should make the framework's reasoning inspectable without exposing opaque implementation details as authority.

Useful questions include:

- Why does this architecture exist?
- Why was this Pattern selected?
- Why is a security review required for this change?
- What evidence says this project uses Supabase?
- Which decision introduced this protected property?
- Why is this knowledge marked uncertain or conflicted?

Where useful, explanations should identify relevant provenance, decision ownership, freshness, and evidence.

The framework should prefer evidence-backed explanation over unexplained confidence.

## Doctor Semantics

`<cmd> doctor` is a diagnostic interface, not an unrestricted repair mechanism.

It may diagnose conditions such as:

- damaged or incomplete Project Brain structure,
- conflicting project knowledge,
- stale native instruction projections,
- missing or unavailable adapters,
- unresolved Profile or Pattern references,
- compatibility problems,
- stale framework metadata,
- project-state drift,
- or evidence that observed project reality no longer matches durable knowledge.

A useful diagnostic result follows the structure:

```text
Finding
→ likely impact
→ evidence
→ recommended action
```

Any persistent repair still follows normal project mutation safety and authority rules.

## Localization

Human-facing interaction must be localizable without changing canonical semantics.

The framework should separate:

```text
Canonical framework semantics
→ language-independent meaning

Human interface
→ localized representation
```

Equivalent project facts expressed in German, English, or another supported language must not acquire different framework meaning merely because the interface language differs.

Project-owned content may remain in the language appropriate to the project and its users.

Localization may adapt wording, examples, terminology guidance, and explanatory style, but may not redefine governance, command semantics, Project Brain ownership, or knowledge authority.

## Stable Interface, Evolvable Storage

The human interface should remain stable even if internal Project Brain storage evolves.

This supports future migration and versioning work because users interact with semantic concepts such as goals, decisions, knowledge, status, and resume intent rather than hard-coded file paths.

## Boundary with Adapters

The Project Brain Framework owns command meaning.

Adapters own environment-specific exposure and execution mapping.

An adapter may provide:

- a Claude Code skill,
- a Codex-native tool,
- a shell command,
- or another provider-native mechanism,

but it does not gain authority to redefine `<cmd> resume`, `<cmd> doctor`, `<cmd> explain`, or other framework intents.

## Anti-Goals

The human interface should not become:

- a large command taxonomy mirroring every internal subsystem,
- a requirement for users to understand Markdown storage,
- a provider-specific command language,
- a complex flag-driven knowledge-management shell,
- a second source of project truth,
- or an automatic repair engine that bypasses project mutation safety.

## Core Rules

> **Command semantics belong to the framework; invocation syntax belongs to the product and environment.**

> **The development namespace `pb` is a placeholder, not a permanent product commitment.**

> **Natural language and native agent interfaces may invoke framework intents without requiring users to memorize commands.**

> **Localization changes representation, not canonical meaning.**

> **Human-facing knowledge edits remain governed project mutations, not direct file edits.**
