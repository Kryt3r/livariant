---
type: framework-layer-policy
status: accepted
domain: project-brain
language: en
owner: framework
foundation: FOUNDATION-09B
---

# Project-Type Detection & Declaration

Project identity must be grounded in evidence and human intent rather than inferred mechanically from installed technologies.

> **Project types are discovered as evidence-backed candidates and become durable project identity only through explicit declaration or sufficiently authoritative project knowledge; technologies alone never define project identity.**

## Purpose

Bootstrap Discovery may reveal technologies, repository structure, documentation, runtime surfaces, and domain signals. These are inputs to project-type reasoning, not project identity by themselves.

The framework must distinguish:

- what was directly observed,
- what project types are plausible candidates,
- what the human or authoritative project knowledge declares,
- and which Profiles are activated afterward.

These are separate stages.

## Detection Pipeline

Conceptually:

```text
Observed repository / environment evidence
→ Detected Project Signals
→ Candidate Project Types
→ Human / authoritative declaration
→ Declared Project Type(s)
→ independent Profile activation
```

No stage may silently collapse into the next.

## Detected Project Signals

Detected Project Signals are concrete or evidence-backed observations such as:

- frameworks and package metadata,
- language and build configuration,
- repository topology,
- application entry points,
- service boundaries,
- deployment configuration,
- platform SDKs,
- database or infrastructure integrations,
- existing architecture or product documentation,
- explicit project descriptions,
- recurring domain concepts in accepted project knowledge.

Signals should retain source and confidence where useful.

## Candidate Project Types

Candidate Project Types are hypotheses derived from signals.

Examples may include:

- Web Application,
- API / Backend Service,
- SaaS,
- Discord Platform,
- Mobile Application,
- Game Development,
- CLI / Developer Tool,
- library or package,
- multi-surface product.

A candidate is not durable project truth.

The framework should be able to explain why a candidate exists, especially where the classification affects initialization, Profile activation, or future workflow.

## Technology Does Not Define Identity

Technologies are evidence, not project identity.

Examples:

```text
React
≠ automatically Web Application

Supabase
≠ automatically SaaS

Stripe
≠ automatically commerce product

PostgreSQL
≠ automatically backend-service project

Discord SDK
≠ automatically a Discord-first product
```

A technology may support multiple project types or exist in a subsystem unrelated to the project's primary identity.

## Declared Project Identity

Declared Project Type(s) represent durable project knowledge.

Declaration may come from:

- explicit human confirmation,
- already accepted Project Brain knowledge,
- authoritative existing project documentation whose ownership and freshness are sufficiently clear,
- another project-owned source that unambiguously establishes intent.

Where evidence is weaker or conflicting, the framework should preserve the state as candidate, partial, uncertain, or unknown rather than promoting inference into project truth.

## Multiple Project Types

The framework must not force every project into exactly one type.

A project may have:

- one primary project type,
- additional domain types,
- subsystem-specific types,
- or a deliberately composite identity.

For example:

```text
Project:
SaaS Web Application

Subsystem:
Discord Bot

Backend:
API Service
```

The useful representation is the smallest structure that accurately captures real product and subsystem identity. Avoid classification complexity that does not improve reasoning.

## Primary Type Is Descriptive, Not Hierarchical

A primary project type may help bootstrap interaction, documentation, and default context selection.

It does not automatically outrank other applicable domain constraints or Profiles.

Project-type labels must not create a hidden priority order across Profiles, Patterns, or project decisions.

## Project Type and Profile Activation Are Separate

Declared project identity may create strong Profile candidates, but declaration alone does not bypass the Profile activation contract.

For example:

```text
Declared project identity:
Discord-integrated SaaS web application

Possible Profile candidates:
- Web Application
- SaaS
- Discord Platform

Activation:
performed according to Profile applicability, scope, provenance, and authority rules
```

This keeps Project Brain identity separate from reusable domain specialization.

## Human Declaration and Constructive Dissent

Human declaration is authoritative for project intent, but the framework should surface material contradictions with observed project reality.

Example:

```text
Framework candidate:
SaaS

Human declaration:
Internal single-user application

Observed evidence:
Explicit tenant-isolation architecture exists
```

The framework should accept the declared intent while surfacing the contradiction for clarification rather than silently overriding either side.

Constructive dissent means:

- do not fight the human over harmless classification differences,
- do surface evidence that materially affects architecture, safety, data boundaries, or future work,
- do not mutate existing implementation merely to make it fit the declared label.

## Knowledge States

Project-type knowledge may remain incomplete.

Useful states include:

- `declared` — durable identity has been established,
- `partially_declared` — some identity is known while relevant dimensions remain open,
- `candidate_only` — evidence suggests one or more types but no durable declaration exists,
- `unknown` — available evidence is insufficient for useful classification.

These states are semantic outcomes, not requirements for a specific storage format.

Unknown is valid project knowledge.

## Progressive Refinement

Initialization does not need to resolve every project-type question.

A project may begin with partial identity and refine it later as:

- the human clarifies product intent,
- new subsystems appear,
- architecture becomes concrete,
- accepted project knowledge improves,
- or previously unknown information becomes observable.

Later refinement must not silently rewrite unrelated project decisions or activate new Profiles without their normal rules.

## Existing Projects

For existing projects, project-type reasoning begins from read-only Bootstrap Discovery.

The framework should prefer existing project evidence over generic templates and must not restructure the repository merely because another layout better matches a detected project type.

Classification is descriptive intelligence first, not a migration command.

## Initialization Behavior

Before durable initialization decisions depend on project type, the human interface should make material uncertainty understandable.

For example:

```text
Detected:
- Next.js
- Supabase
- Discord SDK

Likely candidates:
- Web Application
- Discord Platform
- possibly SaaS

Unknown:
- whether tenant behavior is product intent
- whether Discord is primary or auxiliary
```

The interface may offer a sensible proposed declaration but must not present uncertain inference as established fact.

## Anti-Patterns

Avoid:

- treating package names as project identity,
- forcing one universal project-type taxonomy onto every repository,
- silently promoting candidates into durable Project Brain truth,
- automatically activating Profiles because a technology is present,
- assuming a repository root represents the identity of every subsystem,
- overriding explicit human intent without surfacing the evidence conflict,
- accepting a human label while hiding materially contradictory architecture,
- requiring complete classification before useful initialization can begin,
- restructuring an existing project to make it resemble the inferred type.

## Core Principles

> **Project types are discovered as evidence-backed candidates and become durable project identity only through explicit declaration or sufficiently authoritative project knowledge; technologies alone never define project identity.**

> **Detection, declaration, and Profile activation are separate decisions.**

> **A project may have multiple meaningful types across project and subsystem scopes.**

> **Unknown or partially known identity is valid and may be refined progressively.**

> **Project-type classification describes project reality; it does not grant authority to reshape that reality.**
