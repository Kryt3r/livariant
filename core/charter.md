---
type: POLICY
status: accepted
owner: framework-director
created: 2026-08-09
updated: 2026-08-11
---

# Project Brain Framework — Charter

## Mission

The Project Brain Framework is a tool-agnostic operating model for long-term AI-assisted software development.

It exists to prevent coding agents from completing isolated tasks correctly while architecture, product vision, security, design quality, and historical decisions drift apart over time.

The framework combines persistent project context with explicit workflows, specialized roles, risk classification, quality gates, decision records, and targeted context loading.

It does not replace human product ownership or human judgment. AI agents are implementation, analysis, review, and advisory participants. Final product and directional authority remains with the project owner.

The framework is agent-independent. Its core rules must not depend on Codex, Claude Code, Gemini, Cursor, Copilot, or any future agent system. Tool-specific instructions are adapters of the framework, not its source of truth.

## Core goal

A project should still be able to answer, after hundreds of sessions, model changes, and refactors:

- What are we building?
- Why are we building it this way?
- What is the current state?
- What risks exist?
- Which decisions were made?
- What must the next change not break?
- Which project artifacts may no longer reflect current truth?

## Core principles

### Persistent project identity instead of chat memory
Important project knowledge belongs in durable, version-controlled project context and must not rely on one chat or one model remembering it.

### Progressive disclosure instead of context dumps
Agents load only the context needed for the current task. A small current-context cache leads to targeted documents.

### Code describes reality; Brain describes intent and context
When Code and Brain disagree, Code wins for facts about what currently exists, Brain wins for documented intent about what should exist, and the contradiction is recorded explicitly instead of silently resolved.

### Presence is not currency
A claim being present in a legitimate project-owned artifact does not prove that it is still current. Livariant distinguishes current canonical truth, dependent current truth, historical truth, and ephemeral projections so superseded knowledge is not accidentally used as present guidance.

### Do not guess
Missing context triggers research or a question, not plausible invention.

### Smallest durable change
No speculative abstractions, no refactoring for its own sake, no scope creep.

### Risk determines process overhead
Task process is based on both size and possible impact. A tiny authentication change may require stricter review than a large low-risk UI change.

### Security by default
Security is evaluated during design and implementation, not bolted on after completion.

### Evidence instead of self-confirmation
“Done” is established by suitable evidence such as tests, builds, reproducible checks, and review — not by an agent declaring completion.

### Decisions must survive
Expensive-to-reverse decisions with real alternatives are documented permanently with context and rationale.

### Documentation must earn its place
The Brain is not a duplicate of the code and not an activity diary. Persist knowledge only when it explains a non-obvious why, prevents meaningful failure repetition, or records project-owner intent/state not inferable from code.

### Design is an engineering discipline
Major visual work must not be generated from generic AI defaults. It must use a dedicated discovery, reference, composition, design, and review process.

### Aphantasia-compatible design participation
Good design must not require the project owner to describe a complete mental image. Visual exploration is externalized through references, contrasting directions, wireframes, mockups, comparison, and iterative acceptance/rejection.

### AI generates options; human taste remains authoritative
Agents may explore, compare, and justify design directions. They may not silently turn subjective taste into final truth.

### Graceful degradation
If subagents, tools, automations, or specialist capabilities are unavailable, roles and gates remain binding and are performed with available means.

### Framework serves the project
Governance, roles, and documentation exist to reduce mistakes and improve decisions. Bureaucracy without concrete value is removed.

## Non-goals

The framework must not:

- create a giant rulebook agents need to read for trivial work,
- automate human product ownership,
- turn every implementation detail into an ADR,
- document every work step,
- depend on one language, stack, infrastructure provider, or LLM,
- simulate enterprise complexity where it provides no value,
- legitimize mediocre output through more process.

## Quality objective

A successful Project Brain Framework deployment means a new agent can take over without relearning the whole project, important decisions remain understandable months later, known failure modes are not repeatedly reintroduced, high-risk changes receive stronger controls, product/design quality does not reset to generic model defaults after model changes, and stale dependent project knowledge is surfaced instead of silently treated as current.

The objective is not maximum documentation.

**The objective is long-term coherence.**
