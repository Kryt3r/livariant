---
type: product-identity-decision
status: accepted
date: 2026-08-10
scope: public-product-identity
language: en
owner: framework
---

# Product Naming Decision — Livariant

## Decision

The public product name for the Living Software Framework is **Livariant**.

The accepted public CLI namespace is:

```text
livariant
```

The existing `pb-dev` command remains a temporary development compatibility surface only. It must not be treated as the public product identity or as a durable architectural dependency.

The current repository name `project-brain-framework` and package identity `project-brain-framework-runtime` are development-era identities. They may remain temporarily while the public repository/package transition is performed. The intended public product repository should use the Livariant identity where available and practical.

## Naming Rationale

Livariant was selected because it fits the framework's central concept: software that remains coherent while it evolves across time, agents, providers, sessions, migrations, and changing project knowledge.

The name is intended to function as a product identity rather than as a legal entity name.

## Preliminary Collision Review

A preliminary availability and collision review was performed on 2026-08-10 before this decision was accepted.

The review included:

- exact-name web searches for `Livariant`,
- software / AI / developer-tool collision searches,
- GitHub repository-name searches,
- npm / package-name-oriented searches,
- domain-oriented searches for common Livariant domains,
- preliminary trademark-oriented searches and comparison with similar names,
- a focused comparison against the existing technology name **Liviant**.

No obvious exact-name software, AI framework, developer-tool, npm, or major GitHub collision for **Livariant** was identified during that review.

The most relevant similar commercial name found was **Liviant**, which is used in technology / AI-adjacent contexts. The names are similar enough to justify awareness, but the preliminary review did not identify an obvious reason to block use of Livariant for this product.

A historical / similar `Lavariant` trademark result was also observed during preliminary research, but it did not establish an exact Livariant collision for the intended product.

## Legal Boundary

This decision records a **preliminary product-name collision review only**.

It is **not legal advice, not a professional trademark clearance opinion, and not a representation that Livariant is free of all third-party rights in every jurisdiction or class**.

No formal trademark registration is required by this framework decision before development or public use of the product name.

The current product strategy is intentionally pragmatic:

- use **Livariant** as the product name,
- use the Livariant identity for the public repository and technical namespace where practical,
- do not block development on a trademark filing,
- re-evaluate trademark registration if the product gains meaningful public adoption, commercial value, branding investment, or distribution reach,
- if a credible third-party rights conflict is raised later, assess the concrete claim and, if necessary, rename the product rather than treating the current name as architecturally immutable.

Branding must therefore remain separable from Core lifecycle and Project Brain semantics. A future rename must not require redesigning authority, migration, ownership, recovery, or canonical knowledge contracts.

## Public Identity Boundary

Accepted:

```text
Product: Livariant
Public CLI namespace: livariant
```

Temporary development identities:

```text
CLI: pb-dev
Repository: project-brain-framework
Package: project-brain-framework-runtime
```

The temporary identities may coexist during the migration to the public surface, but new user-facing documentation and lifecycle CLI work should target **Livariant** and `livariant` rather than introducing additional `pb-dev` dependencies.

## Follow-up

The next public-surface work should:

1. migrate the installed CLI surface from `pb-dev` to `livariant`, retaining a temporary development alias only if useful for compatibility;
2. choose and verify the final package-manager package name separately from the already accepted product/CLI name;
3. update Quickstart and lifecycle documentation to the real installed `livariant` commands once those commands exist;
4. create or rename the intended public repository around the Livariant identity when the repository transition is performed;
5. revisit formal trademark clearance/registration only when product maturity or risk justifies the cost.

## Core Rule

> **Livariant is the accepted product identity. Branding may change if necessary; framework semantics must not depend on the brand name.**
