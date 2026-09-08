# First-run onboarding state

Livariant's Desktop first-run flow is product state, not installer state. The installer may launch the application, but onboarding progress belongs to Livariant and can be resumed or revisited later.

The canonical onboarding state reuses the existing project-understanding review questions and the project source registry instead of creating a second First Run or repository model.

## State model

The onboarding lifecycle is represented as:

`welcome -> project -> understanding -> sources -> providers -> health -> complete`

A UI may navigate between these steps without converting progress into Authority or Project Truth.

Project-understanding questions begin as `open`. A user may either answer them or mark them `skipped`. Skipping is explicit: it stores no inferred answer and does not turn the unknown into known project knowledge. A skipped question can be revisited later.

Partial setup is valid. Provider setup may be deferred and optional project-understanding questions may remain open or skipped. The health step is a read-only summary rather than an authorization gate.

## Project and source setup

Project identity/local root and repository identity are separate concepts. Repository setup delegates to the canonical project source registry:

- exactly one primary repository;
- zero or more additional repositories;
- every additional repository requires a non-empty purpose description;
- repository descriptions provide context only and grant no Trust or Authority;
- local checkout bindings remain distinct from remote repository identity.

GitHub authentication/OAuth and broad repository management are intentionally outside this state contract.

## Boundaries

The onboarding contract explicitly preserves these rules:

- unanswered question != default answer;
- skipped question != known fact;
- onboarding evidence != Project Truth;
- repository description != Authority;
- onboarding does not authorize mutation;
- onboarding does not modify project-owned files.

The future Desktop UI should render this state rather than reimplementing these semantics in the renderer.
