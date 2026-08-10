---
type: framework-layer-policy
status: accepted
domain: adapters
language: en
owner: framework
foundation: FOUNDATION-08A
---

# Adapter System

## Adapter Identity & Ownership Boundary

Adapters translate framework intent into concrete environment-, provider-, platform-, or tool-specific capability and execution behavior.

> Adapters translate framework intent into environment-specific capabilities and execution; they do not redefine the intent, governance, or authority they carry.

## What an Adapter is

An Adapter is a reusable integration layer between framework-owned reasoning and a concrete execution environment.

Examples may include:

- Claude Code,
- Codex,
- GitHub,
- Vercel,
- Supabase,
- IDE or CLI environments,
- agent runtimes,
- external tool or provider surfaces.

An Adapter may contribute, where materially relevant:

- capability discovery and capability metadata,
- mapping from framework operations to concrete tools or APIs,
- provider- or environment-specific constraints,
- instruction-file translation or generation,
- execution and handoff mechanics,
- failure, degradation, and fallback information,
- environment detection,
- provider/model/tool availability information,
- compatibility and conformance evidence.

## Layer ownership

Conceptually:

```text
Core
↓
universal governance, authority, trust, security, quality and runtime semantics

Patterns
↓
reusable intelligence for recurring solution spaces

Profiles
↓
domain-specific specialization and domain risk intelligence

Adapters
↓
translation into concrete tools, providers and execution environments

Project Brain
↓
project-specific intent, decisions and accepted state
```

This ordering expresses semantic ownership, not a blanket priority ranking.

## Governance boundary

Adapters do not own framework governance.

An Adapter must not redefine:

- authorization policy,
- security invariants,
- project ownership,
- runtime authority,
- review policy,
- architectural decision policy,
- or domain-specific requirements owned elsewhere.

For example, a Claude Code Adapter must not establish a separate security model for Claude Code. It may explain how existing framework security and authority rules are represented and enforced in that environment.

## Capability is not authority

An Adapter may expose that an environment is technically capable of an action without granting permission to perform that action.

Examples:

```text
Adapter capability
→ repository write access is available

Runtime authority
→ current agent may not modify protected files
```

or:

```text
Adapter capability
→ deployment tool is installed

Project / runtime authority
→ production deployment is not authorized
```

The existence of a tool, API, model, credential, or write path must never be interpreted as permission by itself.

> Capability metadata informs routing; authority remains governed by Core and project state.

## Translation rather than reinterpretation

Adapters should preserve the meaning of framework intent across environments.

A healthy Adapter answers questions such as:

- Which native capability implements this framework operation?
- Which environment constraint changes how execution must occur?
- Which instruction format best preserves framework semantics here?
- Which capabilities are missing or degraded?
- Which provider-specific failure behavior must the Runtime know about?

It should not independently decide:

- which architecture the project should adopt,
- which Profile or Pattern should govern the project,
- which security requirement applies,
- which agent has authority,
- or whether project intent should be changed.

Those decisions remain owned by the appropriate framework layer.

## Provider-specific constraints

Concrete environments may impose real constraints that the Adapter must surface.

Examples include:

- supported tool-call semantics,
- context or payload limits,
- filesystem restrictions,
- authentication modes,
- rate limits,
- execution sandbox boundaries,
- model or tool availability,
- native instruction-file precedence,
- asynchronous or synchronous execution constraints.

Surfacing these constraints does not give the Adapter authority to weaken framework requirements.

If an environment cannot satisfy an applicable requirement, the Adapter must report the mismatch so the Runtime can degrade, reroute, escalate, or stop according to existing governance.

## Runtime boundary

The Studio Runtime remains responsible for orchestration, routing, proportionality, authority resolution, and deciding whether an available Adapter capability should be used.

An Adapter may provide structured signals such as:

- capability available,
- capability unavailable,
- capability degraded,
- action requires external confirmation,
- environment constraint detected,
- provider failure encountered,
- alternative execution path available.

The Runtime decides what to do with those signals.

Adapters must not become hidden secondary orchestrators.

## Profile and Pattern boundary

Adapters translate Profiles and Patterns into environment-specific execution only where needed.

They do not absorb reusable domain or solution-space knowledge merely because that knowledge is frequently exercised through a particular tool.

For example:

- Discord platform semantics belong to the Discord Profile,
- generic authorization-model reasoning belongs to a Permissions Pattern,
- Discord SDK commands or concrete API invocation details belong in the relevant Adapter or implementation environment.

## Project Brain boundary

Adapters do not turn detected environment state into project truth automatically.

Detected facts such as installed tools, active providers, repository remotes, deployment targets, or available models may become useful evidence, but durable project decisions remain Project Brain state only through normal authority and adoption mechanisms.

## Temporal knowledge

Some Adapter knowledge is inherently time-sensitive.

Examples include:

- available models,
- tool versions,
- API capabilities,
- provider limits,
- instruction-file formats,
- authentication mechanisms,
- deprecated endpoints.

Adapters should represent such knowledge with appropriate freshness and provenance rather than treating historical provider knowledge as timeless framework truth.

Detailed registry and compatibility semantics are defined in later FOUNDATION-08 blocks.

## Anti-patterns

Avoid:

- provider-specific security policy replacing Core governance,
- interpreting tool availability as authorization,
- embedding project architecture decisions in Adapters,
- creating a second orchestration system inside an Adapter,
- hiding degraded or missing capabilities,
- turning transient environment discovery into permanent project truth,
- duplicating Profile or Pattern knowledge merely for convenience,
- assuming one provider's concepts are universal framework semantics.

## Core principles

> **Adapters translate framework intent into environment-specific capabilities and execution; they do not redefine the intent, governance, or authority they carry.**

> **Capability is not authority.**

> **Adapters surface provider constraints and degradation; the Runtime decides how to respond.**

> **Environment-specific execution details belong in Adapters, while reusable domain, solution-space, governance, and project decisions remain owned by their respective layers.**
