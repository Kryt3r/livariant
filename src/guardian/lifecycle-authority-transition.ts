import {
  findMatchingActiveGuardianAuthority,
} from "./authority-client.js";
import { consumeGuardianAuthority, issueGuardianAuthority } from "./authority-transitions.js";
import type { LifecycleGuardianAuthorityMaterial } from "./lifecycle-authority.js";

export async function issueLifecycleGuardianAuthority(
  material: LifecycleGuardianAuthorityMaterial,
  projectPath: string = process.cwd(),
) {
  const record = await issueGuardianAuthority({ request: material.request, projectPath });
  if (record.consumer !== "lifecycle-mutation"
    || record.mode !== "one-shot"
    || record.materialSha256 !== material.materialSha256) {
    throw new Error("Protected Guardian issued Lifecycle Authority does not match the exact lifecycle material.");
  }
  return { material, record };
}

export async function consumeLifecycleGuardianAuthority(
  material: LifecycleGuardianAuthorityMaterial,
  projectPath: string = process.cwd(),
) {
  const record = await findMatchingActiveGuardianAuthority({
    consumer: "lifecycle-mutation",
    mode: "one-shot",
    materialSha256: material.materialSha256,
    projectPath,
  });
  if (!record) {
    throw new Error("Matching active protected Guardian Lifecycle Authority is missing; --apply expresses intent but is not sufficient lifecycle Authority.");
  }
  const consumed = await consumeGuardianAuthority({
    record,
    expectedMaterialSha256: material.materialSha256,
    projectPath,
  });
  return { material, record: consumed };
}
