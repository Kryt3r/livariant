# Privacy & Network Behavior

The current Livariant Preview candidate is designed for local project use. This page explains what Livariant itself sends over the network, what stays local, and where external AI providers are a separate concern.

## No Livariant telemetry in the current Runtime

The current Runtime does not implement:

- analytics or usage telemetry;
- crash reporting;
- advertising identifiers;
- Livariant account tracking;
- automatic upload of Project Brain contents.

`status`, `doctor`, `init`, `resume`, and `recover` operate on local project state.

Provider-specific Resume handoff is also rendered locally by Livariant. The Livariant adapter does not send the generated context to Claude Code, Codex, or another remote service by itself.

If you then give that context to an external AI provider, the provider's own application, account, privacy settings, and terms determine what happens to it. That behavior is separate from Livariant's Runtime.

## Update behavior

The current supported update flow reads a release manifest and artifact from paths you provide to the CLI.

Planning example:

```bash
livariant update --manifest ./release-manifest.json
```

Applying a reviewed update requires the local artifact and an explicitly selected trusted source identity:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --apply \
  --artifact ./livariant-runtime.tgz \
  --trusted-source <source-id>
```

For executable updates, the exact artifact SHA-256 must also already have independent machine-local release authorization outside project authority.

The manifest, `--trusted-source`, project files, and Livariant's project-facing CLI or API cannot create that authority. If it is missing, the update stops before npm installation or candidate Runtime attestation. Livariant exposes no project-facing `authorize-runtime` command.

The current Runtime does not perform an automatic remote update check and does not silently download releases.

When Livariant installs an independently authorized and verified local Runtime artifact, npm is used in a constrained local-install flow with lifecycle scripts, audit, and funding prompts disabled. The current packed Runtime has no runtime dependencies, so the supported release artifact does not need dependency resolution to fetch additional Runtime packages.

Machine-local Runtime trust and release-authorization records are security state outside project authority. They are not Project Brain data and should not be treated as repository-controlled configuration.

## Treat Project Brain as project data

Project Brain can contain project identity, decisions, goals, knowledge, and unresolved questions. Treat those files with the same care you give other project data.

Livariant does not need to ingest obvious secret files just to make the Project Brain richer. `.env`-style secrets and unrelated private files are not canonical Project Brain input by default.

You remain responsible for deciding what information you deliberately record in Project Brain files and what context you later pass to an external AI provider.

## Future network features would need a new review

Features such as automatic update services, hosted registry integration, telemetry, remote synchronization, or a Livariant cloud account would create new privacy and trust boundaries.

Those features are not covered by this statement simply because they might exist in a future version. Before any such feature becomes supported, its data flow, defaults, user controls, retention implications, and security model must be documented and reviewed.

## Current privacy summary

For the current Preview candidate:

- normal local project operation does not require a Livariant cloud account;
- Livariant telemetry is not implemented;
- automatic remote update checks are not implemented;
- Project Brain is not automatically uploaded by Livariant;
- provider Resume output is generated locally;
- executable updates require pre-existing independent machine-local exact-artifact release authority;
- project input cannot create that authority through Livariant's project-facing CLI or API;
- external AI-provider behavior remains separate from Livariant's own Runtime behavior.
