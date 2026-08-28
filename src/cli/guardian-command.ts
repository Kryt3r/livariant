import { inspectGuardianMachineReadiness } from "../guardian/readiness.js";

function jsonRequested(args: string[]): boolean {
  return args.includes("--json");
}

function validateArgs(args: string[], subcommand: "status" | "bootstrap"): void {
  const unknown = args.filter((arg) => arg !== subcommand && arg !== "--json");
  if (unknown.length > 0) throw new Error(`Guardian ${subcommand} contains unsupported argument: ${unknown[0]}.`);
}

function protectedBootstrapCommand(platform: NodeJS.Platform): string | null {
  if (platform === "win32") return "& 'C:\\Program Files\\Livariant\\Bootstrap\\v1\\guardian-bootstrap.ps1'";
  if (platform === "linux") return "/opt/livariant/bootstrap/v1/guardian-bootstrap";
  return null;
}

function protectedRecoveryCommand(platform: NodeJS.Platform): string | null {
  if (platform === "win32") return "& 'C:\\Program Files\\Livariant\\Bootstrap\\v1\\guardian-recover.ps1'";
  return null;
}

function nextAction(readiness: Awaited<ReturnType<typeof inspectGuardianMachineReadiness>>): string {
  if (readiness.state === "ready") {
    return "Guardian is ready. No bootstrap action is required.";
  }
  if (readiness.state === "protected-source-required") {
    return "Install exact verified Livariant protected-bootstrap release material through the privileged Stage-A installation path, then run `livariant guardian status` again.";
  }
  if (readiness.state === "guardian-bootstrap-required") {
    const command = protectedBootstrapCommand(readiness.platform);
    return command
      ? `Run the protected Stage-B launcher from a local privileged terminal: ${command}`
      : "Run the protected Stage-B launcher from the OS-protected Livariant bootstrap source.";
  }
  if (readiness.state === "unsafe") {
    const recovery = readiness.protectedSource.state === "ready" ? protectedRecoveryCommand(readiness.platform) : null;
    return recovery
      ? `STOP. Do not authorize lifecycle changes. If this is the historical pre-Authority Windows Stage-B ACL failure, run the protected bounded recovery launcher from a local privileged terminal: ${recovery}. The recovery path validates exact protected bytes, descriptor identity, protected ownership, and zero Authority records before changing ACLs; otherwise it fails closed.`
      : "STOP. Do not bootstrap or authorize lifecycle changes. Repair/reinstall the protected machine state from exact qualified release material; do not bless it through project files, CLI flags, or requester-controlled copies.";
  }
  return "Protected Guardian v1 is unsupported on this platform. Do not proceed with Guardian-dependent lifecycle authorization.";
}

export async function handleGuardianCommand(args: string[]): Promise<void> {
  const [subcommand] = args;
  if (subcommand !== "status" && subcommand !== "bootstrap") {
    throw new Error("Guardian command requires: guardian status [--json] or guardian bootstrap [--json].");
  }
  validateArgs(args, subcommand);

  const readiness = await inspectGuardianMachineReadiness(process.cwd());
  const next = nextAction(readiness);

  if (subcommand === "bootstrap") {
    const result = {
      schemaVersion: 1,
      state: readiness.state === "guardian-bootstrap-required" ? "protected-launcher-required" : readiness.state,
      platform: readiness.platform,
      protectedSource: readiness.protectedSource,
      guardian: readiness.guardian,
      authorityIssued: false,
      changesMade: 0,
      nextStep: next,
      boundary: "The ordinary global CLI does not execute privileged Guardian bootstrap or recovery from requester-writable package bytes. Protected Stage-B operations execute only from the already OS-protected release-bound bootstrap source.",
    };
    if (jsonRequested(args)) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }
    console.log("Livariant Guardian bootstrap");
    console.log(`State: ${result.state}`);
    console.log(`Platform: ${result.platform}`);
    console.log(`Protected source: ${result.protectedSource.root ?? "unsupported"}`);
    console.log(`Protected source state: ${result.protectedSource.state}`);
    console.log(`Guardian root: ${result.guardian.root ?? "unsupported"}`);
    console.log(`Guardian ready: ${result.guardian.ready ? "yes" : "no"}`);
    console.log("Authority issued: no");
    console.log("Changes made: 0");
    console.log(`Next: ${result.nextStep}`);
    console.log(`Boundary: ${result.boundary}`);
    return;
  }

  const result = {
    ...readiness,
    nextStep: next,
  };
  if (jsonRequested(args)) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  console.log("Livariant Guardian");
  console.log(`State: ${readiness.state}`);
  console.log(`Platform: ${readiness.platform}`);
  console.log(`Protected source: ${readiness.protectedSource.root ?? "unsupported"}`);
  console.log(`Protected source state: ${readiness.protectedSource.state}`);
  console.log(`Protected source reason: ${readiness.protectedSource.reason}`);
  console.log(`Guardian root: ${readiness.guardian.root ?? "unsupported"}`);
  console.log(`Guardian state: ${readiness.guardian.state}`);
  console.log(`Guardian ready: ${readiness.guardian.ready ? "yes" : "no"}`);
  console.log(`Guardian reason: ${readiness.guardian.reason}`);
  console.log(`Lifecycle authorization prerequisite ready: ${readiness.lifecycleAuthorizationReady ? "yes" : "no"}`);
  console.log("Authority granted: no");
  console.log("Changes made: 0");
  console.log(`Next: ${next}`);
}
