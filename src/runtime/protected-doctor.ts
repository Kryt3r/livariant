import { inspectProtectedProjectBrainIntegrity } from "../project-brain/protected-integrity.js";
import {
  runDoctor as runLocalEvidenceDoctor,
  type DoctorFinding,
  type DoctorOptions,
  type DoctorReport,
} from "./doctor.js";

function blocked(report: DoctorReport, finding: DoctorFinding): DoctorReport {
  return {
    ...report,
    state: "drift-detected",
    findings: [finding],
  };
}

export async function runProtectedDoctor(
  projectPath: string = process.cwd(),
  options: DoctorOptions = {},
): Promise<DoctorReport> {
  const local = await runLocalEvidenceDoctor(projectPath, options);
  if (local.state !== "healthy") return local;

  const protectedIntegrity = await inspectProtectedProjectBrainIntegrity(projectPath, options.integrityStorage);
  if (protectedIntegrity.state === "match") {
    return {
      ...local,
      findings: [{
        code: "healthy",
        severity: "info",
        message: "No supported lifecycle or protected Guardian-bound Project Brain integrity drift detected.",
      }],
    };
  }

  if (protectedIntegrity.state === "unprotected") {
    return blocked(local, {
      code: "project-brain-integrity-unprotected",
      severity: "error",
      message: `${protectedIntegrity.reason} Canonical Project Truth remains blocked until the exact current material is protected by Guardian-origin Authority.`,
    });
  }

  if (protectedIntegrity.state === "invalid") {
    return blocked(local, {
      code: "project-brain-integrity-protected-invalid",
      severity: "error",
      message: `Protected Project Brain integrity evidence is invalid or unavailable and must not be guessed through: ${protectedIntegrity.reason}`,
    });
  }

  if (protectedIntegrity.state === "missing") {
    return blocked(local, {
      code: "project-brain-integrity-unestablished",
      severity: "error",
      message: "No accepted Project Brain integrity evidence is established for this physical project location.",
    });
  }

  return blocked(local, {
    code: "project-brain-integrity-mismatch",
    severity: "error",
    message: `Managed Project Brain bytes are not the accepted integrity state: ${protectedIntegrity.local.reason}`,
  });
}
