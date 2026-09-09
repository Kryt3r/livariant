# Desktop First-Run Project State Persistence

Livariant Desktop can persist accepted first-run project state into a fixed Livariant app-data request and project that state through bundled Livariant Core into the bounded Project Sources & Review configuration.

The renderer supplies only the serialized accepted first-run state plus explicit review paths and material-bound decisions. It cannot choose the persistence path, projection executable, runtime script or Project Sources & Review output path.

The host persists the request only in Livariant app-data, invokes the bundled Core projection runtime and delegates the resulting configuration to the already accepted bounded Project Sources & Review writer. This keeps the normal `FirstRunOnboardingState` as the source model instead of introducing a Desktop-only project model.

The canonical projection still requires an explicit primary repository local binding. The general onboarding `localRoot` is not silently converted into a repository binding. Additional repositories preserve their explicit purpose descriptions and optional local bindings.

Persisted onboarding/configuration state is not Project Truth, creates no source observation Evidence and grants no Authority. Reachability, branch and revision remain the responsibility of the separate observation step. No project-owned files are changed and no Semantic Apply or Self-Hosting mutation Authority is created.
