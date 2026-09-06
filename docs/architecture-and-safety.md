# Architecture & Safety

<p align="center">
  <strong>English</strong> · <a href="de/architecture-and-safety.md">Deutsch</a>
</p>

Livariant separates project knowledge, evidence, provider integration, executable capability, and Authority. The goal is simple: a useful tool, agent, renderer, or Runtime must not quietly become the owner of the project merely because it can technically perform an action.

## Current high-level architecture

Livariant currently combines:

1. **Core / CLI** - TypeScript/Node.js product logic, lifecycle contracts, Project Brain, provider-neutral semantics, MCP, verification, and lower-level control surfaces.
2. **Project Brain** - project-owned durable context/goals/decisions/knowledge/metadata.
3. **Provider/connector layer** - bounded provider context/return, MCP, and Desktop connector-host integration.
4. **Protected Guardian / Authority boundaries** - protected consequential Authority for domains such as lifecycle mutation, semantic mutation, Project Brain integrity acceptance, Runtime trust, and release authorization.
5. **Desktop host** - Tauri 2 / Rust boundary for platform-sensitive operations, runtime/connector/update integration, and Desktop lifecycle.
6. **Desktop renderer** - TypeScript/CSS graphical UI for Project Truth / First Steps, Connections, Diagnostics, Updates, and Settings.

The Desktop renderer is **not** a root of trust and does not create an alternate Project Truth store.

## Project Brain is the durable project record

Project Brain owns the durable project-context domains Livariant explicitly manages:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

Resume output, provider projections, findings, external knowledge, temporary plans, Desktop session state, connector state, and hidden provider memory may be useful, but they are not competing canonical stores.

The current Desktop Project Truth / First Steps workspace still contains renderer/session-state foundation behavior. It must not be described as fully persistent Project Brain mutation until the supported bridge/Authority path exists.

## Presence is not currency

A legitimate file can still be stale.

README files, provider instructions, examples, release guides, architecture summaries, and project notes may have been correct when written and become outdated after later product/Authority/runtime decisions.

Livariant therefore distinguishes:

- **canonical current truth**;
- **dependent current truth** that must track it;
- **historical truth** that preserves an earlier state;
- **ephemeral projections/evidence** derived from current state.

> [!IMPORTANT]
> **Presence is not currency.** Finding a claim in a project-owned file does not prove that the claim is still current.

Finding drift also does not grant permission to rewrite it. Detection and Authority remain separate.

## Evidence is not Project Truth

Provider output, external sources, findings, discovery, verification data, Diagnostics evidence, and reconstructed context are not automatically Project Truth.

The intended shape is:

```text
Evidence
  -> understand / assess / propose
  -> review / explicitly adopt where supported
  -> Project Truth
```

The safe direction is not "an agent said it, therefore write it".

## Capability is not Authority

A permanent rule across Livariant is:

```text
Capability != Authority
Connection != Authority
Proposal != Authorization
```

Technical ability to mutate a file, invoke a process, connect to a provider, or download an update does not establish permission for a consequential action.

Consequential protected Authority is not manufactured by project files, ordinary same-user JSON, provider output, renderer state, or caller-controlled flags.

For protected domains, malformed, missing, stale, substituted, mismatched, or consumed Authority state fails closed.

## Current Guardian/Authority domains

Current protected consumers include consequential paths for:

- lifecycle mutation;
- semantic mutation;
- Project Brain integrity acceptance;
- Runtime trust;
- release authorization.

These domains remain separated. Authorization for one project/operation/material cannot be repurposed for another.

A bare `--apply` expresses execution intent only; it is not protected Authority by itself where the current operation requires Guardian authorization.

## Existing projects are preservation-first

The intended mutation model is:

```text
inspect
-> collect/understand evidence
-> explain proposed scope and impact
-> review
-> establish exact Authority where required
-> perform the smallest sufficient mutation
-> verify
```

Existing project files are not normalized just because Livariant would prefer a different structure.

