# Desktop Project Source & Review configuration

The Desktop can persist Project Sources & Review configuration through a bounded Tauri command before the runtime refresh is executed.

The renderer supplies only structured project configuration. It cannot choose the destination path or executable. The host always writes to the fixed Livariant app-data file `project-source-review-input.json`.

The configuration accepts exactly one primary repository with a required local path, optional additional repositories with mandatory purpose descriptions, optional repository-relative review paths and optional material-bound review decisions.

The host rejects empty identities, unsupported repository providers, duplicate repository identities, duplicate or unbounded review paths, invalid decision kinds and decisions without selected review material.

The configuration writer deliberately writes an empty `observations` array. Configuration is not observation evidence and the UI cannot mint reachability, branch, revision or stale facts merely by saving project settings. Those values must come from a separate observed-evidence path.

Saving configuration does not create Project Truth, Authority or Semantic Apply capability and does not modify project-owned files. Repository purpose descriptions remain semantic context only and do not grant Trust or Authority.
