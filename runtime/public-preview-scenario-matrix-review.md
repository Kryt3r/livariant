---
type: implementation-hardening-review
status: accepted
phase: public-preview-hardening
scope: scenario-matrix-and-adversarial-evidence
language: en
owner: framework
---

# Public Preview Scenario Matrix — Deep-Hardening Re-evaluation

This document re-evaluates the FOUNDATION-10 Public Preview scenario and adversarial gates after the Deep Hardening & Consistency Review. It supersedes the earlier 1L gap snapshot in this file.

The assessment is deliberately evidence-based:

- **GREEN** means the currently supported executable path is covered by focused tests and the full CI hardening suite.
- **PARTIAL** means useful executable evidence exists but the complete release gate is not demonstrated.
- **BLOCKED** means Public Preview must not claim the gate as satisfied yet.

GREEN is scoped to the supported Preview implementation. It is not a universal guarantee for arbitrary future adapters, filesystems, release sources, or migration chains.

## Canonical Gate

`distribution/public-preview-readiness.md` requires executable evidence for:

1. fresh project initialization,
2. existing small-project adoption,
3. existing messy-project adoption,
4. cross-provider resume including Claude-to-Codex or equivalent,
5. normal framework-only update,
6. migration update,
7. interrupted update,
8. recovery after failed migration.

It also requires deliberate adversarial evidence for data loss, scope escalation, stale Project Brain knowledge, conflicting instructions, broken initialization, interruption, incompatible migration paths, and manually replaced/drifted state.

## Required Scenario Matrix

| # | Scenario | Current evidence | Status |
|---|---|---|---|
| 1 | Fresh project | discovery-only planning; explicit init authority; minimal five-file Brain; failed promotion cleanup; repeated-init protection | **GREEN** |
| 2 | Existing small project | dedicated fixture; byte-identical preservation of existing files; direct-evidence-only adoption; repeat init blocked | **GREEN** |
| 3 | Existing messy project | malformed metadata, contradictory docs, native agent files, legacy source and artificial secrets; byte-identical preservation; no secret/conflict ingestion | **GREEN** |
| 4 | Cross-provider resume | concrete framework-bundled Claude Code and Codex Preview resume adapters; explicit current-environment evidence; isolated-process Claude→Codex transition; no shared hidden session state; Project Brain remains canonical; native instruction files remain untouched | **GREEN** |
| 5 | Normal framework-only update | real installable target npm package; release source/artifact/digest binding; target Runtime installation and attestation; explicit authority; preservation race check; Project Pin is final commit point; clean retry semantics | **GREEN** |
| 6 | Update requiring migration | explicit 1→2 migration contract; real target Runtime package; checkpoint digests; durable journal; project knowledge preservation; validation before target activation; fail-closed unsupported path | **GREEN** |
| 7 | Interrupted update | non-replay-safe in-progress step evidence; blind replay blocked; normal update blocked while recovery is unresolved; status/doctor narrow to recovery-required | **GREEN** |
| 8 | Failed-migration recovery | separately authorized recovery; checkpoint path and content integrity; staged restore; source version/schema restoration; failed recovery remains diagnosable; new operation ID required for retry | **GREEN** |

**Scenario result: 8 GREEN / 0 PARTIAL / 0 BLOCKED.**

The cross-provider gate is GREEN only for the explicitly supported Preview surface: provider-specific, ephemeral Resume handoff. This is not a claim that the Framework controls every Claude Code or Codex capability. The Preview adapters currently declare and observe only `resume.context.project`.

## Practical Provider Transition Evidence

The Framework now exposes two concrete, framework-bundled Preview adapters:

- `framework.claude-code.resume@0.1.0-preview`
- `framework.codex.resume@0.1.0-preview`

Both adapters:

- target a named provider environment,
- declare the narrow capability `resume.context.project`,
- distinguish declared capability from current observed availability,
- require current provider-environment evidence before rendering a handoff,
- report compatibility rather than assuming it,
- grant no execution authority,
- perform no durable native-instruction mutation,
- consume the same canonical `ResumeContext` semantics.

Current environment detection for this Preview surface uses explicit Framework selection through `PBF_PROVIDER_ENV`. Explicit human/framework selection is an allowed Adapter detection mechanism under the accepted Adapter Contract. Missing evidence produces `unknown`; conflicting selection produces `incompatible`; neither state is silently treated as compatible.

The practical transition test uses the same persistent project in two isolated Node processes:

```text
canonical Project Brain
→ Claude Code Preview adapter process
→ Claude process ends
→ no Claude session state is passed forward
→ Codex Preview adapter process
→ same canonical active decision is reconstructed
```

The Claude process receives provider-local hidden-memory noise which is not persisted. The Codex process receives different, conflicting provider-local hidden-memory noise. Neither hidden value appears in the provider handoff. Existing human-owned `CLAUDE.md` and `AGENTS.md` remain byte-identical.

This satisfies the FOUNDATION-10 provider-independence gate for the supported Preview Resume surface without overstating support for unrelated provider execution capabilities.

## Adversarial Evidence Matrix

### Data Loss — GREEN

Evidence across fresh/existing-project, normal-update, migration, and recovery tests verifies byte preservation of project-owned files on supported paths. Migration checkpoints are bound to canonical file digests; recovery refuses modified checkpoints. Normal update rechecks project-owned bytes immediately before the final Project Pin commit, so concurrent project-owned mutation aborts activation rather than being overwritten or repaired.

