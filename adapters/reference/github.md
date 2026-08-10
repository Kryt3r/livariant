---
type: reference-adapter
status: accepted
domain: adapters
language: en
owner: framework
foundation: FOUNDATION-08I
---

# Reference Adapter — GitHub

## Purpose

This reference Adapter demonstrates how the Project Brain Framework translates authority, capability, execution, and evidence semantics into a repository hosting and collaboration environment without allowing provider permissions to redefine framework governance.

It is intentionally illustrative rather than exhaustive. It does not mirror every GitHub API endpoint.

## Environment Scope

Applies where project work uses GitHub-hosted repositories, pull requests, issues, reviews, workflow runs, branches, releases, or equivalent repository collaboration surfaces.

It does not own:

- repository architecture,
- branch strategy as universal policy,
- release policy,
- security governance,
- project authorization rules,
- code-review policy,
- CI/CD architecture.

Those remain owned by Core, Profiles, Patterns, Project Brain, or other applicable layers.

## Capability Discovery

The Adapter may declare and observe capabilities such as:

- repository metadata read,
- file and tree read,
- commit and diff read,
- issue and pull-request read,
- issue/comment/review write,
- branch creation,
- repository file write,
- pull-request creation,
- pull-request merge,
- workflow inspection,
- workflow dispatch,
- release or deployment-adjacent provider actions where explicitly supported.

Capability state must distinguish:

```text
declared support
observed runtime availability
authorized use
```

A connected GitHub App or token with broad permissions is evidence of technical reach, not permission to exercise every reachable effect.

## Effect Mapping

Illustrative mappings:

```text
fetch repository file
→ read-only

create issue comment
→ external-write

write repository file to feature branch
→ project-write

create branch
→ project-write

merge pull request
→ project-write with high project impact

workflow dispatch that deploys production
→ deployment

modify repository secrets or protected security configuration
→ privileged/security-sensitive
```

The concrete effect and scope must be evaluated together. A project-write on an isolated feature branch is not equivalent in authority or consequence to writing the protected default branch.

## Scope Preservation

The Adapter should surface relevant scope dimensions where available:

- repository,
- organization,
- branch or ref,
- pull request,
- issue,
- workflow,
- environment,
- protected configuration surface.

Authorization for one repository must not silently become authority over another repository accessible through the same account or installation.

Authorization to create a pull request must not imply authorization to merge it.

Authorization to write a feature branch must not imply authorization to write the default branch.

## Execution Contract

A GitHub execution request should preserve:

- task identity,
- repository identity,
- concrete operation,
- target scope,
- applicable effect class,
- originating authority,
- relevant project constraints,
- expected evidence,
- completion condition.

The Adapter translates that request into the concrete GitHub operation only after Runtime authorization.

## Unknown Write Outcomes

Provider calls that may have produced a durable effect must not be blindly retried when the response state is uncertain.

Example:

```text
merge request sent
connection lost before response
```

The resulting state is:

```text
effect state: unknown until reconciled
```

The Adapter should inspect repository or pull-request state before retrying so duplicate or conflicting effects are not created.

The same principle applies to comments, branch creation, workflow dispatch, releases, and other durable writes where provider behavior or transport failure makes the result uncertain.

## Degradation and Fallback

Examples:

```text
pull-request metadata readable
inline review comments unavailable
→ degraded review capability
```

or:

```text
feature-branch write unavailable
default-branch write technically available
```

The latter is not an equivalent fallback. The Adapter must not escalate to the higher-impact write path without new authorization.

## Evidence

For material operations, return enough evidence for Runtime reconciliation, such as:

- repository and ref affected,
- operation performed,
- resulting commit or provider object identifier where available,
- pull-request or issue state,
- workflow/run state,
- actual effect class and scope,
- provider errors or degradation,
- uncertain outcomes requiring reconciliation.

## Conformance Scenarios

A conforming GitHub Adapter should satisfy scenarios such as:

1. Broad provider token permissions do not create broad framework authority.
2. Read-only task authority cannot be upgraded into repository writes.
3. Feature-branch write authority does not imply default-branch write authority.
4. Pull-request creation authority does not imply merge authority.
5. Uncertain durable writes are reconciled before retry.
6. Missing lower-effect capability does not trigger automatic higher-effect fallback.
7. Provider metadata remains environment evidence and does not silently become Project Brain truth.
8. Adapter failures or provider errors are surfaced rather than hidden behind fabricated success.

## Anti-Patterns

Avoid:

- treating GitHub App permissions as project-owner approval,
- flattening all repository writes into one permission,
- assuming default branch, release, or workflow semantics are universal framework policy,
- silently retrying uncertain writes,
- merging because merge capability exists,
- translating GitHub roles directly into application authorization truth,
- making the Adapter responsible for branch, architecture, or review strategy.

## Reference Principle

> **The GitHub Adapter exposes repository capabilities and effects with precise scope; it never turns provider reach into project authority.**
