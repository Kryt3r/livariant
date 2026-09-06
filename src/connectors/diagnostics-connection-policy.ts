export function assertDiagnosticsMeasurementSession(connected: boolean): void {
  if (!connected) {
    throw new Error("Codex diagnostics measurement requires an already connected session.");
  }
}
