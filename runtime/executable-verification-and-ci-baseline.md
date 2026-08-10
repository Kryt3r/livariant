---
type: implementation-hardening-decision
status: accepted
phase: public-preview-hardening
scope: executable-evidence
language: en
owner: framework
---

# Executable Verification & CI Baseline

Public Preview readiness evidence requires successful reproducible execution, not only the presence of implementation code or test files.

> **A readiness scenario is not proven because matching code and tests exist. Executable evidence requires a reproducible build and successful automated execution of the applicable test contract.**

## Reproducible Dependency Installation

The executable baseline commits `package-lock.json` and uses `npm ci` in CI.

The lockfile binds the concrete development dependency graph used by the hardening build so CI does not silently resolve a different dependency graph on each run.

The initial development build remains intentionally small and uses only TypeScript and Node.js type declarations as development dependencies.

## CI Scope

The initial GitHub Actions workflow is intentionally limited to executable verification. It is not yet a public release pipeline or the complete repository-public-readiness configuration.

The hardening CI performs:

```text
checkout
→ set up explicit Node.js runtime
→ npm ci
→ TypeScript build
→ executable hardening tests
```

The workflow uses read-only repository permissions and does not require deployment, package publication, write access, secrets, or release authority.

## Runtime Version

The first hardening CI uses Node.js 24 as the explicit execution baseline.

The package currently declares Node.js `>=20`; broader compatibility remains a separate compatibility-evidence question. A single green Node.js 24 run does not prove every supported Node.js version.

## CI Evidence Rule

A hardening scenario may be counted as executable evidence only when the applicable implementation and tests have completed successfully in a reproducible automated run.

Static inspection, local assumptions, or the mere existence of tests are insufficient.

A failed CI run is evidence of a real unresolved implementation or test-contract issue until its cause is understood and corrected.

## First Evidence Run

The first `Hardening CI` run on the executable-baseline branch completed dependency installation and TypeScript compilation successfully but failed one Fresh Project test.

The failure exposed a diagnostic-UX mismatch for a partial Project Brain:

- behavior correctly blocked reinitialization;
- the emitted error stated that required files were missing;
- the accepted test contract required the blocked state to explicitly route the user toward diagnosis.

The Runtime was corrected so `blocked-diagnosis` initialization failures explicitly state that diagnosis is required before mutation.

The subsequent CI run completed successfully with:

- locked dependency installation: success;
- TypeScript build: success;
- executable hardening test suite: success.

This sequence is useful evidence because CI detected a mismatch that static implementation review had not treated as blocking.

## Fresh Project Evidence Status

The successful CI run provides initial executable evidence for the implemented Fresh Project properties, including:

- development release identity is reported correctly;
- Fresh Project status inspection is read-only;
- initialization planning is separated from mutation;
- a minimal Project Brain can be bootstrapped;
- existing project files remain unchanged during Fresh Project adoption;
- repeated initialization does not overwrite an existing valid Project Brain;
- partial or damaged Project Brain state blocks reinitialization and routes to diagnosis;
- failure before final bootstrap promotion does not leave an apparently valid Project Brain;
- Framework version, Project Brain schema version, and update channel are recorded separately;
- unknown project intent remains unknown rather than being invented;
- directly evidenced package identity may be recorded without promoting unsupported assumptions.

This is meaningful evidence toward the Public Preview Fresh Project gate. It does not prove later Existing Project, provider-handoff, update, migration, interruption, recovery, packaging, or broader platform-compatibility gates.

## CI Is Not Repository Public Readiness

The presence of this workflow must not be mistaken for complete GitHub repository setup.

Public repository configuration, contribution workflows, issue/discussion/project organization, branch protection, security automation, release automation, and other GitHub platform features belong to the later Repository Public Readiness pass after the Framework is technically ready for publication.

## Core Principles

> **Green executable evidence is stronger than implementation intent.**

> **A failed hardening test is a finding to investigate, not a result to explain away.**

> **CI verifies Framework behavior; it does not redefine Framework contracts.**

> **Repository automation remains least-privileged and narrowly scoped until broader public-release needs are justified.**