### Scope / Authority Escalation — GREEN

Managed Project Brain files must be real files; `.lifecycle` must be a real directory. Symlinked decision, metadata, and lifecycle surfaces are blocked. Recovery checkpoint paths cannot escape the authorized project root. Initialization, decision changes, update, migration, and recovery all require explicit Runtime authorization before mutation. Provider Resume adapters explicitly report `executionAuthorityGranted: false`; environment detection never creates authority.

### Stale Project Brain Knowledge — GREEN

The Runtime has explicit active/superseded decision records. Supersession preserves the previous decision as history, creates a new active replacement, and Resume projects only active truth. A stale Resume object remains derived and cannot promote itself back into canonical state. The dedicated stale-knowledge regression test is the release evidence for this gate.

### Conflicting Instructions — GREEN for the currently supported provider surface

Existing `CLAUDE.md` and `AGENTS.md` remain human-owned and byte-identical during adoption and practical provider-transition tests. Provider Resume adapters do not ingest contradictory native instruction text as canonical truth and do not mutate those instruction files.

This status does **not** pre-approve future native instruction-file generation. If a later adapter writes or reconciles provider-native instructions, that new mutation surface requires its own adversarial evidence before being called supported.

### Broken Initialization — GREEN

Fresh initialization is discovery-first and read-only until explicit authorization. Bootstrap uses a temporary candidate, validates it, rechecks destination state before promotion, and removes the candidate on pre-promotion failure. Existing or partial/damaged Project Brain state blocks fresh initialization instead of being overwritten.

### Interrupted Update / Replay Safety — GREEN

An interrupted non-replay-safe migration leaves durable in-progress evidence and cannot be blindly replayed. Open migration state blocks normal-update planning/application and routes into explicit recovery.

### Incompatible / Incomplete Migration Path — GREEN

A dedicated adversarial test requests an unsupported schema target and proves migration planning fails closed while the source schema remains unchanged. Only the explicit supported 1→2 contract is currently executable.

### Manual / Drifted Integration State — GREEN for the implemented doctor/distribution model

Doctor is read-only and detects unsupported Framework versions/channels, schema postcondition drift, identity conflicts, partial/damaged Brain state, invalid migration evidence, interrupted migration, and invalid installed Runtime evidence. Installed Runtime package trees are digest-bound after installation; post-install file drift invalidates reuse and execution rather than being silently accepted.

### Release Artifact / Installed Runtime Integrity — GREEN

Release identity binds version, channel, source ID, artifact ID, and SHA-256. Artifact verification occurs before material application. Runtime installation disables npm lifecycle scripts, validates package identity/version, starts the installed CLI for version attestation, records deterministic installed-package-tree integrity, and verifies that integrity before reuse/delegation.

A prepared Runtime does not gain execution authority by existing on disk. The Project Brain Framework pin is the canonical activation decision; the launcher delegates only when installed Runtime evidence is valid and its version matches the Project Pin.

## Distribution Evidence

The CI hardening workflow performs all of:

1. locked dependency installation,
2. TypeScript build,
3. complete executable hardening test suite,
4. `npm pack`,
5. installation of the produced tarball into a clean consumer project,
6. execution of the installed CLI from that consumer environment,
7. provider-specific Resume handoff through the installed Codex Preview adapter with explicit environment evidence.

This closes the distinction between "repository source works" and "the distributable package actually installs and exercises the supported provider-handoff surface."

## Invariant-Consistency Result

The Deep Hardening & Consistency Review has not identified a confirmed unresolvable `INVARIANT CONFLICT` between the accepted Foundation contracts.

The significant findings encountered during hardening were implementation-boundary failures — filesystem authority, lifecycle evidence durability, release trust, runtime activation identity, retry semantics, stale canonical truth, atomic commit ordering, and provider-evidence honesty. They were resolvable by strengthening boundaries without abandoning another protected Foundation invariant.

This does not prove future changes can never create a conflict. It establishes that the currently implemented Preview executable baseline has no known Major/Critical logical contradiction among the reviewed protected properties.

## Executable Readiness Classification

**Executable scenario/adversarial baseline: COMPLETE FOR THE CURRENT PUBLIC PREVIEW SCOPE.**

All eight required FOUNDATION-10 scenario gates are GREEN for the explicitly supported executable surface, and the required adversarial classes have current executable evidence. No known Critical or Major safety, data-integrity, migration, authority, release-integrity, or provider-independence blocker remains open in that executable scope.

This classification addresses executable scenario readiness only. FOUNDATION-10 separately requires public documentation, legal/public-release review, naming/branding considerations, and preview support/stability communication before an actual public release.

## Next Release-Readiness Work

Do not reopen executable architecture by default. The next phase should address the remaining non-executable Public Preview gates:

1. public documentation and five-minute Quickstart,
2. Existing Project, architecture, safety, update/migration/recovery documentation,
3. legal/public-release baseline,
4. product naming/trademark/branding readiness,
5. explicit Preview support, compatibility, stability, and known-limitations communication,
6. final Release Candidate gate and end-to-end public-install rehearsal.

Any new executable feature introduced during that work must receive proportional hardening before it becomes part of the supported Preview surface.

## Core Rule

> **The executable Public Preview gate is satisfied only for capabilities the product truthfully claims as supported. Claude Code and Codex are currently supported for provider-specific Resume handoff through capability-bounded Preview adapters; that support does not silently expand into unrelated provider execution authority or native-instruction mutation.**