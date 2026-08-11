# Public Preview Launch Readiness

Status: **private RC exists; public launch not yet authorized**

This document tracks the current Public Preview launch gates against the actual canonical repository state. It is a current-facing readiness surface, not a historical preparation record.

> [!IMPORTANT]
> Repository visibility remains private until every required pre-public gate is explicitly accepted. A private RC, green CI, or completed documentation block does not authorize publication by itself.

## Current verified baseline

- Canonical repository: `Kryt3r/livariant`.
- Repository visibility: private.
- Current `main`: `ebf91d7e95a573e78d375f06fdb060c1bc4fa0bb` after PR #7.
- Post-merge Hardening CI #36: Ubuntu + Windows success, including the public truth-surface consistency check.
- RC version: `0.1.0-rc.1`.
- Release channel: `preview`.
- RC tag: `v0.1.0-rc.1`.
- RC source commit: `f8b5b7afa646b9532d9c47ef46843ff821c722f6`.
- RC artifact SHA-256: `ea7fb30a057ef14277ea4d6d4e2e363ba487a079a998ee74afb51e2ced1506d5`.
- Private GitHub pre-release contains the packed Runtime, `release-manifest.json`, and `SHA256SUMS`.
- The existing RC is evidence and must not be recreated or overwritten casually.

## Gate summary

| Gate | Area | Current state |
| --- | --- | --- |
| A | Product-facing README and presentation | **CLOSED** |
| B | License and ownership decision | **CLOSED** |
| C | Repository hygiene and publication contents | **MATERIAL COMPLETE — final private tree audit remains** |
| D | GitHub branch/change protection | **CONFIGURED — public-transition re-verification remains** |
| E | Security reporting and GitHub security features | **PARTIAL — public-host activation remains** |
| F | Release protection and supply-chain policy | **CONFIGURED WITH DOCUMENTED RC EXCEPTION** |
| G | Distribution and installation user journey | **MATERIAL COMPLETE — final candidate walkthrough remains** |
| H | Privacy and network-behavior review | **MATERIAL COMPLETE — final candidate re-verification remains** |
| I | Contribution, support, and community surface | **BOUNDED — contributor-rights policy remains** |
| J | Documentation consistency | **CLOSED WITH AUTOMATED REGRESSION GUARD** |
| K | Public-host configuration and visibility | **CLOSED BY POLICY UNTIL FINAL PRE-PUBLIC GATES PASS** |
| L | Final Public Preview release review | **NOT STARTED** |

## Launch gate A — Product-facing README and repository presentation

**Status: CLOSED.**

PR #5 converted the README into the accepted multilingual product-landing presentation with branding, English/German navigation, table of contents, Quickstart, visible safety callouts, current lifecycle guidance, narrow Claude Code/Codex Resume claims, and linked user documentation.

PR #6 then corrected stale current-facing linked documentation.

Any further changes are normal product-documentation maintenance unless a later change invalidates a launch-relevant claim.

## Launch gate B — License and ownership decision

**Status: CLOSED.**

Livariant is source-available under the **PolyForm Perimeter License 1.0.1**. It is not presented as OSI Open Source.

Current-facing license surfaces are aligned, including `LICENSE`, `LICENSING.md`, `CONTRIBUTING.md`, README documentation, and third-party notices. Third-party Apache/MIT licenses are explicitly separated from Livariant's own license.

External code contribution rights remain a separate Gate I policy question; they do not reopen the product-license decision.

## Launch gate C — Repository hygiene and publication contents

**Status: MATERIAL COMPLETE — final private tree audit remains.**

Established:

- root `.gitignore` excludes dependencies, build output, generated release output, logs, local environment/secrets, caches, editor state, and OS metadata;
- package payload is restricted and verified by package smoke tests;
- current tracked tree has been repeatedly exercised through cross-platform CI;
- current user-facing truth surfaces are checked for known superseded claims.

Remaining before visibility change:

1. perform one final private tracked-tree audit for accidental private/local artifacts, credentials, secrets, obsolete generated files, and publication-inappropriate material;
2. confirm test fixtures containing deliberate `.env`/legacy examples contain only synthetic non-secret data;
3. confirm no private maintainer-only material has entered the product repository.

This is a bounded final audit, not an invitation for broad repository cleanup.

## Launch gate D — GitHub branch/change protection

**Status: CONFIGURED — public-transition re-verification remains.**

The selected host policy has been configured:

- PR-required changes to `main`;
- required Ubuntu and Windows Hardening CI checks;
- linear history;
- conversation resolution;
- deletion and force-push protection;
- squash merge only; merge commits and rebase merges disabled;
- release-tag protection for `v*`.

The repository metadata API confirms the selected merge-method policy. The classic branch-protection endpoint reports no classic branch protection because Livariant uses repository rulesets instead. The ruleset API is not readable for this private repository through the current plan/integration and returns a plan-related `403`.

Therefore the controls are treated as configured from host-side setup evidence, but their effective public-state behavior must be re-verified immediately after the repository becomes public. Do not misinterpret the classic `protected: false` field as proof that the configured ruleset does not exist.

## Launch gate E — Security reporting and GitHub security features

**Status: PARTIAL — public-host activation remains.**

Already established:

- `SECURITY.md` defines the intended private reporting model without falsely claiming it is already operational;
- dependency graph enabled;
- Dependabot alerts enabled;
- Dependabot security updates enabled;
- grouped security updates enabled;
- Dependabot malware alerts enabled;
- Actions are constrained and pinned to full commit SHAs.

Deferred because of current private-repository plan limitations:

- enable and verify Secret Scanning;
- enable and verify Push Protection;
- enable and verify CodeQL / Code Scanning where available;
- enable and test the intended private vulnerability-reporting path / Security Advisories as available in the public repository state;
- re-read `SECURITY.md` against the actual enabled reporting mechanism.

