import { realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { discoverProject } from "../project/discovery.js";
import { findMatchingActiveGuardianAuthority } from "./authority-client.js";
import { issueGuardianAuthority } from "./authority-transitions.js";
import {
  buildRuntimeTrustGuardianRequest,
  type RuntimeTrustGuardianMaterial,
} from "./runtime-trust-authority.js";

type RuntimeIdentity = Pick<
  RuntimeTrustGuardianMaterial,
  "version" | "channel" | "sourceId" | "artifactId" | "artifactSha256" | "packageTreeSha256"
>;

function normalized(path: string): string {
  const value = resolve(path);
  return process.platform === "win32" ? value.toLowerCase() : value;
}

function pathIsWithin(root: string, candidate: string): boolean {
  const rel = relative(normalized(root), normalized(candidate));
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`) && !rel.startsWith(sep));
}

async function runtimeTrustRequest(identity: RuntimeIdentity, installRoot: string, projectPath: string) {
  const project = discoverProject(projectPath);
  const physicalProjectRoot = await realpath(project.root);
  const physicalInstallRoot = await realpath(installRoot);
  const expectedReleasesRoot = resolve(physicalProjectRoot, ".framework-runtime", "releases");
  if (!pathIsWithin(expectedReleasesRoot, physicalInstallRoot) || physicalInstallRoot === normalized(expectedReleasesRoot)) {
    throw new Error("Physical Runtime install root must resolve inside the current project's managed Runtime releases root.");
  }

  const physicalPackageRoot = await realpath(resolve(physicalInstallRoot, "node_modules", "livariant"));
  const physicalCliPath = await realpath(resolve(physicalPackageRoot, "dist", "src", "cli", "index.js"));
  if (!pathIsWithin(physicalInstallRoot, physicalPackageRoot) || !pathIsWithin(physicalPackageRoot, physicalCliPath)) {
    throw new Error("Physical Runtime package/CLI path escapes the exact installed Runtime root.");
  }

  return buildRuntimeTrustGuardianRequest({
    runtimeTrustSchemaVersion: 1,
    packageName: "livariant",
    ...identity,
    physicalProjectRoot,
    physicalInstallRoot,
    physicalPackageRoot,
    physicalCliPath,
  });
}

export async function findRuntimeTrustGuardianAuthority(
  identity: RuntimeIdentity,
  installRoot: string,
  projectPath: string = process.cwd(),
) {
  const material = await runtimeTrustRequest(identity, installRoot, projectPath);
  const record = await findMatchingActiveGuardianAuthority({
    consumer: "runtime-trust",
    mode: "persistent",
    materialSha256: material.materialSha256,
    projectPath,
  });
  return { material, record };
}

export async function issueRuntimeTrustGuardianAuthority(
  identity: RuntimeIdentity,
  installRoot: string,
  projectPath: string = process.cwd(),
) {
  const material = await runtimeTrustRequest(identity, installRoot, projectPath);
  const existing = await findMatchingActiveGuardianAuthority({
    consumer: "runtime-trust",
    mode: "persistent",
    materialSha256: material.materialSha256,
    projectPath,
  });
  if (existing) return { material, record: existing };

  const record = await issueGuardianAuthority({ request: material.request, projectPath });
  if (record.consumer !== "runtime-trust"
    || record.mode !== "persistent"
    || record.state !== "active"
    || record.materialSha256 !== material.materialSha256) {
    throw new Error("Protected Guardian issued Runtime trust does not match the exact installed Runtime material.");
  }
  return { material, record };
}

export async function assertRuntimeTrustGuardianAuthority(
  identity: RuntimeIdentity,
  installRoot: string,
  projectPath: string = process.cwd(),
) {
  const { material, record } = await findRuntimeTrustGuardianAuthority(identity, installRoot, projectPath);
  if (!record) {
    throw new Error("Matching protected Guardian Runtime trust is missing; same-user Runtime trust evidence cannot authorize execution.");
  }
  return { material, record };
}
