# Desktop first-run lifecycle bridge

Livariant Desktop can now load and transition the canonical first-run onboarding state without embedding a second onboarding state machine in the renderer.

The renderer sends only bounded lifecycle actions such as moving to a step, selecting a project, answering or skipping an existing understanding question, configuring repositories, deferring provider setup, or completing onboarding. The Tauri host writes the action only to a fixed Livariant app-data staging file and invokes the bundled Livariant Core lifecycle runtime. Core applies the accepted `FirstRunOnboardingState` transition functions and returns the next canonical state.

On a fresh installation with no persisted first-run request, Core returns an unpersisted `welcome` state. Reading that state performs no persistence and does not create project configuration.

After a lifecycle action, the host persists the resulting onboarding state only in Livariant app-data. If the canonical first-run-to-source-review projection is not ready yet, partial onboarding progress is saved without inventing repository observations or Project Source & Review configuration. When the projection is ready, the host delegates to the already accepted bounded first-run project-state persistence path so Project Sources & Review stays synchronized through canonical Core.

The renderer cannot choose the state path, action path, executable or runtime script. Persisted onboarding state is not Project Truth, does not grant Authority, creates no observed source Evidence, changes no project-owned files and performs no Semantic Apply.

This bridge is lifecycle infrastructure for the real first-run UI. It does not itself claim that the full first-run user interface is complete.
