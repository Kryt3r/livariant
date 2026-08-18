# Updates, Migrations & Recovery

Livariant handles updates, schema migrations, and recovery through the installed `livariant` CLI. Consequential lifecycle changes are plan-first and require independent protected Guardian Authority.

`--apply` expresses intent to execute an already reviewed lifecycle operation. It is **not** lifecycle Authority by itself.

## The lifecycle authorization flow

For initialization, updates/migrations, and recovery, use three separate phases:

```text
plan / inspect
→ --authorize
→ --apply
```

`--authorize` and `--apply` cannot be combined in one invocation.

`--authorize` asks the OS-protected Livariant Guardian to issue a short-lived, one-shot Authority record bound to the exact physical project, lifecycle operation, and current operation material. Guardian issuance requires independent local user presence through the protected elevation boundary.

`--apply` then requires and consumes the matching record before the consequential mutation path can proceed. Missing, expired, consumed, cross-project, cross-operation, or stale material fails closed.

Release authorization and Runtime trust remain separate prerequisites. Trusting an artifact never means that the project lifecycle mutation itself has been authorized.

## Initialization

Inspect the current initialization plan first:

```bash
livariant init
```

Request exact lifecycle Authority only after reviewing that plan:

```bash
livariant init --authorize
```

Then apply the unchanged plan while the one-shot Authority remains valid:

```bash
livariant init --apply
```

If the project state changes between authorization and apply, the material no longer matches and Livariant stops instead of reusing stale Authority.

## Plan an update

Use the release manifest that belongs to the Livariant release you obtained from the canonical GitHub repository:

```bash
livariant update --manifest ./release-manifest.json
```

The plan shows the source and target versions, release channel, source ID, artifact identity and SHA-256, project impact, and whether a migration or checkpoint is required. No changes are applied during planning.

## Authorize a reviewed update

After reviewing the exact update plan, request protected lifecycle Authority with the same manifest:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --authorize
```

This creates no lifecycle mutation. The Guardian review binds the exact normal-update or migration-update material for this physical project.

## Apply the authorized update

Then provide the matching artifact and explicitly name the release source you trust:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --apply \
  --artifact ./livariant-runtime.tgz \
  --trusted-source <source-id>
```

The manifest cannot make its own source trusted. `--trusted-source` is evaluated separately, and the artifact bytes still have to match the release identity and SHA-256 recorded in the manifest.

Executable updates also require the existing protected release/Runtime trust boundaries. Project files, the release manifest, `--trusted-source`, lifecycle Authority, and the project-facing CLI cannot make arbitrary candidate Runtime bytes trusted.

The supported normal-update order is conceptually:

```text
resolve and review target release
→ issue exact protected lifecycle Authority
→ re-resolve the same plan
→ consume exact lifecycle Authority
→ verify release identity and trusted source
→ verify artifact SHA-256 and protected release/Runtime trust
→ install the target Runtime without lifecycle scripts
→ write and verify release evidence
→ measure the installed Runtime tree
→ execute candidate Runtime attestation only after trust
→ recheck lifecycle and preservation conditions
→ commit the canonical Project Brain framework pin
```

The Project Brain pin is the final activation decision. A newer Runtime being present on disk does not make it active.

## A framework update is not automatically a Project Brain migration

A release can update Livariant tooling without changing the Project Brain schema. If the schema changes, Livariant treats the operation as a migration and domain-separates its lifecycle Authority as `migration-update` rather than `normal-update`.

The user still starts with the same plan command:

```bash
livariant update --manifest ./release-manifest.json
```

Unsupported or incomplete migration paths stop safely. Livariant does not guess how one schema should be transformed into another.

The current executable Preview baseline proves one explicit schema migration path: Project Brain schema `1 → 2`.

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

## Authorize and apply recovery

When Livariant reports a valid checkpoint and a supported rollback strategy, request exact recovery Authority first:

```bash
livariant recover --authorize
```

Then apply the same recovery material:

```bash
livariant recover --apply
```

Recovery Authority is bound to the physical project, interrupted operation, recovery strategy, checkpoint identity, and expected source release/schema material. A recovery record cannot authorize initialization or an update, and an Authority record for another project cannot be reused.

Before rollback, Livariant still verifies the migration journal, checkpoint location and identity, source release/schema metadata, and canonical Project Brain checkpoint digests.

The restored Project Brain is committed before cleanup. If late cleanup fails, recoverable evidence is retained instead of guessing through an ambiguous state.

## Retry behavior

One-shot lifecycle Authority is non-reusable after protected consumption. If an operation fails before completion, Livariant still requires its existing operation-specific recovery and freshness rules; Authority for different material cannot be redirected to the failed operation.

A target Runtime installed during an interrupted attempt may be reused only when all bound release evidence still matches: version, channel, source ID, artifact ID, artifact digest, package identity, installed package-tree integrity, and protected Runtime trust.

## Do not repair lifecycle state by hand

> [!CAUTION]
> Do not manually replace Project Brain files, Livariant-managed lifecycle state, Guardian records, Runtime trust records, or release-authorization records to finish or repair an update.

Manual replacement bypasses compatibility checks, Authority, checkpoints, replay safety, integrity verification, and activation rules. If state is unclear, inspect the actual state with:

```bash
livariant doctor
livariant recover
```

## Public Preview distribution

The Public Preview distribution path is the canonical `Kryt3r/livariant` GitHub Release. The release bundle provides the Livariant package, `release-manifest.json`, and `SHA256SUMS` for the exact candidate.

Initial CLI installation is described in [Installation & First Project](installation.md). Publishing a release does not let project-controlled input create lifecycle, release, or Runtime Authority.
