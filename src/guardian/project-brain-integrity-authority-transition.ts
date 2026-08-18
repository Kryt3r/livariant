import { realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { discoverProject } from "../project/discovery.js";
import { findMatchingActiveGuardianAuthority } from "./authority-client.js";
import { issueGuardianAuthority } from "./authority-transitions.js";
import {
  buildProjectBrainIntegrityGuardianRequest,
  type ProjectBrainIntegrityGuardianMaterial,
} from "./project-brain-integrity-authority.js";

type IntegrityIdentity = Pick<
  ProjectBrainIntegrityGuardianMaterial,
  "stableProjectIdentity" | "integritySchemaVersion" | "baseline"
>;

function pathIsWithin(root: string, candidate: string): boolean {
  const normalizedRoot = process.platform === "win32" ? resolve(root).toLowerCase() : resolve(root);
  const normalizedCandidate = process.platform === "win32" ? resolve(candidate).toLowerCase() : resolve(candidate);
  const rel = relative(normalizedRoot, normalizedCandidate);
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`) && !rel.startsWith(sep));
}

async function integrityRequest(
  identity: IntegrityIdentity,
  projectPath: string,
) {
  const project = discoverProject(projectPath);
  const physicalProjectRoot = await realpath(project.root);
  const physicalProjectBrainRoot = await realpath(resolve(project.root, ".project-brain"));
  if (!pathIsWithin(physicalProjectRoot, physicalProjectBrainRoot) || physicalProjectBrainRoot === physicalProjectRoot) {
    throw new Error("Physical Project Brain root must resolve inside the physical project root.");
  }
  return buildProjectBrainIntegrityGuardianRequest({
    ...identity,
    physicalProjectRoot,
    physicalProjectBrainRoot,
  });
}

export async function issueProjectBrainIntegrityGuardianAuthority(
  identity: IntegrityIdentity,
  projectPath: string = process.cwd(),
) {
  const material = await integrityRequest(identity, projectPath);
  const record = await issueGuardianAuthority({ request: material.request, projectPath });
  if (record.consumer !== "project-brain-integrity"
    || record.mode !== "persistent"
    || record.state !== "active"
    || record.materialSha256 !== material.materialSha256) {
    throw new Error("Protected Guardian issued Project Brain Integrity Authority does not match the exact accepted material.");
  }
  return { material, record };
}

export async function assertProjectBrainIntegrityGuardianAuthority(
  identity: IntegrityIdentity,
  projectPath: string = process.cwd(),
) {
  const material = await integrityRequest(identity, projectPath);
  const record = await findMatchingActiveGuardianAuthority({
    consumer: "project-brain-integrity",
    mode: "persistent",
    materialSha256: material.materialSha256,
    projectPath,
  });
  if (!record) {
    throw new Error("Matching protected Guardian Project Brain Integrity Authority is missing; same-user integrity evidence is not sufficient accepted-state Authority.");
  }
  return { material, record };
}
