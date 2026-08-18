import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import {
  assertGuardianAuthorityMatches,
  guardianAuthorityMaterialDigest,
  type GuardianAuthorityMaterialField,
  type GuardianAuthorityRecord,
} from "./authority-record.js";
import {
  assertGuardianAuthoritySupport,
  findMatchingActiveGuardianAuthority,
  readGuardianAuthorityById,
  type GuardianAuthorityRequest,
} from "./authority-client.js";
import { runPrivilegedGuardianHelper } from "./privileged-helper.js";

export async function issueGuardianAuthority(input: {
  request: GuardianAuthorityRequest;
  projectPath?: string;
}): Promise<GuardianAuthorityRecord> {
  const projectPath = input.projectPath ?? process.cwd();
  const support = await assertGuardianAuthoritySupport(projectPath);
  const materialSha256 = guardianAuthorityMaterialDigest(
    input.request.consumer,
    input.request.materialFields as readonly GuardianAuthorityMaterialField[],
  );
  const existing = await findMatchingActiveGuardianAuthority({
    consumer: input.request.consumer,
    mode: input.request.mode,
    materialSha256,
    projectPath,
  });
  if (existing) {
    throw new Error("An active protected Guardian Authority already exists for this exact material; refusing duplicate issuance.");
  }

  const directory = await mkdtemp(resolve(tmpdir(), "livariant-guardian-request-"));
  const requestName = "authority-request.json";
  const requestPath = resolve(directory, requestName);
  try {
    await writeFile(requestPath, `${JSON.stringify(input.request, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
    await runPrivilegedGuardianHelper(
      support,
      ["issue-authority", "--request", requestName],
      { cwd: directory },
    );
    const record = await findMatchingActiveGuardianAuthority({
      consumer: input.request.consumer,
      mode: input.request.mode,
      materialSha256,
      projectPath,
    });
    if (!record) throw new Error("Protected Guardian transition completed without a matching protected Authority record.");
    assertGuardianAuthorityMatches(record, {
      consumer: input.request.consumer,
      mode: input.request.mode,
      materialSha256,
    });
    return record;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function consumeGuardianAuthority(input: {
  record: GuardianAuthorityRecord;
  expectedMaterialSha256: string;
  projectPath?: string;
}): Promise<GuardianAuthorityRecord> {
  const projectPath = input.projectPath ?? process.cwd();
  const support = await assertGuardianAuthoritySupport(projectPath);
  assertGuardianAuthorityMatches(input.record, {
    consumer: input.record.consumer,
    mode: "one-shot",
    materialSha256: input.expectedMaterialSha256,
  });
  await runPrivilegedGuardianHelper(support, [
    "consume-authority",
    "--consumer",
    input.record.consumer,
    "--record",
    input.record.recordId,
    "--material",
    input.expectedMaterialSha256,
  ]);
  const consumed = await readGuardianAuthorityById({
    consumer: input.record.consumer,
    recordId: input.record.recordId,
    projectPath,
  });
  if (consumed.recordId !== input.record.recordId
    || consumed.consumer !== input.record.consumer
    || consumed.mode !== "one-shot"
    || consumed.materialSha256 !== input.expectedMaterialSha256
    || consumed.state !== "consumed") {
    throw new Error("Protected Guardian consumption state does not match the exact selected Authority.");
  }
  return consumed;
}
