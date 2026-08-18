import { runProtectedDoctor } from "../runtime/protected-doctor.js";

export async function requireProtectedCanonicalProject(projectPath: string = process.cwd()): Promise<void> {
  const report = await runProtectedDoctor(projectPath);
  if (report.state === "healthy") return;
  const detail = report.findings.map((finding) => `${finding.code}: ${finding.message}`).join("; ");
  throw new Error(
    `Canonical Project Brain use requires exact protected Guardian integrity acceptance. Run 'livariant integrity inspect' and, after reviewing the current managed state, 'livariant integrity accept-current'.${detail ? ` Current state: ${detail}` : ""}`,
  );
}
