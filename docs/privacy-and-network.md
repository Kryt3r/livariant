# Privacy & Network Behavior

Livariant's Public Preview baseline is designed to remain useful as a local-first tool.

## No telemetry in the current Runtime

The current Livariant Runtime does not implement analytics, usage telemetry, crash reporting, advertising identifiers, account tracking, or automatic upload of Project Brain contents.

`status`, `doctor`, `init`, `resume`, and `recover` operate against local project state.

Provider-specific Resume handoff currently renders a local projection from canonical Project Brain state. The Livariant adapter itself does not transmit that context to Claude Code, Codex, or another remote service. What a separately operated provider/client does with user-supplied context is governed by that provider and is outside Livariant's current Runtime behavior.

## Update behavior

The current supported Preview update command consumes a release manifest and artifact supplied to the CLI as local paths:

```bash
livariant update --manifest ./release-manifest.json
```

Applying the update requires the local artifact and an explicitly selected trusted source identity:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --apply \
  --artifact ./livariant-runtime.tgz \
  --trusted-source <source-id>
```

The Runtime does not currently perform an automatic remote update check or silently download a release.

Installing the verified local Runtime artifact uses npm in a constrained local-install flow with lifecycle scripts, audit, and funding prompts disabled. The current packed Runtime declares no runtime dependencies, so the supported release artifact does not require dependency resolution to fetch additional Runtime packages.

## Project data

Project Brain may contain project identity, decisions, goals, knowledge, and unresolved unknowns. Treat it as project data.

Livariant must not ingest obvious secret files merely to enrich project knowledge. Existing `.env`-style secrets and unrelated private files are not canonical Project Brain input by default.

Users remain responsible for deciding what information they intentionally record in Project Brain files and what context they intentionally pass onward to an external AI provider.

## Future network features

A future automatic update service, hosted registry integration, telemetry feature, remote synchronization service, or cloud account would create new privacy and trust boundaries.

Such behavior must not be silently added under the current statement. Before it becomes a supported public feature, its data flow, default behavior, opt-in/opt-out semantics, retention implications, and security model must be documented and reviewed.

## Summary

For the current Public Preview baseline:

- local project operation does not require a Livariant cloud account;
- no Livariant telemetry is implemented;
- no automatic remote update check is implemented;
- Project Brain is not automatically uploaded by Livariant;
- external provider behavior remains separate from Livariant's own Runtime behavior.
