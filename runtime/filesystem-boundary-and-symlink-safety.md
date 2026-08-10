---
type: release-hardening-decision
status: accepted
phase: public-preview-hardening
block: HARDENING-1M
language: en
owner: framework
---

# Filesystem Boundary & Symlink Safety

Managed framework writes must remain inside their explicitly authorized storage boundary. Filesystem writability, symlink traversal, or path indirection never expands semantic authority.

## Canonical Project Brain Surfaces

The canonical Project Brain root `.project-brain/` must be a real directory rather than a symbolic link.

The managed canonical files:

- `project.md`
- `goals.md`
- `decisions.md`
- `knowledge.md`
- `metadata.json`

must be regular files and must not be symbolic links before Runtime operations treat the Project Brain as valid.

A managed canonical file that is a symlink, directory, device, or other unexpected filesystem type is an unsupported or ambiguous Project Brain state. Mutation stops and diagnosis is required.

## Lifecycle Storage

`.project-brain/.lifecycle/` is framework-managed durable lifecycle evidence. When present it must be a real directory and must not be a symbolic link.

Migration journal paths are resolved beneath this directory and are not allowed to escape it.

## Runtime Writes

Before a managed write, the Runtime must establish that the intended target path is within the authorized root for that operation.

Examples include:

- canonical Project Brain writes inside `.project-brain/`,
- lifecycle journal writes inside `.project-brain/.lifecycle/`,
- migration metadata candidates inside `.project-brain/`,
- framework-created checkpoint and recovery staging paths inside the project root.

A path that escapes its authorized root is rejected before mutation.

## Recovery Checkpoint Trust

A recovery checkpoint path persisted in a migration journal is durable evidence, not trusted authority.

Recovery validates that the checkpoint path:

- remains inside the project root,
- matches the expected checkpoint identity for the interrupted operation,
- contains the required Project Brain files as regular non-symlink files,
- matches the expected source Framework version and Project Brain schema.

A missing, redirected, tampered, or out-of-bound checkpoint blocks automatic recovery.

## Diagnostic Behavior

Filesystem boundary violations narrow Runtime authority. They do not trigger automatic repair, link replacement, target rewriting, or reinitialization.

`doctor` and Project Brain inspection report the state as invalid, ambiguous, damaged, drifted, or recovery-required as applicable while remaining read-only.

## Executable Evidence

HARDENING-1M adds executable adversarial coverage demonstrating that:

- a symlinked `decisions.md` cannot redirect an accepted-decision write outside Project Brain;
- a symlinked `metadata.json` blocks migration planning/application;
- a symlinked `.lifecycle` directory cannot redirect migration-journal writes;
- a tampered recovery checkpoint path outside the project root is rejected;
- the external targets used by these tests remain unchanged;
- normal non-symlink Project Brain behavior remains covered by the existing hardening suite.

## Core Rule

> Filesystem capability never expands semantic authority. Every managed write target must be proven to remain inside its authorized canonical storage boundary before mutation.
