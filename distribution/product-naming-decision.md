---
type: product-identity-decision
status: accepted
date: 2026-08-10
updated: 2026-08-11
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

The canonical product repository is `Kryt3r/livariant`, and the executable package/runtime identity is `livariant`.

Earlier development identities such as `pb`, `pb-dev`, `project-brain-framework`, and `project-brain-framework-runtime` are superseded product-surface names. They may remain in clearly historical engineering records or deliberate compatibility/test evidence, but they are not current product identity and must not re-enter current user guidance or current normative command examples.

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
- use the Livariant identity for the canonical repository and technical namespace,
- do not block development on a trademark filing,
- re-evaluate trademark registration if the product gains meaningful public adoption, commercial value, branding investment, or distribution reach,
- if a credible third-party rights conflict is raised later, assess the concrete claim and, if necessary, rename the product rather than treating the current name as architecturally immutable.

Branding must therefore remain separable from Core lifecycle and Project Brain semantics. A future rename must not require redesigning authority, migration, ownership, recovery, or canonical knowledge contracts.

## Public Identity Boundary

Accepted and current:

```text
Product: Livariant
CLI: livariant
Repository: livariant
Package/runtime: livariant
Provider environment variable: LIVARIANT_PROVIDER_ENV
```

Historical development aliases do not form part of the Public Preview product contract.

## Migration status

The identity migration required by this decision is materially complete for the current product surface:

- installed CLI identity is `livariant`;
- package/runtime identity is `livariant`;
- canonical repository is `Kryt3r/livariant`;
- current Quickstart and lifecycle guidance use `livariant`;
- current public documentation must not present superseded development identities as active alternatives.

Historical engineering records may continue to document the transition as historical truth.

## Remaining follow-up

- maintain product/CLI/package/repository identity consistency through truth-surface checks;
- keep branding separable from Framework semantics so a future rename remains bounded;
- revisit formal trademark clearance/registration only when product maturity or risk justifies the cost.

## Core Rule

> **Livariant is the accepted product identity. Branding may change if necessary; framework semantics must not depend on the brand name.**
