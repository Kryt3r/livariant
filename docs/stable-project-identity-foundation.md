# Stable Project Identity Foundation

Stable Project Identity is a post-RC3 Project Brain foundation for identifying one logical Project Brain lineage without pretending to identify one physical checkout, machine, or user session.

This capability is repository development after the immutable `v0.1.0-rc.3` Foundation Preview release.

## Persisted model

Current repository development advances the Project Brain schema from version `1` to version `2`.

A valid schema-2 `.project-brain/metadata.json` contains one required canonical UUID:

```json
{
  "projectBrain": {
    "schemaVersion": 2,
    "projectId": "<canonical-lowercase-uuid>"
  }
}
```

Runtime projections expose this value as `stableProjectIdentity`.

The identifier is project-owned canonical metadata. It is generated locally with trusted runtime randomness and is not derived from the project path, package name, Git remote, provider output, project contents, timestamp alone, machine name, username, or material baseline digest.

Two independent fresh Project Brain initializations therefore receive different logical identities even when their project contents are otherwise identical.

## Fresh initialization

A fresh Project Brain initialized by the schema-2 Runtime receives one identity during the explicit initialization mutation.

Read operations do not mint, replace, repair, or rotate identity.

A schema-2 Project Brain with a missing or malformed `projectId` fails closed as damaged state. Livariant does not silently create a replacement identity while reading status, context, proposals, drift evidence, or provider context.

## Existing schema-1 projects

Schema 1 remains the historical pre-identity Project Brain shape.

A schema-1 project can still be read without an invented stable identity. Structured read surfaces report:

```text
stableProjectIdentity: null
```

until the project is explicitly migrated through the supported lifecycle path.

The existing schema `1 -> 2` migration path creates the logical project ID inside the established checkpoint, journal, validation, activation, rollback, and recovery transaction. A failed migration rolls back to the verified schema-1 checkpoint rather than leaving a newly minted identity authoritative.

An interrupted migration remains recovery-required. Tentative schema-2 bytes do not by themselves establish a clean completed migration.

## Copy, move, and clone semantics

The ID identifies a logical Project Brain lineage, not a unique filesystem instance.

Therefore:

- moving or renaming a project directory does not rotate the ID;
- changing a Git remote does not rotate the ID automatically;
- a byte-for-byte copy of an initialized Project Brain retains the same ID;
- two physical checkouts can legitimately expose the same `stableProjectIdentity`.

Livariant deliberately does not claim that project-owned bytes can prove which machine or checkout they came from.

Fork, split, merge, or identity-replacement semantics are not implemented by this foundation and require a separate reviewed lifecycle contract.

## Read-side projection

For a valid schema-2 Project Brain, the same stable logical identity is projected through the current coherent Active Project Intelligence read surfaces:

- Project Context Snapshot;
- Semantic Proposal Core;
- Conflict and Drift Assessment;
- Provider Context Foundation.

The identity is captured from the same managed `metadata.json` state used by the material Project Brain baseline. Existing concurrent-change revalidation still applies: if managed state changes while a result is being constructed, the operation fails closed instead of mixing identities or baselines from different states.

For Semantic Proposals and Drift Assessments, the stable project identity is part of the derived material result. It does not make the result executable or trusted as authority.

## Authority boundary

`projectId` is not a secret and is not an authorization primitive.

A repository can read or copy its own ID, and copied Project Brain bytes intentionally preserve it. Therefore identity equality alone proves none of the following:

- user approval;
- mutation authorization;
- anti-replay freshness;
- unique checkout identity;
- machine-local trust;
- checkpoint integrity;
- Runtime or release integrity;
- provider-returned packet trust.

The current proposal/provider surfaces remain structurally non-authorizing:

```text
mutationAuthorization: false
applySupported: false
authorizationEligible: false
changesMade: 0
```

Future proposal-bound authorization, if implemented, must use a separately reviewed trusted authorization event/channel and bind additional material such as exact proposal, scope, baseline, project identity, and whatever anti-replay evidence that later contract requires.

## Returned and copied projections

A snapshot, proposal, assessment, or provider packet containing a stable project ID remains derived output.

Copying that output, receiving it back from a provider, or presenting an equal ID later does not promote the packet to canonical Project Brain truth. Material actions must re-read and revalidate current canonical state.

## Release boundary

This capability is not retroactively part of `v0.1.0-rc.3`.

RC3 remains immutable historical release evidence. A future distributed release containing schema-2 stable project identity requires its own separately approved release process.
