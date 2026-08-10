export type DecisionStatus = "active" | "superseded";

export interface DecisionRecord {
  id: string;
  status: DecisionStatus;
  text: string;
  supersededBy?: string;
  reason?: string;
  legacy: boolean;
}

export interface ParsedDecisions {
  records: DecisionRecord[];
  issues: string[];
}

const ACTIVE = /^- \[([A-Za-z0-9._:-]+)\] \(active\) (.+)$/;
const SUPERSEDED = /^- \[([A-Za-z0-9._:-]+)\] \(superseded by ([A-Za-z0-9._:-]+)\) (.+)$/;
const REASON_PREFIX = "  - reason: ";

export function parseDecisionsMarkdown(markdown: string): ParsedDecisions {
  const records: DecisionRecord[] = [];
  const issues: string[] = [];
  const ids = new Set<string>();
  const lines = markdown.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trimEnd();
    if (!line.startsWith("- ")) continue;
    if (line === "- No accepted project decisions have been recorded yet.") continue;

    const active = ACTIVE.exec(line);
    if (active) {
      const [, id, text] = active;
      if (ids.has(id)) issues.push(`duplicate decision id: ${id}`);
      ids.add(id);
      records.push({ id, status: "active", text: text.trim(), legacy: false });
      continue;
    }

    const superseded = SUPERSEDED.exec(line);
    if (superseded) {
      const [, id, supersededBy, text] = superseded;
      if (ids.has(id)) issues.push(`duplicate decision id: ${id}`);
      ids.add(id);
      let reason: string | undefined;
      const next = lines[index + 1];
      if (next?.startsWith(REASON_PREFIX)) {
        reason = next.slice(REASON_PREFIX.length).trim();
        index += 1;
      }
      records.push({ id, status: "superseded", supersededBy, text: text.trim(), reason, legacy: false });
      continue;
    }

    if (/^- \[[^\]]+\] \(/.test(line)) {
      issues.push(`malformed structured decision at line ${index + 1}`);
      continue;
    }

    // Human-authored legacy bullets remain accepted active knowledge. They are readable,
    // but must first be converted to a stable structured record before supersession.
    records.push({ id: `legacy-line-${index + 1}`, status: "active", text: line.slice(2).trim(), legacy: true });
  }

  for (const record of records) {
    if (record.status === "superseded" && record.supersededBy && !ids.has(record.supersededBy)) {
      issues.push(`superseded decision '${record.id}' references missing replacement '${record.supersededBy}'`);
    }
  }

  return { records, issues };
}

export function renderDecisionsMarkdown(records: DecisionRecord[]): string {
  const lines = ["# Decisions", ""];
  if (records.length === 0) {
    lines.push("No accepted project decisions have been recorded yet.", "");
    return lines.join("\n");
  }

  lines.push("Accepted project decisions. Structured records preserve active versus superseded truth.", "");
  for (const record of records) {
    if (record.legacy) {
      lines.push(`- ${record.text}`);
      continue;
    }
    if (record.status === "active") {
      lines.push(`- [${record.id}] (active) ${record.text}`);
    } else {
      lines.push(`- [${record.id}] (superseded by ${record.supersededBy}) ${record.text}`);
      if (record.reason) lines.push(`${REASON_PREFIX}${record.reason}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}
