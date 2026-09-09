# Desktop Project Source Observation

The Desktop Project Sources & Review flow can observe configured local repository bindings before rebuilding the canonical presentation.

The renderer cannot provide a filesystem target, executable, Git arguments or output destination. The Tauri host invokes only the bundled Livariant Node/Core observation module and points it at the fixed Livariant app-data `project-source-review-input.json` file.

For each configured repository that has an explicit local binding, the observation module uses Git without a shell to inspect whether the path is a Git work tree and, when available, records the current branch and revision. The observation timestamp is produced at observation time and the new observation is initially marked non-stale.

A configured additional repository without a local binding receives no fabricated observation. It therefore remains unknown in the Project Source Center until a real observation source exists.

A configured local binding that cannot be inspected as a Git work tree is recorded as unreachable evidence. This does not become Project Truth and does not change the configured repository association.

The observation module writes only the bounded Livariant app-data runtime input. It does not write project-owned files, grant Authority, perform Semantic Apply or resolve conflicts. The Desktop then runs the already accepted canonical Project Source & Review refresh against the newly observed evidence.