A working private security-reporting path is required before the first public Preview release is treated as launched.

## Launch gate F — Release protection and supply-chain policy

**Status: CONFIGURED WITH DOCUMENTED RC EXCEPTION.**

Established:

- RC artifact is manifest/checksum bound;
- release source commit and artifact digest are recorded;
- `v*` tag protection is configured against updates/deletions/force pushes while permitting release-tag creation;
- release immutability is enabled for future releases;
- release evidence includes checksum and manifest material;
- CI verifies release-bundle behavior.

Documented exception:

- `v0.1.0-rc.1` predates release-immutability activation and GitHub reports that existing release as `immutable: false`;
- it must not be recreated or overwritten;
- this historical exception does not authorize mutable future releases.

Cryptographic signing of the existing RC tag/commit is not retroactively required for Preview. Any future signing policy should be introduced deliberately rather than rewriting this evidence baseline.

## Launch gate G — Distribution and installation user journey

**Status: MATERIAL COMPLETE — final candidate walkthrough remains.**

Current public documentation covers:

- supported release-artifact installation path;
- `version`, `status`, and `doctor`;
- fresh `init` inspect/apply behavior;
- existing-project adoption;
- Claude Code/Codex Project Brain Resume handoff;
- manifest/artifact/trusted-source update flow;
- schema-changing update routing;
- `recover` inspect/apply behavior;
- integrity/checksum concepts;
- explicit warnings against manual Runtime/Project-Brain/lifecycle replacement.

Before visibility change, perform one final clean-consumer walkthrough using only the public documentation and the candidate intended for public consumption. The walkthrough must test the documented path, not invent a package-manager flow that Livariant does not yet support.

## Launch gate H — Privacy and network behavior

**Status: MATERIAL COMPLETE — final candidate re-verification remains.**

`docs/privacy-and-network.md` currently states that Livariant implements no telemetry, no automatic Project Brain upload, no Livariant cloud-account requirement for local operation, and no automatic remote update check. Provider behavior is explicitly separated from Livariant Runtime behavior.

Before publication, re-verify those statements against the exact candidate source/runtime intended for the public Preview. Any newly introduced network behavior would reopen this gate.

## Launch gate I — Contribution, support, and community surface

**Status: BOUNDED — contributor-rights policy remains.**

Already established:

- Issues enabled;
- Discussions enabled;
- Projects disabled intentionally;
- `CONTRIBUTING.md` explicitly blocks external code incorporation for now while permitting bug reports, documentation feedback, and design discussion;
- Preview support is community/maintainer based with no paid SLA by default;
- conduct expectations are stated in `CONTRIBUTING.md`.

Remaining deliberate decision:

- finalize contributor rights / CLA or equivalent terms before external code contributions can be accepted for incorporation.

This is **not required to make the repository readable publicly** if external code contributions remain explicitly closed. It is required before accepting external code.

Issue/PR templates, a standalone `CODE_OF_CONDUCT.md`, Wiki, and public roadmap tooling are optional improvements unless a concrete launch problem makes one necessary.

## Launch gate J — Documentation consistency

**Status: CLOSED WITH AUTOMATED REGRESSION GUARD.**

PR #6 corrected current-facing stale CLI, licensing, preparation-state, and launch claims. PR #7 generalized the failure into Knowledge Drift / Truth Surfaces and added `npm run test:public-docs` to both required Hardening CI jobs.

The rule is now explicit:

> **Presence is not currency.**

Historical records may preserve superseded terms when they are genuinely historical. Current user-facing truth surfaces may not silently present superseded project identity or policy as current.

A future canonical change that invalidates current documentation reopens the affected surface, not this entire historical gate by default.

## Launch gate K — Public-host configuration and visibility

**Status: CLOSED BY POLICY UNTIL FINAL PRE-PUBLIC GATES PASS.**

The repository must remain private until the following bounded pre-public work is complete:

1. final private tracked-tree/publication audit (Gate C);
2. final clean-consumer documentation/user-journey walkthrough (Gate G);
3. final privacy/network re-verification (Gate H);
4. final private candidate review for unresolved Critical/Major safety, authority, migration, recovery, or release-integrity blockers.

Then, and only then:

1. make the repository public as an explicit standalone action;
2. immediately verify rulesets, required checks, tag protection, merge policy, Actions permissions, and release settings in the public state;
3. enable/test the public-state security features in Gate E;
4. configure the selected Social Preview image;
5. verify README, license, documentation, and repository presentation as an unauthenticated viewer.

Repository visibility must never change implicitly as part of another gate.

## Launch gate L — Final Public Preview release review

**Status: NOT STARTED.**

After public-host/security configuration is verified, perform one final review against the actual candidate intended for public use. Confirm at least:

- version/channel/schema/source identity;
- candidate source commit and tag policy;
- Ubuntu/Windows CI evidence;
- package and release-bundle smoke evidence;
- artifact digest/manifest/checksum integrity;
- installation/user-journey documentation;
- known limitations and required user actions;
- private security-reporting path;
- license and third-party notices;
- no unresolved Critical/Major safety, authority, migration, recovery, data-integrity, or release-trust blocker.

Only an explicitly accepted result of this review authorizes calling the release a Public Preview.

## Current next order

The remaining work is now intentionally narrow:

1. final private repository/publication audit;
2. final documented clean-consumer user-journey walkthrough;
3. final privacy/network claim verification;
4. final private candidate blocker review;
5. explicit repository visibility decision/action;
6. immediate public-host security/protection verification and activation;
7. unauthenticated public-view verification;
8. final Public Preview release review.

The Project Lexicon / Provisional Naming capability is valuable post-gate work but is not required to complete this Public Preview launch sequence.