# Requirement → Implementation → Verification Trace

Livariant can assess whether an implementation claim is actually backed by verification evidence instead of treating "the agent says it is done" as project completion.

The v1 workflow is deliberately read-only:

```text
requirement / acceptance criterion
→ implementation claim
→ verification evidence
→ supported / contradicted / unproven
```

## Why this exists

AI-assisted implementation can look complete while one or more requested outcomes remain untested, contradicted by evidence, or simply unsupported.

`verification-trace` makes that gap visible without silently changing Project Truth, task state, release state, or Authority.

## Run a trace from the CLI

Create a JSON trace and run:

```bash
livariant verification-trace --input trace.json
```

Machine-readable output:

```bash
livariant verification-trace --input trace.json --json
```

The command is read-only and reports `Changes made: 0`.

## Use the trace from an MCP coding agent

When Livariant's local MCP bridge is connected, an MCP-capable coding agent can call:

`livariant_verification_trace`

The tool accepts the same explicit version-1 trace structure as the CLI/core assessor and returns the same deterministic assessment states. It is declared read-only and non-destructive.

Conceptually:

```text
coding agent
  → livariant_verification_trace
  → existing Verification Trace assessor
  → supported / contradicted / unproven
```

This removes the need to hand-run the CLI command during an agent session. It does **not** add automatic requirement discovery or independent verification intelligence: the requirements, implementation claims, and verification evidence still have to be supplied explicitly, and agent-supplied evidence is not trusted merely because it arrived through MCP.

## Assessment states

### `supported`

Relevant verification evidence supports the target or one of its implementation claims.

This means **evidence coverage exists**. It does not mean the requirement is automatically accepted, DONE, canonical, release-ready, or authorized.

### `contradicted`

Relevant verification evidence contradicts the target or one of its implementation claims.

Contradictory evidence takes precedence over an optimistic implementation claim in this assessment. Livariant surfaces the conflict instead of allowing the claim to hide it.

### `unproven`

No relevant supporting evidence exists. This includes cases where implementation is claimed but the available evidence is only inconclusive.

`unproven` does not automatically mean the implementation is wrong. It means the trace does not currently contain enough supporting evidence to justify a stronger assessment.

## Example

An agent claims that authentication work is complete:

```text
Email/password login       → SUPPORTED
Login rate limiting        → CONTRADICTED
Password-reset token reuse → UNPROVEN
```

Livariant can therefore report that the requested work is **not fully evidenced**, even though the implementation agent claimed completion.

That distinction is the point of the feature.

## Input boundary

The v1 input explicitly supplies:

- requirements or acceptance criteria;
- implementation claims;
- Livariant Verification Evidence records.

The trace does not create or persist requirements in Project Brain and does not automatically discover arbitrary implementation claims from code.

Those are separate future capabilities and require their own scope and trust model.

## Safety boundary

The trace assessment, including the MCP consumer:

- is read-only;
- grants no Authority;
- does not mutate Project Truth;
- does not mark work accepted or DONE;
- does not change release decisions;
- does not independently trust evidence because an AI supplied it;
- does not imply that one passing test proves universal completion.

The core rules remain:

> Evidence != Truth.
>
> Verification evidence != accepted completion.
>
> Test PASS != universal completion.

## Token/context benchmark

A deterministic benchmark for this workflow is available with:

```bash
npm run benchmark:verification-trace
```

It measures:

1. the representative raw trace input;
2. the full Livariant assessment;
3. a compact consumer projection that preserves target assessment states and evidence source references.

The benchmark uses `ceil(UTF-8 bytes / 4)` as a deterministic token proxy because Livariant does not install a provider tokenizer solely for this measurement.

It is **not** an exact provider-billing measurement, a universal token-savings claim, or a comparison against another product. Public efficiency claims should only use reproducible Livariant workloads and state the measurement method.

## Current v1 scope

This feature intentionally does not include:

- automatic requirement persistence;
- automatic task completion;
- Project Truth promotion;
- automatic arbitrary requirement discovery;
- independent trust in agent-supplied evidence;
- graph/index infrastructure;
- verification plugin/capability-pack execution;
- release authorization;
- broad provider/agent consumer migration.

The v1 goal is narrower: make unsupported or contradicted completion claims inspectable and useful now through both CLI and the local MCP agent bridge, while preserving clean seams for later capabilities.
