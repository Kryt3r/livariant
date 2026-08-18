import {
  processProviderReturn,
  type ProviderReturnOptions,
  type ProviderReturnResult,
} from "./provider-return.js";
import { runProtectedDoctor } from "./protected-doctor.js";

function blocked(message: string): ProviderReturnResult {
  return {
    state: "blocked",
    phase: "current-project",
    message,
    recoveryRequired: false,
    semanticChangesMade: 0,
  };
}

function doctorMessage(prefix: string, findings: Awaited<ReturnType<typeof runProtectedDoctor>>["findings"]): string {
  const detail = findings.map((finding) => `${finding.code}: ${finding.message}`).join("; ");
  return `${prefix}${detail ? ` ${detail}` : ""}`;
}

export async function processProtectedProviderReturn(
  suppliedContextValue: unknown,
  returnValue: unknown,
  authorizationId?: string,
  projectPath: string = process.cwd(),
  options: ProviderReturnOptions = {},
): Promise<ProviderReturnResult> {
  const before = await runProtectedDoctor(projectPath);
  if (before.state !== "healthy") {
    return blocked(doctorMessage(
      "Provider return requires exact protected Guardian integrity acceptance for the current Project Brain.",
      before.findings,
    ));
  }

  const result = await processProviderReturn(suppliedContextValue, returnValue, authorizationId, projectPath, options);

  if (result.semanticChangesMade === 1) {
    if (result.state === "candidate-received" && result.maintenance.state === "completed") {
      return {
        ...result,
        maintenance: {
          state: "completed-context-blocked",
          apply: result.maintenance.apply,
          context: null,
          refreshError: "The semantic mutation completed, but the new Project Brain state is not canonical until exact protected Guardian integrity acceptance is established. Run 'livariant integrity accept-current' after review.",
          semanticChangesMade: 1,
        },
      };
    }
    return result;
  }

  const after = await runProtectedDoctor(projectPath);
  if (after.state !== "healthy") {
    return blocked(doctorMessage(
      "Project Brain protected integrity changed while provider return was being processed; no returned context is accepted as canonical.",
      after.findings,
    ));
  }

  return result;
}
