# Resume Context & Session Re-entry

## Purpose

`resume` reconstructs the smallest useful session context from canonical Project Brain knowledge so a new or later agent session can continue work without creating a second source of truth.

The resume surface is provider-independent in meaning. Adapters may translate the resulting context into environment-native instructions, prompts, skills, tools, or other mechanisms, but they may not change its semantics.

## Distinct Knowledge and State Surfaces

The framework must preserve three distinct surfaces:

### Project Brain

Durable canonical project knowledge.

Examples include:

- project identity and intent,
- accepted goals and decisions,
- protected properties and constraints,
- known technical context,
- explicit unknowns and conflicts,
- accepted Profile and Pattern relationships.

### Resume Context

A temporary, relevance-filtered projection derived from canonical Project Brain knowledge for a specific session entry point.

Resume Context is not durable project truth and must not become an independently maintained state surface.

### Runtime State

Transient execution state for the current task or session.

Examples include:

- current task objective,
- temporary authorization,
- active tool state,
- partial execution progress,
- temporary blockers,
- session-local handoff metadata.

Runtime State must not be silently promoted into durable Project Brain knowledge merely because it appears in a resume flow.

## Resume Flow

A resume operation should perform the smallest sufficient sequence:

1. load relevant canonical Project Brain knowledge,
2. identify the current or likely work scope when it is known,
3. select goals, decisions, constraints, risks, and technical context relevant to that scope,
4. consider known drift, conflicts, and stale projections proportionally,
5. preserve explicit unknowns rather than filling gaps with plausible assumptions,
6. produce a minimal session-oriented context projection,
7. let the active Adapter translate that projection into the target environment.

Resume is therefore a reconstruction operation, not a file-reading shortcut.

## Relevance Before Completeness

A new session does not need every historical decision, note, rejected idea, or implementation detail.

Resume Context should prefer information that materially affects the next work:

- current goals,
- active decisions,
- protected properties,
- relevant architecture and technical context,
- open risks or blockers,
- known conflicts,
- important prior attempts when they constrain the current task.

Historical information remains available through the Project Brain and explanation surfaces when needed.

This prevents useful continuity from degrading into indiscriminate context loading.

## Unknown and Ambiguous Resume State

Resume must not invent a current objective.

If the Project Brain does not establish a clear next goal, the result should preserve that uncertainty.

Examples:

- `current_goal: unknown`,
- multiple plausible resume candidates,
- unresolved decision conflict,
- stale or incomplete project state.

When multiple meaningful resume points exist, the interface should surface them rather than selecting one through weak inference.

## Freshness-Aware Re-entry

Resume should perform proportional freshness checks before trusting durable context.

Depending on scope and risk, relevant checks may include:

- obvious Project Brain versus repository drift,
- stale native instruction projections,
- changed Adapter or environment capability,
- unresolved knowledge conflicts,
- provider or dependency changes that materially affect the task.

Resume does not require a full repository audit every time. The depth of freshness checking should be proportional to the likelihood and consequence of stale context.

Material uncertainty remains visible.

## Cross-Agent and Cross-Provider Resume

A project may move between agent environments over time.

For example:

```text
Claude session ends
→ later Codex session begins
→ framework resume operation
```

The semantic resume context must remain the same even when the technical representation changes.

The Adapter may change:

- instruction format,
- delivery mechanism,
- supported context packaging,
- environment-native command exposure.

The Adapter may not change:

- accepted project decisions,
- human ownership,
- current constraints,
- protected properties,
- known uncertainty,
- the meaning of the resume operation.

## Resume Is Not an Execution Handoff

Resume and environment handoff are related but distinct concepts.

### Execution Handoff

Transfers responsibility for an active execution from one environment to another while preserving task identity, scope, authority, evidence, and execution state.

### Resume

Reconstructs a new session entry point from durable canonical project knowledge, optionally informed by already-persisted project state.

A resume operation must not require a prior active handoff.

Likewise, a handoff should not be converted into durable Project Brain truth merely so a later resume can function.

## Provider-Independent Command Intent

The development placeholder command may appear as:

```text
pb resume
```

The `pb` namespace is provisional and will be replaced by the finalized product-defined command namespace before public release.

The stable contract is the semantic intent `resume`, not the literal prefix.

Natural-language requests such as:

- “continue where we left off”,
- “what should we work on next?”,
- “restore the relevant project context”,

may map to the same semantic operation when the active human interface can do so safely and unambiguously.

## Safety Boundaries

Resume must not:

- silently mutate project files,
- silently repair detected drift,
- persist temporary Runtime authority as project knowledge,
- promote weak inference into accepted project truth,
- load every available historical artifact by default,
- create a separately maintained session-memory source of truth,
- change project semantics because a different provider or agent is active.

If resume discovers a material inconsistency, it should surface the finding and route it into the appropriate reconciliation or diagnostic flow.

## Completion Condition

A resume operation is complete when the active environment has the smallest sufficient, freshness-aware context needed to continue safely and the framework has not created a competing durable state surface.

## Core Principle

> **Resume reconstructs a minimal, relevant, freshness-aware session context from canonical Project Brain knowledge without creating a competing source of truth or persisting transient Runtime state as durable project knowledge.**
