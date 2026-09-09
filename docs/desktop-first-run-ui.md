# Desktop first-run UI

Livariant Desktop now routes startup through the canonical first-run lifecycle before loading the normal application surface.

## Startup behavior

On a fresh installation, Desktop loads the canonical first-run snapshot from the bounded host/Core lifecycle bridge. When the snapshot is incomplete, onboarding replaces normal navigation. After completion, the normal Desktop modules are loaded.

The renderer does not own a second onboarding state machine. It renders the canonical lifecycle snapshot and submits bounded lifecycle intents only.

## Project understanding

When a user explicitly selects an existing local project folder, bundled Core performs the existing read-only project discovery and understanding review. The resulting canonical clarification questions are stored in `FirstRunOnboardingState`.

Answers remain candidate evidence. Skipped questions remain explicitly unknown; they do not receive inferred defaults.

Selecting a project folder does not infer that folder as the primary repository binding. Repository identity and local repository binding remain explicit source-setup decisions.

## Source setup

The UI supports exactly one primary repository plus additional repositories with mandatory purpose descriptions. Additional descriptions are context only and grant no Trust, Truth or Authority.

A local primary repository path must be entered explicitly before Project Sources & Review can become ready. This keeps project folder selection distinct from repository binding.

## Provider setup

The first-run provider step can inspect the existing Codex connector boundary, connect through automatic discovery, or use an explicitly entered local Codex executable path. A successful connection may then be recorded in onboarding. Users can also deliberately defer provider setup.

Connection remains separate from Capability, Role and Authority.

## Completion and revisit

The health step reports configured and incomplete areas without fabricating missing knowledge. Users may complete onboarding while gaps remain. The welcome page also exposes a conscious incomplete path that completes first-run without inventing project state.

Completed onboarding can be reopened from Settings. Revisit mode renders the same canonical lifecycle state and bounded actions.

## Boundaries

- onboarding state is not Project Truth;
- repository content and discovery output remain Evidence;
- skipped/unknown answers do not become defaults;
- the renderer does not mutate canonical state directly;
- no source observation is fabricated by onboarding;
- no Semantic Apply or project-owned file mutation is performed;
- no Self-Hosting mutation Authority is granted;
- no release, tag, package, Desktop Preview or updater publication is authorized.
