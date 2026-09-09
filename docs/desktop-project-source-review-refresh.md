# Desktop Project Source & Review refresh

The Desktop Project Sources & Review screen refreshes through a fixed host-side boundary before presentation. The renderer cannot provide a filesystem path, repository target, command or output destination.

The Tauri host resolves two fixed Livariant app-data files:

- `project-source-review-input.json` — bounded runtime input owned by Livariant configuration/state;
- `project-source-review-presentation.json` — generated presentation snapshot consumed read-only by the Desktop bridge.

The host starts only the bundled Livariant Node runtime and the bundled Core refresh module. Ordinary bundled runtime material is rejected if its manifest claims Authority.

The Core refresh module validates the configured project/source identities, reconstructs the canonical source registry, rebuilds any selected adoption review from the **current** primary local project material, material-binds supplied review decisions through the canonical adoption decision seam, and then delegates presentation composition to the accepted Project Source & Review producer.

Missing runtime input is shown as unavailable. Invalid input, stale decisions, missing current evidence or a failed bundled runtime refresh fail closed and do not become Project Truth or Authority. The refresh path performs no Semantic Apply and does not mutate project-owned files.

A previously generated presentation file is not treated as proof that a failed current refresh succeeded. The refresh command returns the current refresh result directly to the renderer.

This slice does not yet define the UI/configuration writer for `project-source-review-input.json`; that is a separate bounded project-state integration step.
