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
- project-local `CLAUDE.md` and `AGENTS.md` guidance files found by the bounded scoped-guidance traversal described below;
- common source/test directory presence;
- a bounded set of framework/tooling signals from declared `package.json` dependencies and scripts.

Each structured evidence item includes:

- a category;
- a value;
- a confidence state;
- provenance identifying the local source used for that conclusion.

For example, a declared `next` dependency can support a `strongly_inferred` Next.js stack signal, while the presence of `README.md` is a `confirmed` documentation fact.

## Existing-project adoption surface inventory

For existing-project onboarding, the structured discovery report also contains a bounded `adoption` inventory. It records the presence and provenance of selected project-local surfaces that may matter during later review, including:

- agent guidance such as `AGENTS.md` and `CLAUDE.md`;
- common project-rule files such as `CONTRIBUTING.md`, `DEVELOPMENT.md`, `GOVERNANCE.md`, `SECURITY.md` and `.github/CODEOWNERS`;
- common architecture and decision-record filenames at the project root plus supported documentation files directly inside `docs`;
- GitHub Actions workflow files and selected common CI entry points;
- common test directories;
- selected build/tooling manifests and configuration files.

The adoption inventory is **metadata/provenance evidence only**. It does not interpret the contents of those surfaces, grant Authority, or promote them to Project Truth. Its boundaries explicitly report `evidenceIsProjectTruth: false`, `contentsInterpreted: false`, `grantsAuthority: false` and `changesMade: 0`.

### Bounded scoped-guidance discovery

The inventory may discover nested `AGENTS.md` and `CLAUDE.md` files so later review can preserve their project-local scope. This is still not arbitrary repository indexing:

- only those exact guidance filenames are searched recursively;
- traversal is depth-bounded;
- traversal is directory-count-bounded;
- known heavy/generated locations such as `.git`, `.livariant`, `node_modules`, `vendor`, `dist`, `build`, `target` and `coverage` are excluded;
- symlinked guidance files are rejected rather than followed;
- hitting the traversal bound produces an attention signal instead of silently inferring that no further guidance exists.

When multiple project-local agent-guidance surfaces or multiple CI systems are present, Livariant surfaces a review attention signal instead of assuming precedence, equivalence, or which system is authoritative.

Unsafe candidate paths are not interpreted as adoption evidence. A candidate path that is not the expected regular non-symlink file or directory is surfaced for review instead of being followed or trusted.

## Explicit adoption content review

Discovery itself remains content-free for adoption surfaces. A separate explicit review step can read selected inventoried text surfaces through `reviewAdoptionSurfaces(...)`.

That review layer is deliberately narrower than “read everything”:

- only paths explicitly selected by the caller are considered;
- a selected path must already exist in the adoption inventory;
- only supported text-file surface kinds are read;
- path containment is revalidated against the project root;
- regular non-symlink files are required;
- per-surface, total-byte and surface-count limits bound the review;
- truncated content is reported visibly and omitted bytes are not inferred;
- nested guidance carries an explicit directory scope;
- overlapping guidance is surfaced as unresolved review attention rather than being automatically ordered or reconciled.

Reviewed text remains **observed Evidence**. The review result explicitly reports `evidenceIsProjectTruth: false`, `contentReviewIsAcceptance: false`, `grantsAuthority: false`, `automaticConflictResolution: false` and `changesMade: 0`.

Reading a file therefore does not adopt it, make it canonical, choose precedence, resolve contradiction, or grant mutation Authority.

## Evidence is not Project Truth

Discovery output and explicit content review are observation only.

They are not automatically accepted into the Project Brain, and evidence does not become authority because it came from a repository file. Existing documentation and provider-specific instruction files remain external project evidence until a supported acceptance path establishes durable Project Brain truth.

## Attention signals

Discovery and adoption review may surface bounded review signals when local evidence is ambiguous or deserves attention. Current examples include:

- multiple Node package-manager lockfiles;
- multiple project-local agent-guidance surfaces without an assumed precedence;
- multiple CI systems without an assumed authoritative system;
- unreadable or unsafe high-signal manifest/guidance/adoption paths;
- scoped-guidance traversal limits;
- overlapping reviewed guidance without automatic precedence or conflict resolution;
- truncated review content due to explicit byte budgets;
- presence of common sensitive-file names such as `.env`, `.env.local`, or `credentials.json`.

Sensitive-file handling is deliberately presence-only. Livariant does not read or classify the contents of those files during Bootstrap Discovery.

These signals are not a complete security audit and should not be presented as one.

## Structured output

`livariant discover --json` returns the same bounded discovery result as structured JSON, including evidence, adoption surfaces, attention signals, unresolved high-level unknowns and:

```json
{
  "changesMade": 0
}
```

This output is designed to support later guided onboarding and evidence-adoption workflows without turning discovery itself into a mutation path.

## Relationship to `livariant init`

`livariant init` remains plan-first and read-only by default. The current lifecycle flow separates review, authorization, and mutation:

```text
livariant init
→ livariant init --authorize
→ livariant init --apply
```

The first command exposes the initialization assessment and the same read-only Bootstrap Discovery report. `--authorize` requests short-lived, exact-material-bound protected Guardian Lifecycle Authority and still makes no project mutation. `--apply` can initialize only when the same current plan has matching unconsumed Authority.

A bare `--apply` flag is not authorization, and changing project material between authorization and application invalidates the match. Discovery therefore remains observation only; it does not itself grant initialization, lifecycle, Runtime, recovery, or Project Brain mutation Authority.
