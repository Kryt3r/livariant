---
type: implementation-hardening-decision
status: accepted
phase: public-preview-hardening
scope: executable-baseline
language: en
owner: framework
---

# Executable Skeleton & Package Structure

The first executable hardening baseline uses one intentionally small Node.js / TypeScript package. Its purpose is to create a real testable Runtime spine before adding project mutation behavior.

> **The first executable package proves Runtime boundaries and read-only project discovery before it gains authority to initialize or migrate project state.**

## Single-Package Baseline

The first `0.x` hardening implementation remains one package rather than a monorepo of independently versioned packages.

This follows the accepted FOUNDATION-10 release model: the Framework currently has one canonical release identity and there is no demonstrated need for independently distributed Runtime, CLI, Adapter, or SDK release trains.

The package split may evolve later if real distribution needs justify it. Internal module boundaries must not be confused with independent public package ownership.

## Development Identity

The executable baseline uses a development-only package and Framework identity:

```text
0.0.0-development
```

and the `development` update channel.

This identity must not be presented as a Public Preview release. A concrete `0.x` preview version is assigned only when the applicable Preview gates are satisfied and a real release is intentionally published.

The temporary executable namespace remains replaceable. Development invocation may use `pb-dev`; this does not establish the final public product or command name.

## Initial Repository Shape

The executable baseline adds the following implementation surfaces:

```text
package.json
tsconfig.json

src/
  cli/
  runtime/
  project/
  project-brain/
  lifecycle/
  adapters/
  validation/

tests/
```

The module ownership follows `runtime/minimal-runtime-and-cli-architecture.md`.

## Dependency Discipline

The initial Runtime has no required third-party runtime dependency.

Node.js standard-library capabilities are sufficient for the first read-only command surface. TypeScript and Node type definitions are development/build dependencies only.

New dependencies must solve a concrete need and should not be added merely because a common CLI stack exists.

Dependency minimization is not an absolute rule; correctness, security, maintenance quality, and implementation clarity remain more important than dependency count.

## Initial Executable Commands

Hardening 1B makes only these commands executable:

- `version`
- `status`

Mutation-capable `init`, update application, migration, recovery repair, and other later behavior are intentionally excluded from this step.

### `version`

Reports established executable lifecycle identity:

```text
Framework version: 0.0.0-development
Runtime: node
Channel: development
```

### `status`

Performs read-only project inspection and reports the current lifecycle state without initializing missing state.

For a fresh directory, the expected semantic result is equivalent to:

```text
Project: <resolved project path>
Framework installation: 0.0.0-development
Project Brain: not initialized
Lifecycle: uninitialized
Changes made: 0
```

A missing Project Brain is a valid Fresh Project state, not corruption and not an exceptional runtime failure.

## CLI / Runtime Boundary in Code

The CLI translates user invocation to Runtime API calls. The Runtime owns project status reasoning.

`status` therefore calls the Runtime API instead of directly inspecting `.project-brain` files in command-handler code.

This boundary is part of the executable architecture and is required for future non-CLI interfaces to reuse the same Framework behavior.

## Project Brain Presence Inspection

The initial Project Brain store supports presence inspection only. It establishes the storage boundary without granting bootstrap or semantic-write behavior prematurely.

Physical file-layout knowledge remains localized behind the Project Brain storage surface rather than spreading through CLI and Runtime modules.

## Ownership Representation

Executable baseline types represent at least:

- framework-owned,
- project-owned,
- mixed/projected

ownership classes.

This is established before mutation-capable features are implemented so later initialization and migration behavior can enforce accepted ownership contracts rather than retrofit them after project writes already exist.

## Controlled Error Surface

Unknown CLI commands fail with a controlled non-zero exit status and concise error output.

Normal CLI error handling must not expose raw stack traces as standard user-facing output.

Internal Runtime failures remain distinguishable from valid lifecycle states such as `uninitialized`.

## Initial Verification Contract

The 1B executable baseline must be testable for at least:

1. `version` reports development identity;
2. `status` on an empty temporary project performs no durable mutation;
3. missing Project Brain is reported as valid `uninitialized` state;
4. Runtime status is callable independently of the CLI;
5. an unknown CLI command fails in a controlled way.

These tests are the first executable hardening evidence. They do not by themselves satisfy the Fresh Project Preview gate, because initialization has not yet been implemented.

## Scope Boundary

Hardening 1B deliberately does not implement:

- Project Brain bootstrap writes;
- human-input collection;
- project-type inference beyond what is needed for later discovery;
- agent instruction projection;
- update application;
- migrations;
- repair;
- remote release discovery;
- Public Preview packaging.

Those capabilities are added only when required by subsequent readiness scenarios.

## Core Principles

> **One small executable package is sufficient until independent distribution pressure exists.**

> **Read-only discovery is proven before mutation-capable initialization is implemented.**

> **Missing Project Brain state is a valid lifecycle state, not an error condition.**

> **Development identity must not masquerade as a Public Preview release.**

> **Executable tests create evidence for accepted Framework contracts rather than redefining those contracts.**
