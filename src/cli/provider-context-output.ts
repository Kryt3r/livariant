import type { ProviderContextPacket } from "../runtime/provider-context.js";

export function printProviderContext(packet: ProviderContextPacket, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(packet));
    if (packet.state === "blocked") process.exitCode = 3;
    return;
  }
  console.log("Provider context");
  console.log(`State: ${packet.state}`);
  console.log(`Provider: ${packet.provider}`);
  console.log(`Project: ${packet.projectLocator}`);
  if (packet.baseline) console.log(`Baseline: ${packet.baseline.algorithm}:${packet.baseline.digest}`);
  if (packet.state === "blocked") {
    console.log("Findings:");
    for (const finding of packet.findings) console.log(`- [${finding.severity}] ${finding.code}: ${finding.message}`);
    console.log("Changes made: 0");
    process.exitCode = 3;
    return;
  }
  console.log(`Packet ID: ${packet.packetId}`);
  console.log(`Task: ${JSON.stringify(packet.task.value)}`);
  console.log("Task authority: session-ephemeral");
  console.log("Project safety: clear");
  console.log("Mutation authorization: false");
  console.log("Apply supported: false");
  console.log("Authorization eligible: false");
  console.log("Changes made: 0");
}
