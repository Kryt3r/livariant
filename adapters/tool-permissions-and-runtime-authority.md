---
type: framework-layer-policy
status: accepted
domain: adapters
language: en
owner: framework
foundation: FOUNDATION-08D
---

# Tool Permissions & Runtime Authority Mapping

Adapters expose concrete execution capabilities and effects. They do not convert technical access into governance authority.

> **Adapters expose executable effects; the Runtime grants authority for specific operations. Technical permission never becomes governance authority by itself.**

## Core Separation

Tool availability, requested work, governance authority, and execution are separate concerns.

Conceptually:

```text
Tool capability
→ what the integration can technically do

Requested operation
→ what the agent or workflow wants to do

Applicable authority
→ what governance, project policy, scope, and human decisions permit

Runtime authorization
→ allowed, denied, or confirmation required

Adapter execution
→ concrete tool/API action only after authorization
```

An Adapter may report that an operation is technically available. It must not infer that the operation is authorized merely because the provider token, SDK, API, or environment would allow it.

## Operation Granularity

Adapters should expose operations at a level useful for authority reasoning rather than collapsing an integration into one coarse permission.

For example, a GitHub Adapter should distinguish materially different operations such as:

- repository read,
- repository file write,
- branch creation,
- pull request creation,
- pull request merge,
- issue or comment write,
- workflow dispatch,
- secret or security-sensitive configuration access where applicable.

Granularity should reflect materially different effects, authority requirements, or risk. It should not become an exhaustive mirror of every provider endpoint when those endpoints share the same relevant authority semantics.

## Effect Classes

Adapters should map concrete operations to a small shared set of framework effect classes so Runtime and Security reasoning remain comparable across providers.

Recommended baseline classes include:

- `read-only` — observes state without creating durable external changes,
- `local-write` — changes local or isolated working state,
- `project-write` — changes project-owned durable state,
- `external-write` — changes state in an external collaborative or customer-facing system,
- `deployment` — changes or promotes an executable environment,
- `destructive` — deletes, revokes, irreversibly replaces, or otherwise materially destroys state,
- `privileged/security-sensitive` — affects secrets, credentials, access control, trust configuration, protected security state, or equivalent privileged surfaces.

Effect classes support consistent reasoning but do not replace actual authorization. Two operations in the same class may still require different authority because scope, protected properties, consequences, or project policy differ.

Provider-specific details may use namespaced metadata where the shared effect class is insufficient for translation.

## Runtime Authorization Outcomes

For a requested operation, the Runtime should be able to resolve outcomes such as:

- `authorized` — execution may proceed within the approved scope,
- `denied` — execution must not proceed,
- `confirmation_required` — explicit human confirmation or higher authority is required,
- `additional_auth_required` — governance permits the operation but the environment still lacks required provider authentication or credentials,
- `unavailable` — the required capability is not presently executable in the environment.

These states should not be conflated. For example, missing credentials are not the same as governance denial, and technical availability is not the same as authorization.

## Human Confirmation

Adapters may describe provider or environment behavior that requires interactive confirmation, elevated authentication, or an external approval step.

The Runtime determines whether human confirmation is also required by governance.

A provider-side approval mechanism does not substitute for framework authority, and framework approval does not imply that provider authentication is already satisfied.

## Capability, Role, and Authority

Specialist roles, model identity, tool identity, and technical capability must not grant authority by themselves.

In particular, the framework must avoid rules such as:

```text
Security Specialist
→ may read secrets
```

A role describes expertise and dispatch suitability.

Authority is derived from applicable task scope, governance, human decisions, project policy, protected properties, and Runtime authorization.

> **Capability is not authority, and competence is not authority.**

## Scope-Bound Authorization

Authorization should be evaluated for the concrete operation and scope.

Examples:

- permission to edit one feature branch does not imply permission to write `main`,
- permission to create a deployment preview does not imply permission to deploy production,
- permission to read repository code does not imply permission to read repository secrets,
- permission to update one project does not imply permission to modify another project accessible through the same provider account.

Adapters should expose enough scope information for the Runtime to preserve these boundaries where the environment supports them.

## Least Privilege

Adapter execution should use the narrowest available technical scope that can perform the authorized operation when practical.

If an integration exposes broader credentials than the task requires, the broader credential must not be interpreted as broader framework authority.

Where the provider supports scoped tokens, roles, repositories, projects, environments, or resources, the Adapter should surface those boundaries rather than flatten them.

## Failure Behavior

If authority cannot be resolved safely, execution must not silently default to the most permissive interpretation.

The Runtime should prefer:

- denial where a protected property would otherwise be at risk,
- explicit escalation or confirmation when human authority is required,
- a lower-effect alternative where one exists and still satisfies the task,
- or a clear inability report when safe execution is impossible.

Adapters may propose technically possible alternatives, but they do not gain authority to select a higher-effect fallback.

## Logging and Evidence

For materially consequential operations, the execution path should preserve enough evidence to explain:

- which concrete operation was requested,
- which Adapter capability represented it,
- the affected scope,
- the relevant effect class,
- which authority or confirmation permitted execution,
- and the resulting provider operation or outcome.

Evidence requirements remain proportional; read-only low-risk work should not receive the same ceremony as destructive or privileged actions.

## Anti-Patterns

Avoid:

- treating provider permissions as framework authority,
- one coarse `tool_allowed=true` flag for materially different effects,
- binding privileged permissions permanently to specialist roles,
- assuming that provider-side confirmation satisfies human governance,
- allowing fallback behavior to increase effect without new authorization,
- flattening repository, tenant, project, environment, or resource scope into account-wide authority,
- inventing provider-specific authority rules that bypass Core governance.

## Core Principles

> **Adapters expose executable effects; the Runtime grants authority for specific operations.**

> **Technical permission never becomes governance authority by itself.**

> **Shared effect classes support cross-provider reasoning but do not replace scope-specific authorization.**

> **Roles and expertise influence dispatch suitability, not permission.**

> **Execution must fail safely when authority is unresolved.**
