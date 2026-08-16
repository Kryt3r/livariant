# Read-Only Bootstrap Discovery

> Repository capability after immutable `v0.1.0-rc.3`. This page describes current canonical repository behavior, not the contents of the published RC3 release.

Livariant can inspect a project before initialization with:

```text
livariant discover
livariant discover --json
```

The command is read-only. It does not create Project Brain files, modify project files, execute provider commands, install dependencies, contact a Livariant cloud service, or grant mutation authority.

## What v1 inspects

Bootstrap Discovery intentionally uses a bounded set of high-signal local evidence instead of recursively indexing the repository.

Current evidence may include:

- Git metadata presence;
- common project/build manifests such as `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, Maven/Gradle files and TypeScript configuration;
- common Node package-manager lockfiles;
- README and a top-level `docs` directory;
- top-level `CLAUDE.md` and `AGENTS.md` guidance files;
- common source/test directory presence;
- a bounded set of framework/tooling signals from declared `package.json` dependencies and scripts.

Each structured evidence item includes:

- a category;
- a value;
- a confidence state;
- provenance identifying the local source used for that conclusion.

For example, a declared `next` dependency can support a `strongly_inferred` Next.js stack signal, while the presence of `README.md` is a `confirmed` documentation fact.

## Evidence is not Project Truth

Discovery output is observation and inference only.

It is not automatically accepted into the Project Brain, and it does not become authority because it came from a repository file. Existing documentation and provider-specific instruction files remain external project evidence until a supported acceptance path establishes durable Project Brain truth.

## Attention signals

Discovery may surface bounded review signals when local evidence is ambiguous or deserves attention. Current examples include:

- multiple Node package-manager lockfiles;
- unreadable or unsafe high-signal manifest/guidance paths;
- presence of common sensitive-file names such as `.env`, `.env.local`, or `credentials.json`.

Sensitive-file handling is deliberately presence-only. Livariant does not read or classify the contents of those files during Bootstrap Discovery.

These signals are not a complete security audit and should not be presented as one.

## Structured output

`livariant discover --json` returns the same bounded discovery result as structured JSON, including evidence, attention signals, unresolved high-level unknowns and:

```json
{
  "changesMade": 0
}
```

This output is designed to support later guided onboarding and evidence-adoption workflows without turning discovery itself into a mutation path.

## Relationship to `livariant init`

`livariant init` continues to be plan-first and read-only without `--apply`.

The initialization assessment exposes the same read-only Bootstrap Discovery report, but WP-014 deliberately does not change which unknowns are written during an explicitly authorized bootstrap. Discovery therefore adds observation without changing initialization, lifecycle, Authority, Runtime-trust, recovery or Project Brain mutation semantics.
