# Public Preview Launch Readiness

Status: **private RC exists; public launch not yet authorized**

This document separates the technically verified Release Candidate from the remaining repository, legal, documentation, host-configuration, and publication decisions required before Livariant is made public.

The existence of a private RC does **not** authorize repository visibility changes or public publication.

## Current verified baseline

- Canonical repository: `Kryt3r/livariant`.
- Repository visibility: private.
- RC version: `0.1.0-rc.1`.
- Release channel: `preview`.
- RC tag: `v0.1.0-rc.1`.
- RC source commit: `f8b5b7afa646b9532d9c47ef46843ff821c722f6`.
- GitHub pre-release exists privately with the packed Runtime, `release-manifest.json`, and `SHA256SUMS`.
- Ubuntu Node 24 and Windows Node 24 both pass the complete Hardening CI, clean-consumer package smoke, and release-bundle smoke.
- The packed RC artifact is SHA-256 bound by the release manifest and checksum file.

## Launch gate A — Product-facing README and repository presentation

**Status: OPEN — owner review required.**

The current README is technically accurate but still written as a Public Preview preparation document. Before public visibility, it must be deliberately rewritten/reviewed for the intended public presentation, including:

- product message and positioning;
- first-screen explanation of what Livariant is and why it exists;
- installation/getting-started path;
- Preview status and limitations;
- supported platforms and tested Node baseline;
- supported provider scope without overclaiming;
- links to security, privacy, contribution, lifecycle, and support documentation;
- removal or rewriting of internal/preparation language that should not be part of the public first impression.

No public README wording is accepted merely because it exists in the current repository.

## Launch gate B — License and ownership decision

**Status: OPEN — explicit owner decision required.**

Current repository state uses Apache License 2.0 and related documentation assumes Apache-2.0.

Before public launch, the owner must explicitly decide whether Apache-2.0 is the intended license for Livariant. If the decision changes, all dependent surfaces must be updated together, including at least:

- `LICENSE`;
- `package.json` license metadata;
- `docs/license-and-warranty.md`;
- `CONTRIBUTING.md` contribution-license language;
- README license references;
- any NOTICE/attribution obligations created by the selected license.

This gate is not satisfied by the current historical/default repository state alone.

## Launch gate C — Repository hygiene and publication contents

**Status: BLOCKED — `.gitignore` is currently absent.**

Before public launch:

- create and review `.gitignore`;
- exclude local build/install outputs such as `node_modules/`, `dist/`, and generated release-bundle output;
- review the tracked tree for accidental local/private artifacts, secrets, credentials, editor state, temporary logs, caches, generated files, and obsolete migration remnants;
- verify source packages and fixtures intentionally included in the repository;
- ensure the public tree contains no material that is private merely because the repository was previously private.

## Launch gate D — GitHub branch/change protection

**Status: OPEN — host-side verification required.**

Before public launch, `main` should have an explicit change-control policy appropriate for the Preview. At minimum decide and configure:

- whether direct pushes to `main` are allowed;
- required pull request workflow;
- required Hardening CI checks;
- whether branches must be up to date before merge;
- force-push policy;
- deletion policy;
- merge methods (squash/merge/rebase) intentionally allowed;
- whether signed commits/tags are required or recommended.

The connected GitHub integration could not read branch-protection state (`403`), so these controls must be verified directly in GitHub before launch. No claim is made that they are currently enabled or disabled.

## Launch gate E — Security reporting and GitHub security features

**Status: OPEN — public-host activation required.**

`SECURITY.md` exists and intentionally states that the private vulnerability-reporting path is not yet claimed as active.

Before the first public Preview release:

- enable and verify GitHub Private Vulnerability Reporting / Security Advisories where available;
- verify the public `SECURITY.md` instructions against the actual enabled reporting path;
- decide Dependabot/security-alert settings appropriate for the repository;
- verify secret-scanning/push-protection availability and desired settings;
- define how Critical/Major reports block subsequent Preview releases.

Do not advertise a private vulnerability-reporting mechanism until it is actually enabled and tested.

## Launch gate F — Release protection and supply-chain policy

**Status: OPEN.**

The RC uses integrity-bound artifacts, but public release-host policy still needs an explicit decision/configuration for:

