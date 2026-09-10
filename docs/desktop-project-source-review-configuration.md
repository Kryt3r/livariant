# Desktop Project Source & Review configuration

The Desktop can persist Project Sources & Review configuration through a bounded Tauri command before the runtime refresh is executed.

The renderer supplies only structured project configuration. It cannot choose the destination path or executable. The host always writes to the fixed Livariant app-data file `project-source-review-input.json`.

The configuration accepts exactly one primary repository with a required local path, optional additional repositories with mandatory purpose descriptions, optional repository-relative review paths and optional material-bound review decisions.

The host rejects empty identities, unsupported repository providers, duplicate repository identities, duplicate or unbounded review paths, invalid decision kinds and decisions without selected review material.

The configuration writer deliberately writes an empty `observations` array. Configuration is not observation evidence and the UI cannot mint reachability, branch, revision or stale facts merely by saving project settings. Those values must come from a separate observed-evidence path.

## Normal Desktop review selection

Project Sources & Review can inventory bounded reviewable adoption/self-observation surfaces from the linked primary local checkout through the bundled Livariant Core. The renderer does not supply a filesystem root and the inventory does not interpret file contents. Candidate paths remain repository-relative Evidence with explicit kind and scope context.

The user must explicitly select one or more candidates and choose **Start review** before the selection is written to Livariant app-data. At start time the host runs the bounded inventory again and rejects empty selections, absolute paths, parent traversal, duplicates and any path that is no longer present in the fresh inventory. A concurrent configuration change also causes the start to fail closed.

Changing the selected material clears previous material-bound review decisions. The existing canonical Project Source & Review refresh producer then performs the bounded review; the Desktop does not introduce a second review engine.

Selecting or starting a review does not create Project Truth, Authority or Semantic Apply capability and does not modify project-owned files. The UI keeps `Evidence != Truth`, `Proposal != Authorization` and `Authorization != Apply` explicit.

Saving configuration does not create Project Truth, Authority or Semantic Apply capability and does not modify project-owned files. Repository purpose descriptions remain semantic context only and do not grant Trust or Authority.
