import { createHash } from "node:crypto";
import type { AutonomyProfile } from "../autonomy/profile.js";
import type { ProviderContextProvider } from "./provider-context-types.js";

export function providerContextPacketId(
  provider: ProviderContextProvider,
  baselineDigest: string,
  task: string,
  autonomyProfile: AutonomyProfile,
): string {
  const hash = createHash("sha256");
  const add = (label: string, value: string): void => {
    const labelBytes = Buffer.from(label, "utf8");
    const valueBytes = Buffer.from(value, "utf8");
    const header = Buffer.alloc(8);
    header.writeUInt32BE(labelBytes.length, 0);
    header.writeUInt32BE(valueBytes.length, 4);
    hash.update(header);
    hash.update(labelBytes);
    hash.update(valueBytes);
  };
  add("domain", "livariant:provider-context:v1");
  add("provider", provider);
  add("baseline", baselineDigest);
  add("task", task);
  add("autonomy-profile", autonomyProfile);
  return `pcx_${hash.digest("hex")}`;
}
