---
type: reference-adapter
status: accepted
domain: adapters
language: en
owner: framework
foundation: FOUNDATION-08I
---

# Reference Adapter — Agent Environment / Claude Code

## Purpose

This reference Adapter demonstrates how the Project Brain Framework projects canonical intent into an interactive coding-agent environment with native instruction files, model/tool capabilities, local execution, and task handoff.

Claude Code is used as a concrete reference surface, but the semantics are intentionally general enough to validate the Adapter contract for comparable agent environments.

## Environment Scope

Applies where an agent environment can:

- inspect project files,
- execute local commands,
- modify working-tree content,
- consume native project instructions such as `CLAUDE.md`,
- expose changing model/tool capabilities,
- receive or return task handoffs.

It does not own:

- project governance,
- architecture decisions,
- security policy,
- human authority,
- Profile or Pattern selection,
- global model rankings,
- canonical Project Brain state.

## Native Instruction Projection

The Adapter may generate or maintain environment-native instructions that project relevant framework and Project Brain knowledge into the agent environment.

Native files are delivery surfaces, not competing sources of truth.

For `CLAUDE.md` or equivalent files:

```text
canonical durable framework / Project Brain state
→ relevance filtering
→ environment-specific projection
→ native instruction file
```

The projection should preserve meaning while removing irrelevant context noise.

Durable project instruction files must not persist transient task identity, temporary authorization, current handoff state, execution progress, temporary blockers, or session-local state. Those belong to the Runtime or an explicitly ephemeral task-scoped instruction surface.

## Existing Instruction Files

If a project already contains `CLAUDE.md`, `AGENTS.md`, or an equivalent native instruction artifact, the Adapter must treat the existing artifact as human/project-owned by default.

Before proposing a modification, it should:

1. inspect the existing content,
2. identify overlapping and conflicting guidance,
3. preserve human-authored intent,
4. explain the proposed integration,
5. operate only within the authorized change scope.

Valid outcomes include:

- preserve the file unchanged,
- add a clearly bounded managed section,
- integrate selected framework projections into existing structure,
- migrate agreed durable knowledge into Project Brain and regenerate a projection,
- decline modification when safe integration is unclear.

Silent replacement is non-conforming behavior.

## Ownership Modes

The Adapter should distinguish at least conceptually:

- `human-owned` — existing project content that the framework must not overwrite without authorization,
- `framework-generated` — content generated and fully managed by the framework,
- `managed-section` — a clearly delimited framework-controlled region within an otherwise human-owned artifact where the environment and project conventions support this safely.

Ownership metadata must not be invented after the fact to justify overwriting user content.

## Project Mutation Safety

Local write capability does not create authority to modify the project.

The Adapter must preserve the Core project-mutation safety rule:

```text
inspect
→ explain / plan within the level required by risk
→ confirm or rely on already-bounded authorization
→ mutate only authorized scope
→ verify
→ report actual changes
```

An instruction-generation task does not authorize unrelated refactors, dependency upgrades, architecture changes, or broad project cleanup.

## Capability and Model Surface

The Adapter may report changing capabilities such as:

- file read/write,
- shell execution,
- browser or web access,
- repository integration,
- subagent availability,
- image or multimodal input,
- context limits,
- model identity and lifecycle,
- tool invocation support.

Model and tool information must carry freshness appropriate to the decision being made.

The Adapter may report that a model supports a capability; it does not establish a permanent framework ranking or routing mandate.

## Handoff

A task handed into the environment should preserve:

- task identity,
- current goal,
- bounded scope,
- relevant canonical context,
- applicable authority,
- allowed effect ceiling,
- known decisions and invariants,
- open risks,
- expected evidence,
- completion condition.

The receiving agent environment gains execution responsibility, not additional authority.

For example:

```text
handoff: investigate failing test
scope: read-only diagnosis
environment capability: local file write available
```

The agent may not silently begin modifying project files merely because local writes are possible.

Task-local handoff state must remain in the Runtime / handoff mechanism and must not be copied into durable repository-level instructions merely for convenience.

## Local Execution State

Environment-specific state may include:

- session identifier,
- command history relevant to evidence,
- local process state,
- tool invocation identifiers,
- temporary working files,
- local branch/worktree information.

This is execution metadata. It must not become a competing canonical task state or durable project instruction state.

## Degradation and Fallback

Examples:

```text
preferred independent subagent unavailable
→ use another independent provider or human review if equivalent
```

or:

```text
native project-instruction update cannot be safely merged
→ present proposed content without modifying the existing file
```

A fallback must not silently reduce required independence, safety, verification, or authority controls.

## Conformance Scenarios

A conforming agent-environment Adapter should satisfy scenarios such as:

1. Existing `CLAUDE.md` is preserved by default and not silently replaced.
2. Native instructions remain projections rather than canonical project truth.
3. Durable native instructions do not retain transient task/session/temporary authority state.
4. Local write capability does not grant project mutation authority.
5. A read-only handoff remains read-only even when the environment can write.
6. Model/tool availability is treated as temporal evidence rather than timeless fact.
7. Missing preferred tools do not silently weaken quality or security requirements.
8. Generated instruction content is relevance-filtered rather than dumping the entire framework into context.
9. Local session state does not become a second canonical Runtime state.
10. Scope expansion beyond the user's authorized task is reported and re-authorized rather than performed opportunistically.

## Anti-Patterns

Avoid:

- overwriting pre-existing native instruction files,
- copying the entire framework into every agent context,
- persisting current task/session/temporary authority state in durable repository instructions,
- treating a model's technical capability as authority,
- allowing the environment to choose architecture or governance because it has implementation knowledge,
- silently broadening a task after discovering adjacent improvements,
- turning session history into canonical Project Brain state,
- treating provider-specific instruction precedence as universal Core semantics.

## Reference Principle

> **An agent-environment Adapter makes canonical project intent usable inside the environment while preserving human ownership, bounded authority, and one canonical source of project truth.**
