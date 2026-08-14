# Conflict and Drift Assessment

This is post-RC3 repository development. `v0.1.0-rc.3` does not contain it.

Livariant compares one explicit observation with the current Project Brain baseline without changing project state.

```text
livariant drift --input <observation.json>
livariant drift --input <observation.json> --json
```

Runtime API: `buildConflictDriftAssessment()`.

Supported domains are `project-decision`, `project-goal`, and `project-knowledge`. Supported evidence classes are `dependent-current`, `historical`, and `provider-observation`.

Current diagnoses are `consistent`, `confirmed-drift`, `historical-match`, `authority-ambiguous`, and `insufficient-evidence`. Different text alone is not proof of drift.

For a valid schema-2 Project Brain, the assessment carries the same canonical logical `stableProjectIdentity` captured from the managed `metadata.json` state that contributes to the material baseline. Historical schema-1 Project Brains expose `stableProjectIdentity: null` until explicit migration.

The stable identity is material to the derived assessment envelope and identifies the logical Project Brain lineage. It does not establish user approval, unique checkout identity, anti-replay freshness, or mutation authority. Copied Project Brain bytes can legitimately retain the same ID.

The assessment remains read-only derived review data and exposes:

```text
reviewOnly: true
mutationAuthorization: false
applySupported: false
authorizationEligible: false
changesMade: 0
```

Concurrent Project Brain changes prevent a normal successful result, so the assessment cannot mix a stable identity from one managed state with a baseline from another.

See [Stable Project Identity Foundation](stable-project-identity-foundation.md).
