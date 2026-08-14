import { randomUUID } from "node:crypto";

const CANONICAL_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isStableProjectIdentity(value: unknown): value is string {
  return typeof value === "string" && CANONICAL_UUID_PATTERN.test(value);
}

export function generateStableProjectIdentity(): string {
  const identity = randomUUID().toLowerCase();
  if (!isStableProjectIdentity(identity)) {
    throw new Error("Trusted runtime failed to generate a canonical stable project identity.");
  }
  return identity;
}
