import type { DriftFinding } from "../runtime/drift-assessment.js";

export function renderDriftText(value: string): string {
  let result = "";
  for (const char of value) {
    const code = char.codePointAt(0)!;
    result += code <= 0x1f || (code >= 0x7f && code <= 0x9f) ? "\\u" + code.toString(16).padStart(4, "0") : char;
  }
  return result;
}

export function renderDriftFinding(finding: DriftFinding | { code: string; severity: string; message: string }): string {
  return "category" in finding
    ? `- [${finding.category}/${finding.effect}] ${finding.code}: ${finding.message}`
    : `- [${finding.severity}] ${finding.code}: ${finding.message}`;
}
