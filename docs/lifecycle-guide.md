# Updates, Migrations & Recovery

Livariant exposes the hardened lifecycle through the installed `livariant` CLI. The safe path is plan-first: inspection and planning are read-only; mutation requires explicit `--apply` authorization.

## Plan an update

Use a release manifest obtained through the chosen trusted Preview distribution path:

```bash
livariant update --manifest ./release-manifest.json
```

The plan reports:

- source and target versions,
- update channel,
- release source ID,
- artifact identity and SHA-256,
- whether migration is required,
- project impact,
- checkpoint requirement,
- authorization requirement.

No update is applied without `--apply`.

## Apply a reviewed update

Provide the exact artifact identified by the plan and explicitly identify the release source you trust:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --apply \
  --artifact ./livariant-runtime.tgz \
  --trusted-source <source-id>
```

The release manifest does **not** self-authorize its own source ID. The explicitly supplied trusted-source set is evaluated separately, and the artifact still has to match the manifest-bound release identity and SHA-256.

The safe normal-update order is:

```text
resolve target release
→ verify release identity and trusted-source relationship
→ verify artifact SHA-256
→ check compatibility and channel
→ require explicit authorization
→ install target Runtime without lifecycle scripts
→ attest installed package identity/version
→ verify installed Runtime tree integrity
→ recheck preservation/lifecycle conditions
→ commit the canonical Project Brain framework pin
```

The Project Brain pin is the final activation decision. Merely placing a newer Runtime on disk does not make it active.

## Framework update is not Project Brain migration

A release can update Livariant tooling without changing the Project Brain schema. A schema-changing release is a migration and uses a stronger lifecycle path.

The user still runs the same command:

```bash
livariant update --manifest ./release-manifest.json
```

If the selected compatible release changes Project Brain schema, Livariant reports the migration in the plan and routes an authorized `--apply` through the explicit migration contract. There is intentionally no normal-path command that encourages users to bypass update compatibility by manually invoking a transformation.

Do not treat `npm install`, copying a tarball, replacing `.project-brain/`, or manually changing `metadata.json` as a supported project migration.

## Migration path

The current executable Preview baseline proves one explicit schema migration path: Project Brain schema `1 → 2`.

The migration flow includes:

```text
compatibility check
→ explicit migration identity
→ authorization
→ integrity-bound checkpoint
→ durable migration journal
→ non-replay-safe step evidence
→ mutation
→ validation
→ target activation
```

Unsupported or incomplete migration paths fail closed. Livariant must not guess a transformation merely because source and target schemas differ.

## Interrupted migration

An interruption after a non-replay-safe mutation is not equivalent to “nothing happened.” Durable lifecycle evidence records the ambiguous/in-progress state.

While recovery is unresolved:

- normal update planning/application is blocked,
- blind migration replay is blocked,
- `livariant status` narrows to recovery-required,
- `livariant doctor` remains diagnostic rather than repairing automatically.

## Inspect recovery

Start read-only:

```bash
livariant doctor
livariant recover
```

`livariant recover` reports the interrupted operation, migration identity, source/target release and schema, checkpoint validity, and the supported recovery strategy when one is available.

If the checkpoint is missing, moved, tampered, or otherwise ambiguous, automatic recovery remains unavailable.

## Apply recovery

When `livariant recover` reports a valid checkpoint and `rollback` strategy:

```bash
livariant recover --apply
```

Recovery is a separate, explicitly authorized lifecycle operation. Before rollback, Livariant validates:

- the migration journal,
- checkpoint location and expected identity,
- source release/schema metadata,
- digests of canonical Project Brain checkpoint files.

A missing, moved, tampered, or ambiguous checkpoint does not trigger a guessed restore.

## Retry semantics

A target Runtime installed during an interrupted attempt may be reused only when its bound release evidence matches exactly: version, channel, source ID, artifact ID, artifact digest, package identity, and installed package-tree integrity.

A different artifact cannot take over an existing installation merely by claiming the same version.

## Manual replacement warning

> **Do not manually replace Project Brain or Livariant-managed lifecycle state to complete, repair, or shortcut an update.**

Doing so bypasses compatibility, authority, checkpoints, replay safety, integrity verification, and activation semantics. If a lifecycle operation is interrupted or state is unclear, diagnose the actual state first with `livariant doctor` and `livariant recover`.

## Current Preview distribution boundary

The CLI lifecycle surface is executable. Public Preview distribution still needs one finalized public source from which users obtain the Livariant package, release manifest, and matching runtime artifact. Until that source is published, examples use local manifest/artifact paths rather than inventing a registry or download endpoint.
