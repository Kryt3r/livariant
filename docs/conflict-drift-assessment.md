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

The assessment is read-only derived review data. It has `changesMade: 0` and does not apply changes. Concurrent Project Brain changes prevent a normal successful result.
