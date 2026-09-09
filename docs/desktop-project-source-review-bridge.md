# Desktop Project Source and Review bridge

The Desktop Project Source and Review bridge is a read-only host boundary for the accepted Project Sources and Review renderer.

The host reads only the fixed Livariant app-data presentation snapshot `project-source-review-presentation.json`. The renderer cannot provide a path, command, repository target, or arbitrary source location.

A snapshot is accepted only when it has the supported schema version, a non-empty project identity, a source array, and a summary object. Missing, unreadable, malformed, or unsupported data fails closed to an explicit `unavailable` state.

The bridge does not discover repositories, infer project health, create Project Truth, mint Authority, resolve conflicts, execute Semantic Apply, or mutate project-owned files. A ready bridge result only means that a bounded presentation snapshot could be loaded for display.
