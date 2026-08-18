import { buildResumeContext, type ResumeContext } from "./resume.js";
import { runProtectedDoctor } from "./protected-doctor.js";

function reason(prefix: string, report: Awaited<ReturnType<typeof runProtectedDoctor>>): Error {
  const detail = report.findings.map((finding) => `${finding.code}: ${finding.message}`).join("; ");
  return new Error(`${prefix}${detail ? ` ${detail}` : ""}`);
}

export async function buildProtectedResumeContext(projectPath: string = process.cwd()): Promise<ResumeContext> {
  const before = await runProtectedDoctor(projectPath);
  if (before.state !== "healthy") {
    throw reason("Resume requires exact protected Guardian integrity acceptance for the current Project Brain.", before);
  }

  const context = await buildResumeContext(projectPath);

  const after = await runProtectedDoctor(projectPath);
  if (after.state !== "healthy") {
    throw reason("Project Brain protected integrity changed while resume context was being reconstructed; refusing canonical output.", after);
  }
  return context;
}
