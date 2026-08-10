export interface ValidationResult {
  ok: boolean;
  issues: string[];
}

export function valid(): ValidationResult {
  return { ok: true, issues: [] };
}
