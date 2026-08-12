# Updates, Migrations & Recovery

Livariant handles updates, schema migrations, and recovery through the installed `livariant` CLI. The normal rule is simple: inspect first, then authorize a change explicitly.

## Plan an update

Use the release manifest that belongs to the Livariant release you obtained from the canonical GitHub repository:

```bash
livariant update --manifest ./release-manifest.json
```

The plan shows the source and target versions, release channel, source ID, artifact identity and SHA-256, project impact, and whether a migration or checkpoint is required.

Nothing is applied without `--apply`.

## Apply a reviewed update

After reviewing the plan, provide the matching artifact and explicitly name the release source you trust:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --apply \
  --artifact ./livariant-runtime.tgz \
  --trusted-source <source-id>
```

The manifest cannot make its own source trusted. `--trusted-source` is evaluated separately, and the artifact bytes still have to match the release identity and SHA-256 recorded in the manifest.

Executable updates have one more requirement. The exact artifact digest must already be authorized by an independent machine-local release policy outside the project. Project files, the release manifest, `--trusted-source`, and the project-facing Livariant CLI cannot create or change that authority.

If the exact digest is not authorized, Livariant stops before candidate Runtime code is installed or executed.

There is no project-facing `authorize-runtime` command. A project cannot promote its own bytes into execution authority.

The supported update order is:

```text
resolve target release
→ verify release identity and trusted source
→ verify artifact SHA-256
→ check compatibility and channel
→ require explicit --apply authorization
→ require pre-existing machine-local artifact authority
→ install the target Runtime without lifecycle scripts
→ write and verify release evidence
→ measure the installed Runtime tree
→ establish and recheck machine-local Runtime trust
→ execute candidate Runtime attestation
→ recheck lifecycle and preservation conditions
→ commit the canonical Project Brain framework pin
```

The Project Brain pin is the final activation decision. A newer Runtime being present on disk does not make it active.

## A framework update is not automatically a Project Brain migration

A release can update Livariant tooling without changing the Project Brain schema. If the schema changes, Livariant treats the operation as a migration and uses the stronger migration lifecycle.

The user still starts with the same command:

```bash
livariant update --manifest ./release-manifest.json
```

If the selected release changes the Project Brain schema, the migration appears in the plan and an authorized `--apply` is routed through the supported migration path automatically.

Do not treat `npm install`, copying a tarball, replacing `.project-brain/`, or manually editing `metadata.json` as a project migration.

## Supported migration path

The current executable Preview baseline proves one explicit schema migration path: Project Brain schema `1 → 2`.

The migration flow is:

```text
compatibility check
→ migration identity
→ authorization
→ integrity-bound checkpoint
→ durable migration journal
→ evidence for non-replay-safe work
→ mutation
→ validation
→ target activation
```

Unsupported or incomplete migration paths stop safely. Livariant does not guess how one schema should be transformed into another.

## If a migration is interrupted

An interruption after non-replay-safe work does not mean that nothing happened. Livariant keeps durable lifecycle evidence so the project does not appear fresh or healthy when the operation is actually incomplete.

While recovery is unresolved:

- normal update application is blocked;
- blind migration replay is blocked;
- `livariant status` reports recovery-required state;
- `livariant doctor` remains diagnostic and read-only.

## Inspect recovery first

Run:

```bash
livariant doctor
livariant recover
```

`livariant recover` reports the interrupted operation, migration identity, source and target release/schema information, checkpoint validity, and a supported recovery strategy when one exists.

If the checkpoint is missing, moved, modified, or otherwise ambiguous, automatic recovery remains unavailable.

## Apply recovery

When Livariant reports a valid checkpoint and a supported `rollback` strategy:

```bash
livariant recover --apply
```

Recovery is a separate authorized operation. Before rollback, Livariant verifies the migration journal, checkpoint location and identity, source release/schema metadata, and the digests of canonical Project Brain checkpoint files.

The restored Project Brain is committed before cleanup. Displaced recovery state is removed before the final valid checkpoint is deleted. If late cleanup fails, the restored Brain and valid checkpoint remain available instead of being destroyed.

Livariant never invents a recovery state when the evidence is incomplete.

## Retry behavior

A target Runtime installed during an interrupted attempt may be reused only when all bound release evidence still matches: version, channel, source ID, artifact ID, artifact digest, package identity, installed package-tree integrity, and machine-local Runtime trust.

A different artifact cannot take over an existing installation simply by claiming the same version number.

## Do not repair lifecycle state by hand

> [!CAUTION]
> Do not manually replace Project Brain files, Livariant-managed lifecycle state, Runtime trust records, or release-authorization records to finish or repair an update.

Manual replacement bypasses compatibility checks, authority, checkpoints, replay safety, integrity verification, and activation rules. If state is unclear, inspect the actual state with:

```bash
livariant doctor
livariant recover
```

## Public Preview distribution

The Public Preview distribution path is the canonical `Kryt3r/livariant` GitHub Release. The release bundle provides the Livariant package, `release-manifest.json`, and `SHA256SUMS` for the exact candidate.

Initial CLI installation is described in [Installation & First Project](installation.md). Executable project updates remain subject to the independent machine-local release-authority requirement described above. Publishing a release does not let project-controlled input create that authority.
