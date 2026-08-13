import { createHash } from "node:crypto";
import { frameHashField } from "./project-context-material.js";

export const DRIFT_DIGEST_DOMAIN = "livariant:drift-assessment:v1" as const;

function hashValue(hash: ReturnType<typeof createHash>, label: string, value: unknown): void {
  if (value === null) {
    frameHashField(hash, `${label}:type`, Buffer.from("null"));
    return;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    frameHashField(hash, `${label}:type`, Buffer.from(typeof value));
    frameHashField(hash, `${label}:value`, Buffer.from(String(value), "utf8"));
    return;
  }
  if (Array.isArray(value)) {
    frameHashField(hash, `${label}:type`, Buffer.from("array"));
    frameHashField(hash, `${label}:length`, Buffer.from(String(value.length)));
    value.forEach((item, index) => hashValue(hash, `${label}:${index}`, item));
    return;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
    frameHashField(hash, `${label}:type`, Buffer.from("object"));
    frameHashField(hash, `${label}:length`, Buffer.from(String(entries.length)));
    for (const [key, item] of entries) {
      frameHashField(hash, `${label}:key`, Buffer.from(key, "utf8"));
      hashValue(hash, `${label}:${key}`, item);
    }
    return;
  }
  throw new Error("Unsupported assessment material.");
}

export function driftAssessmentDigest(material: object): string {
  const hash = createHash("sha256");
  frameHashField(hash, "domain", Buffer.from(DRIFT_DIGEST_DOMAIN, "utf8"));
  hashValue(hash, "assessment", material);
  return hash.digest("hex");
}
