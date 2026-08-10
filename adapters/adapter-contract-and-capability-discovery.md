---
type: framework-layer-policy
status: accepted
domain: adapters
language: en
owner: framework
foundation: FOUNDATION-08B
---

# Adapter Contract & Capability Discovery

Adapters expose environment-specific execution capabilities without converting technical availability into authority.

> Adapter capability discovery distinguishes what an integration can support, what the current environment actually provides, and what the Runtime is authorized to use.

## Adapter Contract

A reusable Adapter should expose enough semantic structure for the Runtime to determine what environment it targets, what capabilities it can provide, what the current environment actually exposes, and which constraints apply.

### Identity & Target Environment

Each Adapter must have:

- a stable identity,
- a version,
- a lifecycle state,
- trust / provenance metadata,
- and a clearly defined target environment, provider, toolchain, or execution surface.

An Adapter may target a provider, runtime, CLI, IDE, agent environment, service integration, or other concrete execution context.

### Applicability & Detection

An Adapter must document:

- the conditions under which it is relevant,
- how its target environment can be detected,
- and when it should not be used.

Detection may use environment metadata, available tools, configuration, authenticated integrations, local files, runtime-provided capabilities, or explicit human selection.

Detection establishes relevance and evidence of environment presence. It does not establish execution authority.

### Capability Surface

An Adapter may declare abstract capabilities such as:

- `repository.read`,
- `repository.write`,
- `tests.run`,
- `shell.execute`,
- `web.search`,
- `deployment.preview`,
- `deployment.production`,
- `issues.read`,
- `issues.write`.

The framework should keep a small, stable capability vocabulary for common cross-provider behavior while allowing namespaced provider-specific capabilities where generic abstraction would lose important semantics.

Example:

```text
repository.write
vercel.deployment.promote
supabase.database.sql.execute
```

Namespaced capabilities must not be treated as universal framework semantics merely because an Adapter exposes them.

### Capability State

Observed capability state should support at least:

- `available` — the capability is presently usable at the integration/environment level,
- `degraded` — some required or expected behavior is limited,
- `unavailable` — the capability is known not to be usable,
- `unknown` — the Adapter lacks sufficient evidence to determine current availability.

Capability state should be evidence-backed and freshness-aware when the environment is mutable.

### Constraints

Adapters should expose material execution constraints where relevant, including:

- authentication requirements,
- permission scopes,
- sandbox or filesystem boundaries,
- rate limits,
- payload or file-size limits,
- supported file/content types,
- environment-specific quotas,
- execution timeout or session constraints,
- destructive-operation boundaries,
- provider-specific consistency or propagation behavior.

These constraints inform Runtime decisions but do not redefine Core governance.

### Execution Mapping

An Adapter maps abstract framework capabilities to concrete provider or environment actions.

Conceptually:

```text
Framework capability
→ Adapter mapping
→ concrete tool / API / command / execution surface
```

The mapping should be explicit enough to preserve the semantic difference between capabilities that may look superficially similar but have different consequences.

An Adapter must not quietly broaden an abstract action into a more privileged provider action.

### Failure & Fallback Surface

Adapters should describe meaningful failure and degradation conditions and, where possible, valid fallback options.

Fallback guidance may include:

- an alternative capability in the same Adapter,
- another compatible Adapter,
- a read-only or dry-run mode,
- manual human execution,
- deferred execution,
- or explicit inability to proceed.

Fallback selection remains a Runtime decision under applicable authority and project constraints.

### Freshness & Evidence

Capability discovery must distinguish documented support from observed runtime reality.

Evidence may include:

- successful environment/tool probing,
- authenticated provider metadata,
- adapter handshake results,
- current runtime declarations,
- verified configuration,
- or recent successful execution.

Mutable capability evidence should carry enough freshness information to avoid treating stale environment assumptions as current truth.

## Three Capability Views

Adapters and the Runtime must keep three questions separate.

### Declared Capability

What the Adapter implementation knows how to support in principle.

Example:

```text
GitHub Adapter
→ declared: repository.write
```

Declared support is implementation knowledge, not proof that the capability exists in the current environment.

### Observed Capability

What the current environment actually exposes according to current evidence.

Example:

```text
GitHub integration detected
credentials valid
write tool available
→ observed: repository.write = available
```

Observed capability may be `degraded`, `unavailable`, or `unknown` even when declared support exists.

### Authorized Capability

What applicable Runtime authority permits for the current task.

Example:

```text
declared: repository.write
observed: available
authorized: read-only

result:
repository.write is technically possible but not permitted for this task
```

This preserves the established framework rule:

> **Capability is not authority.**

## Capability Resolution

The Runtime should derive executable capability from the intersection of:

```text
Declared capability
∩ Observed capability
∩ Authorized capability
∩ Applicable constraints
= executable capability for the current action
```

No single Adapter field may bypass this resolution.

## Discovery Behavior

Capability discovery should be proportional.

- Stable local capabilities may require little or no repeated probing.
- Credential-, provider-, or session-dependent capabilities may require fresh evidence.
- High-consequence actions may justify stronger current-state verification before execution.
- Discovery should not repeatedly perform expensive probes when reliable recent evidence already exists.

The framework should prefer evidence over assumptions while avoiding needless runtime overhead.

## Capability Vocabulary Boundary

The framework should not attempt to predefine every capability supported by every provider.

A healthy model uses:

- a small shared vocabulary for genuinely portable capability concepts,
- namespaced capabilities for provider-specific semantics,
- and Adapter metadata to explain mapping and constraints.

If a provider-specific capability later proves broadly reusable across environments, it may be reviewed for promotion into the shared vocabulary.

Repeated use alone is not sufficient evidence for promotion.

## Security & Trust Boundary

Adapter metadata and discovery results are inputs to Runtime reasoning, not self-authorizing claims.

An Adapter must not:

- grant itself authority,
- elevate provider permissions into project authority,
- treat successful authentication as permission to perform all supported actions,
- bypass human or Core governance because an API technically allows an operation,
- or silently weaken verification because a tool is convenient.

Trust and provenance may affect how much evidence is required before relying on Adapter declarations, but provenance itself does not create action authority.

## Principles

> **Adapter capability discovery distinguishes declared support, observed runtime availability, and authorized use.**

> **Technical availability never implies authority.**

> **Capability evidence must be fresh enough for the consequence of the action being considered.**

> **The shared capability vocabulary should remain small and stable; provider-specific semantics belong in namespaced capabilities.**

> **Adapters report and translate execution reality; the Runtime resolves whether and how capabilities may be used.**