- GitHub release immutability where available;
- tag deletion/rewrite policy;
- whether release tags should be cryptographically signed;
- whether commits used for releases should be signed;
- whether release creation remains a controlled manual process or moves to a protected workflow;
- retention of release evidence and checksums;
- ensuring the public release is created from the exact reviewed/tagged commit.

The current `v0.1.0-rc.1` annotated tag is unsigned. This is documented evidence, not a defect by itself; signing policy remains a launch decision.

## Launch gate G — Distribution and installation user journey

**Status: OPEN FOR FINAL PUBLIC REVIEW.**

The executable lifecycle and package/release-bundle paths are verified. Before public launch, verify the public user journey end to end using only instructions a new user can actually follow:

- supported installation path;
- `livariant version` / `status` / `doctor`;
- fresh `init` inspect/apply path;
- existing-project adoption path;
- provider Resume path;
- update manifest/artifact/trusted-source flow;
- migration routing;
- `recover` inspect/apply flow;
- checksum/integrity verification guidance;
- explicit warning against manual Project Brain/lifecycle replacement.

The public documentation must match the actual RC bytes and CLI behavior, not merely the source tree.

## Launch gate H — Privacy and network-behavior review

**Status: MATERIAL PRESENT; FINAL REVIEW REQUIRED.**

`docs/privacy-and-network.md` currently states that the Runtime has no Livariant telemetry, no automatic Project Brain upload, and no automatic remote update check, with local paths used for update inputs.

Before launch, re-verify these claims against the exact public candidate and ensure any provider-side behavior is clearly separated from Livariant Runtime behavior.

## Launch gate I — Contribution, support, and community surface

**Status: MATERIAL PRESENT; OWNER POLICY REVIEW REQUIRED.**

`CONTRIBUTING.md`, `SECURITY.md`, and Preview support/stability documentation exist. Before launch, explicitly review:

- whether external contributions are wanted during Preview;
- CLA/DCO policy;
- issue and pull-request expectations;
- support expectations and absence of paid SLA unless separately agreed;
- code-of-conduct/conduct language and whether a separate `CODE_OF_CONDUCT.md` is desired;
- issue/PR templates and labels;
- public roadmap/request policy.

Contribution-license wording depends on the final license decision and must not be finalized independently of Launch gate B.

## Launch gate J — Documentation consistency sweep

**Status: OPEN.**

Before publication, perform a repository-wide consistency pass for statements that still describe:

- the repository as not yet existing;
- the RC/version as not yet chosen;
- the first RC as not yet built/published privately;
- `project-brain-framework`, `project-brain-framework-runtime`, or `pb-dev` as active public identities;
- unsupported provider capabilities as supported;
- Ubuntu/Windows/Node support beyond what has actually been tested.

Historical records and deliberate compatibility fixtures may retain old identities when clearly contextualized.

## Launch gate K — Public-host configuration and visibility

**Status: CLOSED BY POLICY UNTIL ALL PRIOR REQUIRED GATES ARE ACCEPTED.**

Only after the preceding launch decisions and checks are complete:

1. perform a final private repository audit;
2. verify `main` and the intended public release tag/commit;
3. configure the selected GitHub protections/security features;
4. make the repository public;
5. immediately verify security-reporting and repository settings in the public state;
6. verify README, license, documentation, and release visibility as an unauthenticated/public viewer;
7. only then treat the canonical GitHub source identity as an active public Livariant release source.

Repository visibility must never be changed implicitly as part of another gate.

## Launch gate L — Final Public Preview release review

**Status: NOT STARTED.**

After the public-host configuration is correct, perform one final release review against the actual candidate intended for public use. Confirm at least:

- version/channel/schema/source identity;
- tag-to-commit binding;
- CI evidence on supported platforms;
- package and release-bundle smoke evidence;
- published artifact digest vs manifest and `SHA256SUMS`;
- installation/user-journey documentation;
- known limitations and required user actions;
- security/private-reporting path;
- license and third-party notices;
- no unresolved Critical/Major safety, authority, migration, recovery, or release-integrity blocker.

Only an explicitly accepted result of this review authorizes calling the release a Public Preview.

## Current next order

Work through the gates in this order unless a dependency requires otherwise:

1. repository hygiene (`.gitignore` + tracked-tree audit);
2. license/ownership decision;
3. public README/product presentation;
4. documentation consistency;
5. contribution/support/community policy;
6. GitHub branch/security/release settings;
7. final private launch audit;
8. repository visibility change;
9. public-view verification;
10. final Public Preview release review.
