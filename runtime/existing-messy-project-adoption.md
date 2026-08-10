---
type: implementation-hardening-decision
status: accepted
phase: public-preview-hardening
scope: existing-messy-project-adoption
language: en
owner: framework
---

# Existing Messy Project Adoption

Existing project messiness, conflicting documentation, legacy artifacts, malformed metadata, and sensitive files must narrow what the Framework may conclude. They must not expand Framework authority to normalize, repair, choose among conflicting claims, ingest protected data, or rewrite project-owned state.

> **Messiness is evidence about uncertainty, not permission to clean up the user's project.**

## Messy Project Is Still an Existing Project

A project containing legacy files, duplicated documentation, old source trees, malformed metadata, or contradictory notes is not classified as corrupt merely because it is untidy.

When no Project Brain exists, it remains an existing project eligible for bounded adoption unless a separate protected-state or filesystem condition explicitly blocks initialization.

## Conflicting Evidence

Conflicting project documents must not be silently reconciled during bootstrap.

Conflicts are represented as unresolved evidence or uncertainty. File ordering, filename hints such as `old`, or apparent recency do not grant authority to select one claim as canonical project truth.

## Legacy and Backup Artifacts

Legacy-looking files and directories may be observed as project structure, but adoption must not delete, rename, relocate, or normalize them.

Names such as `old-src`, `README-old.md`, `backup`, or `deprecated` are not sufficient evidence that their contents are disposable or non-authoritative.

## Existing Native Agent Instructions

Existing native instruction surfaces such as `CLAUDE.md` and `AGENTS.md` are treated as protected project-owned integration surfaces during adoption.

The initial Project Brain bootstrap may detect their presence, but it must not replace, rewrite, merge into, or claim ownership over them.

Native instruction projection and reconciliation are separate Adapter hardening concerns.

## Sensitive File Discovery

Sensitive-looking files may be detected by presence without reading or ingesting their contents into normal bootstrap evidence.

The current executable baseline recognizes selected root-level sensitive surfaces such as:

- `.env`
- `.env.local`
- `credentials.json`

and records only presence evidence such as:

```text
sensitive-file-present:.env
```

Secret values or file contents are not copied into Project Brain bootstrap knowledge.

This list is an initial executable baseline, not a complete security classifier.

## Malformed Package Metadata

An unreadable or malformed `package.json` does not automatically block Project Brain adoption.

The executable baseline records both the presence of the file and the unreadable state:

```text
package.json
package.json:unreadable
```

No package name is accepted unless it can be deterministically read from valid package metadata.

## Bounded Discovery

The first executable discovery pass remains intentionally shallow and bounded to known project-root signals.

It does not recursively crawl arbitrary project content and does not follow project content merely to infer additional truth.

This reduces accidental secret ingestion, symlink traversal risk, and unsupported interpretation during bootstrap.

## Mutation Boundary

Messy-project adoption follows the same ownership boundary as small-project adoption:

- existing project files modified: zero;
- existing project files deleted: zero;
- existing project files renamed: zero;
- bootstrap mutation is limited to the new `.project-brain/` state.

Repeated `init` after successful adoption is blocked rather than becoming an implicit normalization or repair command.

## Executable Evidence

The `existing-messy` hardening fixture deliberately contains:

- malformed `package.json`;
- current, legacy, and conflicting documentation;
- `CLAUDE.md` and `AGENTS.md` human-owned instruction files;
- an artificial `.env` secret;
- current and legacy source trees;
- TypeScript configuration.

The executable tests prove that:

1. the messy project remains adoptable as `existing-project-without-brain`;
2. malformed package metadata becomes evidence rather than a fatal initialization error;
3. no unverified package name is accepted;
4. protected native instruction files remain byte-identical;
5. all existing fixture files remain byte-identical;
6. artificial secret values do not enter Project Brain state;
7. conflicting deployment references do not become an automatically selected deployment truth;
8. no domain Profile or architecture is invented;
9. sensitive-file presence may be recorded without content ingestion;
10. repeated initialization is blocked;
11. the adopted Project Brain is reported as initialized afterward.

The scenario is part of the normal locked-install, TypeScript-build, automated hardening CI path.

## Core Rule

> **Messiness, contradiction, legacy artifacts, malformed metadata, and sensitive files narrow what the Framework may conclude; they do not expand its authority to normalize, repair, choose among conflicting claims, or ingest protected data.**