This matters especially for `CLAUDE.md`, `AGENTS.md`, documentation, configuration, and other pre-existing project-owned surfaces.

## Ambiguous state fails closed

When Livariant cannot establish a safe supported state for a consequential operation, it should narrow/stop rather than guess through it.

Examples include:

- damaged/partial Project Brain state;
- invalid lifecycle/recovery journals;
- unresolved interrupted migration;
- filesystem/symlink/topology substitution;
- unsupported migration paths;
- stale/mismatched Authority material;
- unexpected release/artifact identities;
- Runtime integrity/trust mismatch;
- connector executable identity substitution;
- updater signature/source mismatch.

Read-only diagnostics do not become repair Authority merely because they can identify the problem.

## Desktop trust boundary

The Tauri/Rust host owns platform-sensitive operations that must not be delegated to arbitrary renderer input.

Current Desktop hardening includes bounded controls around:

- exposed Tauri commands / validated IPC inputs;
- navigation/CSP/webview boundaries;
- process spawning and executable selection;
- Codex connector-host inputs/lifecycle;
- app-data and project/filesystem boundaries;
- signed updater endpoint/key/source identity;
- release/dev capability separation;
- rendering of untrusted dynamic text.

The current Codex path preserves accepted executable identity so an app restart does not silently reconnect to a different PATH-resolved executable with the same command name.

Connection persistence is still not Authority.

## Runtime and release trust

Executable code is not trusted merely because it exists on disk or because project-controlled bytes describe it as trusted.

Livariant keeps distinct concepts such as:

```text
release identity
artifact integrity
release authorization
installed Runtime measurement
Runtime trust
project lifecycle authorization
project activation
```

Those checks must not collapse into one boolean.

The exact lower-level order depends on the supported operation/release contract, but project input cannot create protected Runtime/release Authority through ordinary product-facing state.

## Desktop updates are a separate lifecycle domain

The current Desktop updater can discover signed updates through its fixed configured HTTPS feed and public key, present localized release notes, download the update, and request explicit user authorization for installation/restart.

Permanent distinction:

```text
update available != authorized to install
application update != Project Brain mutation
renderer presentation != release Authority
```

The renderer cannot select arbitrary update URLs or executable paths.

See [Updates, Migrations & Recovery](lifecycle-guide.md).

## Migration and recovery

Core/project lifecycle operations remain plan-first and operation-domain separated.

Interrupted work is represented with durable evidence rather than treated as though nothing happened. Recovery checks checkpoint identity/material, lifecycle evidence, and the specific interrupted operation; stale or ambiguous recovery material fails closed.

Manual replacement of Project Brain/lifecycle/protected state is not a supported repair shortcut.

## Provider boundary

Livariant Core exposes provider-neutral context/return and MCP foundations. Current MCP setup guidance exists for Claude Code and Codex.

The Desktop currently has the deeper live local connection path for Codex. Additional providers/connection methods are future extensions unless separately implemented and qualified.

Permanent rule:

```text
Provider != Connection Method != Capability != Role != Authority
```

Provider output remains evidence/candidate material until the relevant supported review/adoption process accepts something more strongly.

## Diagnostics and measurement truth

Diagnostics keeps evidence classes distinct:

```text
Observed != Avoided != Estimated
```

Missing evidence must remain missing. Proxy/context/token/resource measurements are not automatically exact provider billing/cost claims or universal end-user performance guarantees.

Diagnostics does not need raw prompt/project-content capture by default.

## Architecture summary

The central safety idea is not that Livariant knows everything. It is that uncertain knowledge and technical capability do not silently become canonical truth or permission.

```text
Evidence != Truth
Capability != Authority
Proposal != Authorization
Persistence != Trust
Presence != Currency
Verification Evidence != accepted completion
Ambiguous consequential state -> Fail Closed
```

For current release/user scope see [Public Preview Scope & Limitations](preview-scope.md).
