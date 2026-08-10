# Provider Handoff

The Public Preview provider surface is intentionally narrow: it supports **Project Brain Resume handoff** for Claude Code and Codex. It does not claim full control of either provider's complete tool or agent surface.

## What is transferred

Livariant does not transfer hidden provider session memory. Instead, each provider independently consumes a Resume context derived from canonical Project Brain state.

Conceptually:

```text
Project Brain
→ canonical ResumeContext
   ├─ Claude Code projection
   └─ Codex projection
```

The representation can differ. The canonical semantics must not.

## Explicit environment evidence

The CLI requires explicit current provider-environment evidence:

```bash
LIVARIANT_PROVIDER_ENV=claude-code livariant resume --provider claude-code
LIVARIANT_PROVIDER_ENV=codex livariant resume --provider codex
```

A provider-targeted handoff without matching evidence fails closed rather than pretending compatibility.

Explicit selection establishes current applicability evidence for the supported Resume capability. It does not create mutation authority.

The bundled Preview adapter identities are:

```text
livariant.claude-code.resume
livariant.codex.resume
```

## Handoff example

A supported transition looks like this:

1. Claude Code works against the project and accepted project truth is persisted in Project Brain.
2. The Claude session ends.
3. No Claude hidden-memory state is copied to Codex.
4. Codex starts separately against the same project directory.
5. Codex requests its provider-specific Resume projection from the canonical Brain.
6. Codex reconstructs the active decisions, known facts, goals, unknowns, and lifecycle context from that canonical state.

The executable hardening suite tests this in isolated processes with different provider-local hidden-memory values.

## Native provider instruction files

`CLAUDE.md` and `AGENTS.md` are not the Project Brain. Existing files remain human/project-owned and are not overwritten by the current Resume adapters.

Contradictory text in those files does not replace canonical Project Brain truth in the supported Resume path.

This does **not** mean future native-instruction integration is automatically safe. If a future adapter begins generating or reconciling those files, that new mutation surface requires separate authorization, preservation, conformance, and adversarial tests.

## Stale context

Resume output is derived. It has no write-back authority merely because a provider previously received it.

If canonical Project Brain decisions change later — including explicit supersession — a stale older Resume projection cannot promote its old state back into truth. New Resume output is derived from the current canonical state.
