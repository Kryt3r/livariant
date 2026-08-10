---
type: implementation-hardening-decision
status: accepted
phase: public-preview-hardening
scope: existing-small-project-adoption
language: en
owner: framework
---

# Existing Small Project Adoption

Existing-project adoption augments a project with bounded Project Brain state. It does not reinterpret, normalize, rewrite, or take ownership of the existing project merely because the Framework has been introduced.

> **Adoption adds the smallest valid Project Brain while preserving all pre-existing project-owned artifacts and treating discovered project information as evidence rather than silently promoted truth.**

## Existing Project Classification

A non-empty project without a Project Brain is classified separately from an empty Fresh Project.

The executable baseline distinguishes this state as:

```text
existing-project-without-brain
```

A valid existing Project Brain, partial/damaged Project Brain, and unsupported/ambiguous Project Brain remain separate states and retain their existing initialization protections.

## Bounded Discovery

Existing-project discovery may record directly observable technical signals such as:

- `package.json` presence;
- confirmed package name when a readable package manifest explicitly provides one;
- Git repository presence;
- TypeScript configuration presence;
- README presence;
- source-directory presence.

These signals are evidence. Their presence must not silently activate a Profile or establish architecture, product intent, deployment policy, business domain, or other durable project truth.

Dependencies, filenames, README prose, or structural conventions may later support richer evidence workflows, but observation alone does not create authority.

## No Existing-Project Mutation During Adoption

For the first Public Preview adoption baseline, initialization of an existing project without a Project Brain creates only `.project-brain/` state.

The initialization plan must report no pre-existing project files to modify.

The supported adoption path must not:

- rewrite existing source files;
- normalize configuration;
- rename files;
- delete files;
- reformat project artifacts;
- create agent-native instruction files;
- activate domain Profiles automatically;
- infer unconfirmed architecture or deployment choices.

## Byte-Preservation Requirement

Existing project artifacts used by the adoption scenario are protected by byte-level before/after comparison.

Presence alone is insufficient evidence of preservation. A supported adoption test must demonstrate that representative existing files remain byte-identical after Project Brain initialization.

This requirement operationalizes the established project-ownership rule: adopting the Framework does not grant authority over pre-existing project-owned state.

## README and Manifest Evidence

A README may be detected as a source of potential evidence without its prose being silently copied into canonical Project Brain truth.

Likewise, package metadata may establish facts only at the level directly evidenced by the manifest. A confirmed package name may be recorded as confirmed evidence; dependency presence does not by itself establish a domain Profile, architecture pattern, deployment platform, or product intent.

## Profile and Adapter Boundary

Existing-project discovery does not automatically activate domain Profiles or create provider-native instruction projections.

Profile selection and Adapter projection remain separate authority-bearing operations governed by their established contracts.

## Reinitialization Protection

After successful adoption, a second fresh-initialization attempt must detect the valid Project Brain and block reinitialization.

The existing project and the generated Project Brain must remain unchanged by the blocked attempt.

## Executable Evidence Scenario

The repository includes an `existing-small` fixture representing a small pre-existing TypeScript/Node project with known project-owned files.

The automated scenario verifies at least:

1. the project is classified as `existing-project-without-brain`;
2. discovery is read-only;
3. initialization planning reports no existing project files to modify;
4. directly observable technical signals are recorded as evidence;
5. initialization adds Project Brain state only;
6. protected original files remain byte-identical;
7. no unconfirmed architecture, domain, Profile, or deployment claim is generated;
8. status reports the adopted Project Brain as initialized;
9. repeat initialization is blocked;
10. the blocked attempt preserves the existing project.

## Evidence Standard

The scenario is part of the normal executable hardening test suite and must pass through the locked CI build/test path established by Hardening 1D.

A static implementation claim is not sufficient evidence.

## Core Rule

> **Framework adoption must be additive and bounded: evidence may be observed, Project Brain state may be added under authorization, but existing project-owned artifacts and unconfirmed project meaning remain untouched.**
