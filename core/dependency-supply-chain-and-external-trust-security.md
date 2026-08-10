---
type: core-policy
status: accepted
domain: security
language: en
owner: framework
---

# Dependency, Supply-Chain & External Trust Security

**Foundation:** FOUNDATION-05E

## Purpose

The framework must treat third-party code, build infrastructure, and external tooling as explicit trust boundaries rather than inherit trust from popularity, convenience, or ecosystem convention.

> A dependency is borrowed code and borrowed trust.

## Dependency adoption

Every dependency expands the project's trust, maintenance, and attack surface. New dependencies should therefore have a justified purpose and should not be introduced for trivial convenience where the same outcome can be achieved safely with substantially less external trust.

Before adoption, the exact dependency identity and source must be verified against authoritative ecosystem or upstream metadata. An agent suggestion, package-name resemblance, copied install command, or search result is not sufficient evidence of provenance. This reduces hallucinated-package, typo-squatting, and lookalike-package risk.

## Reproducibility and integrity

Builds and installs should be reproducible enough that upstream change cannot silently replace expected code. Lockfiles, checksums, signatures, pinned references, or equivalent ecosystem mechanisms should be used where appropriate.

Reproducibility and integrity are security properties of the software supply chain.

## Updates

Dependency updates should be evaluated proportionally to their consequence. Security-sensitive, foundational, or breaking updates deserve stronger review and verification than low-impact routine updates.

Automated update tooling may propose changes, but must not silently bypass applicable review and verification requirements.

## Privileged build and deployment infrastructure

CI/CD workflows, build scripts, release automation, package publication, container pipelines, and similar infrastructure may access secrets, artifacts, signing keys, or production deployment authority.

Such infrastructure is privileged code and requires proportionally stronger scrutiny, least privilege, and controlled change.

## External tools and execution

Third-party tools, actions, images, plugins, generators, and scripts must not inherit broader permissions than their purpose requires.

The ability to execute code in the build or deployment environment is a security-relevant capability and should be treated accordingly.

## Dependency minimization and removal

Unused, obsolete, or unjustified dependencies should be removed. A dependency that no longer provides enough value to justify its trust and maintenance surface should not remain merely because it already exists.

## Agent behavior

Agents may recommend or introduce dependencies only after considering necessity, verified identity and source, maintenance state, source trust, compatibility, version strategy, security implications, and available simpler alternatives.

Convenience alone is insufficient justification for expanding the supply chain.

## Core principles

> **External code must never inherit trust merely from popularity or convenience.**

> **Dependency identity and provenance must be verified before execution or adoption.**

> **Every dependency expands the project's trust and maintenance surface.**

> **Privileged build and deployment infrastructure requires proportionally stronger scrutiny.**

> **Reproducibility and integrity are security properties of the software supply chain.**

> **Dependency adoption and updates require evidence proportional to their consequence.**

> **A dependency is borrowed code and borrowed trust.**
