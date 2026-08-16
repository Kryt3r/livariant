# Guided Project Understanding Review

> Repository capability after immutable `v0.1.0-rc.3`. This page describes current canonical repository behavior once the implementing change is merged; it is not a claim about the published RC3 release.

Livariant can turn Bootstrap Discovery evidence into a compact review-oriented project-understanding projection with:

```text
livariant understand
livariant understand --json
livariant understand --input review.json
livariant understand --input review.json --json
```

The command is read-only. It does not create or modify Project Brain state, project files, provider configuration, lifecycle state, authorization state, or release/runtime trust.

## What the review shows

The review composes directly from the bounded Bootstrap Discovery result. It separates:

- confirmed evidence;
- strongly inferred evidence;
- uncertain evidence;
- attention signals;
- genuine unknowns represented as clarification questions.

Material evidence retains its discovery provenance and confidence. The review does not re-scan the repository through a parallel subsystem.

## Clarification questions

Questions are generated only from unknowns that Bootstrap Discovery already exposes. Examples include project purpose, current product direction, or non-negotiable project rules.

A question is not a demand to fully specify the project. It is a bounded opportunity to improve Livariant's understanding where current repository evidence is insufficient.

## Optional review input

A user may supply a small JSON review file:

```json
{
  "schemaVersion": 1,
  "responses": [
    {
      "questionId": "unknown:project-purpose",
      "statement": "A browser game with persistent progression."
    }
  ],
  "corrections": [
    {
      "target": "stack:React",
      "statement": "React is present only in tooling and is not the product UI."
    }
  ]
}
```

Review input is bounded and fail-closed. The file must be a regular non-symlink file, is size-limited, uses a strict top-level schema, and unknown question identifiers are rejected.

## Candidate evidence is not Project Truth

User responses and corrections are returned as explicitly labelled `candidate-evidence`.

They are not automatically accepted into Project Brain truth, do not grant Authority, and do not authorize a later mutation merely because a user supplied them to this command.

The structured result states this boundary explicitly:

```json
{
  "boundaries": {
    "evidenceIsProjectTruth": false,
    "candidateEvidenceIsProjectTruth": false,
    "grantsAuthority": false,
    "changesMade": 0
  }
}
```

Controlled adoption of reviewed understanding into durable Project Brain truth is a separate future capability and is intentionally outside this review surface.

## Relationship to Bootstrap Discovery

The intended progression is:

```text
repository
-> Bootstrap Discovery
-> evidence + provenance + confidence
-> Guided Understanding Review
-> clarification/correction candidate evidence
-> no canonical mutation
```

This makes project understanding visible and reviewable without weakening Livariant's distinction between observation, inference, reviewed candidate evidence, accepted truth, and mutation Authority.
