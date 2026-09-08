# Project Source Center presentation

The Project Source Center is a Desktop-facing read-only presentation seam for configured project repositories and canonical adoption-review lifecycle data.

It does not discover repositories, decide Project Truth, grant Authority or mutate project-owned files. It presents already-configured source-registry state and optional explicit source observations.

## Source model

A project contains exactly one primary repository plus zero or more additional repositories. Additional repository descriptions remain semantic context only.

The presentation exposes, where evidence exists:

- primary/additional role;
- repository identity and optional remote URL;
- mandatory description for additional repositories;
- optional local checkout binding;
- reachability;
- branch/revision identity;
- observation timestamp;
- stale/unavailable attention.

When no observation exists, reachability is `unknown` and branch/revision/timestamp remain absent. The presentation must not invent a healthy or current state.

Duplicate observations and observations for unconfigured repositories fail closed.

## Review integration

The source-center presentation may compose the existing canonical `AdoptionDesktopPresentation`. That preserves the already-qualified Existing-Project-Adoption lifecycle for findings, evidence, explicit decisions, proposal state, authorization state, apply state and stale/replaced material.

The Project Source Center is not a second adoption engine and does not reinterpret those lifecycle states.

## Boundaries

- repository description != Project Truth;
- repository description != Authority;
- source observation != Project Truth;
- source observation != Authority;
- Desktop review presentation != Authority;
- no hidden conflict resolution;
- no project mutation.
