# Evidence-backed Project Findings

`livariant findings` is a read-only project inspection surface for a small set of deterministic, high-signal security and quality concerns.

It is designed to answer five practical questions:

1. What looks risky or broken?
2. Why did Livariant flag it?
3. What exact local evidence supports the finding?
4. How severe and how confident is the classification?
5. What should be inspected next?

## Run the inspection

```bash
livariant findings
livariant findings --json
```

The command never applies a fix and ends human-readable output with:

```text
Changes made: 0
```

## Finding model

Each v1 finding contains:

- a stable finding identity and rule ID;
- category: `security` or `quality`;
- severity: `critical`, `high`, `medium`, or `low`;
- confidence: `strong` or `moderate`;
- a short title and understandable explanation;
- exact project-local evidence references;
- a suggested next inspection or remediation direction.

The JSON form is deterministic and intended for agents and automation that need the same evidence without parsing prose.

## Initial deterministic rules

The deliberately small v1 rule set focuses on high-signal conditions, including:

- `package.json` that is not a regular project-local file;
- malformed or unusually large package manifests that cannot be safely inspected;
- multiple Node package-manager lockfiles;
- a Node project without a supported lockfile;
- package scripts that deterministically download content and execute it immediately through a shell or PowerShell expression evaluator;
- commonly sensitive root files in a Git workspace when no regular project-root `.gitignore` guard is visible;
- differing `CLAUDE.md` and `AGENTS.md` instruction bytes, surfaced as a review concern rather than assumed conflict.

Sensitive file contents are not read by the sensitive-root-file rule. Native agent instruction evidence is represented by hashes rather than copying the file contents into the report.

## Bounded inspection

v1 intentionally avoids recursive repository-wide scanning.

It inspects a small number of known root-level project signals. `package.json` and native agent guidance files have explicit size ceilings and symlinks or unsupported file types are not followed as trusted local evidence.

This keeps the first findings layer predictable and reduces both resource abuse and noisy low-confidence results.

## Confidence is not severity

Severity describes the possible impact of the condition.

Confidence describes how directly the local evidence supports Livariant's interpretation.

For example, a sensitive `.env` file with no visible root `.gitignore` is a serious hygiene concern, but it does not prove that the file was committed or exposed. That rule is therefore high severity with moderate confidence.

## Authority boundary

**Finding != Truth != Authority.**

A finding is structured evidence plus a deterministic interpretation. It does not become Project Truth automatically and cannot authorize a mutation, Runtime trust, release approval, tagging, package publication, or any other hard Livariant Authority.

A clean report is also not a security guarantee. v1 is deliberately not a complete SAST, dependency, fuzzing, or independent audit system.

Fixes, if desired, remain separate explicit work and must pass the normal Livariant authorization boundaries.
