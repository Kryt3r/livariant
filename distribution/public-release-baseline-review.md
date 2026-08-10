---
type: public-release-baseline-review
status: accepted
phase: public-preview-preparation
scope: legal-community-distribution
owner: framework
---

# Public Release Baseline Review

This review closes the repository-side Public Preview baseline required by `distribution/public-preview-readiness.md` and separates repository evidence from host/platform configuration that must be verified before launch.

It is an engineering/release-readiness review, not legal advice.

## 1. Framework licensing — GREEN

The repository contains the Apache License 2.0 as `LICENSE`.

The package metadata declares `Apache-2.0`, and `docs/license-and-warranty.md` points users to the authoritative license text rather than inventing a second license summary as binding terms.

## 2. Third-party licenses and notices — GREEN for current package surface

The packed Livariant Runtime declares no runtime dependencies.

`THIRD_PARTY_NOTICES.md` records the current build/dev dependency surface from locked package metadata:

- TypeScript — Apache-2.0;
- `@types/node` — MIT;
- `undici-types` — MIT.

This review must be reopened if runtime dependencies, bundled code/assets, or other redistributable third-party material are added.

## 3. Warranty/liability presentation — GREEN

The project relies on the Apache-2.0 warranty/liability provisions rather than adding a conflicting custom warranty.

`docs/license-and-warranty.md` makes clear that Public Preview engineering expectations are not a paid SLA and do not override the license.

## 4. Privacy / network / update-check behavior — GREEN for current Runtime

`docs/privacy-and-network.md` documents the current behavior:

- no Livariant telemetry or analytics;
- no automatic upload of Project Brain;
- no automatic remote update check;
- update consumes user-supplied local manifest/artifact paths;
- provider Resume projection is generated locally by Livariant;
- external provider behavior remains a separate provider boundary.

A future network, registry, telemetry, sync, or cloud feature reopens this review.

## 5. Security reporting/disclosure guidance — REPOSITORY GREEN / HOST CONFIGURATION PENDING

`SECURITY.md` defines private-first vulnerability reporting expectations, useful report contents, sensitive vulnerability classes, and Preview response semantics.

Before Public Preview publication, the canonical public Livariant repository must verify that an actual private reporting mechanism is enabled and usable (intended: GitHub Private Vulnerability Reporting / Security Advisories).

The document deliberately does not claim that host-side reporting is already active on the current private development repository.

## 6. Contribution rules and rights — GREEN

`CONTRIBUTING.md` defines contribution scope, quality gates, compatibility/migration expectations, security routing, AI-assisted contribution responsibility, and contribution licensing.

The current policy does not require a separate CLA or DCO. Intentionally submitted contributions are expected to follow the repository Apache-2.0 terms unless explicitly stated otherwise before submission.

## 7. Product name / trademark / branding — GREEN WITH DOCUMENTED LEGAL BOUNDARY

The accepted product identity is **Livariant**, with public CLI namespace `livariant`.

`distribution/product-naming-decision.md` records the preliminary collision review and explicitly states that it is not formal trademark clearance.

The product architecture remains rename-safe if a future credible rights conflict requires a change.

## 8. Preview support / compatibility / stability expectations — GREEN

`docs/preview-support-and-stability.md` distinguishes supported protected properties from Preview instability, bounds Claude Code/Codex support to Resume handoff, limits migration support to explicitly declared paths, and states that Preview has no paid SLA by default.

Release communication requirements remain version-aware through the existing release-notes/update contracts.

## 9. Public distribution source — ARCHITECTURE GREEN / HOST CONFIGURATION PENDING

`distribution/public-distribution-source.md` accepts GitHub Releases on the canonical public Livariant repository as the first primary distribution source.

A machine-readable source identity uses:

```text
github:<owner>/<repository>
```

with expected first public identity:

```text
github:Kryt3r/livariant
```

The release source is not yet active because the current development repository remains private and named `Kryt3r/project-brain-framework`.

The release bundle tooling now produces from concrete package bytes:

- Livariant Runtime tarball;
- `release-manifest.json` with exact artifact SHA-256;
- `SHA256SUMS`.

CI verifies that the manifest/checksum bind the packed artifact and that the same bundle installs and executes in a clean consumer.

## Actual legal requirements vs engineering/community practice

This review intentionally does not label every repository practice as a legal requirement.

- The Apache-2.0 license and applicable third-party license obligations are legal/license compliance concerns.
- Trademark clearance and branding risk can have legal consequences, but the current preliminary search is not a legal opinion.
- Security policy, contribution workflow, release immutability, provenance, support expectations, and coordinated disclosure are also engineering/community governance controls; their exact legal necessity varies by jurisdiction and context.
- Technical warnings about data loss, manual replacement, migration, and authority remain in technical documentation rather than being hidden in legal text.

## Remaining launch-time operational gates

The repository-side baseline is now substantially complete. Before announcing the first Public Preview, verify these host/release operations:

1. establish the canonical public `Kryt3r/livariant` repository;
2. enable and test private vulnerability reporting;
3. configure appropriate tag/release protection, including immutable releases where available;
4. select the first Preview/RC version and update package/release metadata;
5. build the manifest-bound release bundle from the reviewed commit;
6. publish all release assets together from the canonical source;
7. verify the published artifact digest/source identity and release notes after publication;
8. rerun the final Release Candidate readiness review against the published candidate.

## Current assessment

**Repository legal/public baseline: GREEN.**

**Actual Public Preview launch: NOT YET GREEN** because canonical public-repository host configuration and the first published RC/release bundle do not yet exist.

This is an operational release gate, not a missing framework safety mechanism.
