import "./diagnostics-empty-state-polish.css";

// Empty-state semantics are rendered directly by diagnostics-cockpit.ts from the
// already loaded DiagnosticsSummary.hasObservedData value. Keeping this module as
// a style-only compatibility import avoids a second asynchronous summary request
// that previously changed the hero after first paint.
