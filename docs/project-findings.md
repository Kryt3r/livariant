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

- a stable material-bound finding identity and rule ID;
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
- declared installable Node dependencies without a supported lockfile;
- package scripts that deterministically download content and execute it immediately through a shell or PowerShell expression evaluator;
- commonly sensitive root paths that are symlinks or other unsupported file types, reported without following or reading them;
- commonly sensitive regular root files in a real local Git workspace when Livariant cannot confirm an effective simple exact root-level `.gitignore` rule for the reported file;
- differing `CLAUDE.md` and `AGENTS.md` instruction bytes, surfaced as a review concern rather than assumed conflict.

A package manifest that declares no installable dependencies does not receive the missing-lockfile finding merely because `package.json` exists.

Sensitive file contents are not read by the sensitive-root-file rules. v1 deliberately recognizes only simple exact root-level ignore and negation entries such as `.env`, `/.env`, or `!.env`, processed in order; it does not pretend to implement the complete gitignore pattern language. Native agent instruction evidence is represented by hashes rather than copying the file contents into the report.

## Bounded inspection

v1 intentionally avoids recursive repository-wide scanning.

It inspects a small number of known root-level project signals. `package.json`, `.gitignore`, and native agent guidance files have explicit size ceilings and symlinks or unsupported file types are not followed as trusted local evidence. The sensitive-file rules are enabled only when `.git` is a regular local directory rather than an arbitrary file or symlink.

This keeps the first findings layer predictable and reduces both resource abuse and noisy low-confidence results.

## Confidence is not severity

Severity describes the possible impact of the condition.

Confidence describes how directly the local evidence supports Livariant's interpretation.

For example, a sensitive `.env` file without a confirmed effective simple exact root-level ignore entry is a serious hygiene concern, but it does not prove that the file was committed or exposed. That rule is therefore high severity with moderate confidence.

## Authority boundary

**Finding != Truth != Authority.**

A finding is structured evidence plus a deterministic interpretation. It does not become Project Truth automatically and cannot authorize a mutation, Runtime trust, release approval, tagging, package publication, or any other hard Livariant Authority.

A clean report is also not a security guarantee. v1 is deliberately not a complete SAST, dependency, fuzzing, or independent audit system.

Fixes, if desired, remain separate explicit work and must pass the normal Livariant authorization boundaries.
