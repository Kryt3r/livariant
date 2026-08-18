#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmod, lstat, mkdir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, parse, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createInterface } from "node:readline/promises";
import { stderr, stdin } from "node:process";

const GUARDIAN_AUTHORITY_SCHEMA_VERSION = 1 as const;
const GUARDIAN_AUTHORITY_KIND = "livariant-guardian-authority" as const;
const GUARDIAN_AUTHORITY_REQUEST_KIND = "livariant-guardian-authority-request" as const;
const GUARDIAN_AUTHORITY_MATERIAL_DOMAIN = "livariant:guardian-authority-material:v1" as const;
const GUARDIAN_ROOT_KIND = "livariant-guardian-root" as const;
const GUARDIAN_DESCRIPTOR_FILE = "guardian-root.json" as const;
const GUARDIAN_RECORDS_DIRECTORY = "records" as const;
const ONE_SHOT_TTL_MS = 10 * 60 * 1000;
const WINDOWS_POWERSHELL = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const WINDOWS_INTERPRETER_TARGET_ENV = "LIVARIANT_GUARDIAN_HELPER_INTERPRETER_TARGET";
const WINDOWS_INTERPRETER_RESULT_PREFIX = "LIVARIANT_GUARDIAN_HELPER_INTERPRETER|";
const WINDOWS_SYSTEM_SID = "S-1-5-18";
const WINDOWS_ADMINISTRATORS_SID = "S-1-5-32-544";
const WINDOWS_EVERYONE_SID = "S-1-1-0";
const WINDOWS_AUTHENTICATED_USERS_SID = "S-1-5-11";
const WINDOWS_USERS_SID = "S-1-5-32-545";
const WINDOWS_INTERPRETER_RESULT = /^LIVARIANT_GUARDIAN_HELPER_INTERPRETER\|(S-1-[0-9-]+)\|(yes|no)\|(yes|no)$/iu;

export type ProtectedGuardianConsumer =
  | "semantic-mutation"
  | "project-brain-integrity"
  | "runtime-trust"
  | "release-authorization";

export type ProtectedGuardianMode = "one-shot" | "persistent";

export interface ProtectedGuardianMaterialField {
  label: string;
  value: string;
}

export interface ProtectedGuardianRequest {
  schemaVersion: 1;
  kind: typeof GUARDIAN_AUTHORITY_REQUEST_KIND;
  consumer: ProtectedGuardianConsumer;
  mode: ProtectedGuardianMode;
  materialFields: ProtectedGuardianMaterialField[];
}

export interface ProtectedGuardianAuthorityRecord {
  schemaVersion: 1;
  kind: typeof GUARDIAN_AUTHORITY_KIND;
  guardianVersion: 1;
  recordId: string;
  consumer: ProtectedGuardianConsumer;
  mode: ProtectedGuardianMode;
  state: "active" | "consumed";
  materialSha256: string;
  issuedAt: string;
  expiresAt?: string;
  consumedAt?: string;
}

interface WindowsInterpreterProtection {
  ownerSid: string;
  ordinaryRequesterWritable: boolean;
  ordinaryRequesterCanReplaceChildren: boolean;
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function strictKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): void {
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error("Guardian Authority material contains an unsupported field.");
  }
  for (const key of required) {
    if (!(key in value)) throw new Error(`Guardian Authority material is missing required field: ${key}.`);
  }
}

function validConsumer(value: unknown): value is ProtectedGuardianConsumer {
  return value === "semantic-mutation"
    || value === "project-brain-integrity"
    || value === "runtime-trust"
    || value === "release-authorization";
}

function validMode(value: unknown): value is ProtectedGuardianMode {
  return value === "one-shot" || value === "persistent";
}

function validSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function validRecordId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function frame(hash: ReturnType<typeof createHash>, label: string, value: string): void {
  const labelBytes = Buffer.from(label, "utf8");
  const valueBytes = Buffer.from(value, "utf8");
  const lengths = Buffer.allocUnsafe(8);
  lengths.writeUInt32BE(labelBytes.length, 0);
  lengths.writeUInt32BE(valueBytes.length, 4);
  hash.update(lengths);
  hash.update(labelBytes);
  hash.update(valueBytes);
}

export function protectedGuardianMaterialDigest(
  consumer: ProtectedGuardianConsumer,
  fields: readonly ProtectedGuardianMaterialField[],
): string {
  if (fields.length === 0 || fields.length > 32) throw new Error("Guardian Authority request must contain between 1 and 32 exact material fields.");
  const seen = new Set<string>();
  const hash = createHash("sha256");
  frame(hash, "domain", GUARDIAN_AUTHORITY_MATERIAL_DOMAIN);
  frame(hash, "consumer", consumer);
  for (const field of fields) {
    if (!field.label || field.label.length > 128 || /[\r\n\u0000]/u.test(field.label)) {
      throw new Error("Guardian Authority material field label is invalid.");
    }
    if (typeof field.value !== "string" || Buffer.byteLength(field.value, "utf8") > 16 * 1024) {
      throw new Error("Guardian Authority material field value is invalid or too large.");
    }
    if (seen.has(field.label)) throw new Error(`Guardian Authority material field is duplicated: ${field.label}.`);
    seen.add(field.label);
    frame(hash, field.label, field.value);
  }
  return hash.digest("hex");
}

export function parseProtectedGuardianRequest(value: unknown): ProtectedGuardianRequest {
  if (!plainObject(value)) throw new Error("Guardian Authority request is invalid.");
  strictKeys(value, ["schemaVersion", "kind", "consumer", "mode", "materialFields"]);
  if (value.schemaVersion !== 1 || value.kind !== GUARDIAN_AUTHORITY_REQUEST_KIND) throw new Error("Guardian Authority request schema is unsupported.");
  if (!validConsumer(value.consumer)) throw new Error("Guardian Authority request consumer is invalid.");
  if (!validMode(value.mode)) throw new Error("Guardian Authority request mode is invalid.");
  if (!Array.isArray(value.materialFields)) throw new Error("Guardian Authority request material fields are invalid.");
  const materialFields = value.materialFields.map((entry) => {
    if (!plainObject(entry)) throw new Error("Guardian Authority request material field is invalid.");
    strictKeys(entry, ["label", "value"]);
    if (typeof entry.label !== "string" || typeof entry.value !== "string") throw new Error("Guardian Authority request material field is invalid.");
    return { label: entry.label, value: entry.value };
  });
  protectedGuardianMaterialDigest(value.consumer, materialFields);
  return {
    schemaVersion: 1,
    kind: GUARDIAN_AUTHORITY_REQUEST_KIND,
    consumer: value.consumer,
    mode: value.mode,
    materialFields,
  };
}

function parseAuthorityRecord(value: unknown): ProtectedGuardianAuthorityRecord {
  if (!plainObject(value)) throw new Error("Guardian Authority record is invalid.");
  strictKeys(
    value,
    ["schemaVersion", "kind", "guardianVersion", "recordId", "consumer", "mode", "state", "materialSha256", "issuedAt"],
    ["expiresAt", "consumedAt"],
  );
  if (value.schemaVersion !== 1 || value.kind !== GUARDIAN_AUTHORITY_KIND || value.guardianVersion !== 1) throw new Error("Guardian Authority record schema is unsupported.");
  if (!validRecordId(value.recordId)) throw new Error("Guardian Authority record id is invalid.");
  if (!validConsumer(value.consumer)) throw new Error("Guardian Authority record consumer is invalid.");
  if (!validMode(value.mode)) throw new Error("Guardian Authority record mode is invalid.");
  if (value.state !== "active" && value.state !== "consumed") throw new Error("Guardian Authority record state is invalid.");
  if (!validSha256(value.materialSha256)) throw new Error("Guardian Authority record material digest is invalid.");
  if (!validTimestamp(value.issuedAt)) throw new Error("Guardian Authority record issuance timestamp is invalid.");
  if (value.expiresAt !== undefined && !validTimestamp(value.expiresAt)) throw new Error("Guardian Authority record expiry timestamp is invalid.");
  if (value.consumedAt !== undefined && !validTimestamp(value.consumedAt)) throw new Error("Guardian Authority record consumed timestamp is invalid.");
  if (value.mode === "persistent") {
    if (value.expiresAt !== undefined || value.state !== "active" || value.consumedAt !== undefined) throw new Error("Persistent Guardian Authority record has invalid one-shot state.");
  } else {
    if (value.expiresAt === undefined) throw new Error("One-shot Guardian Authority record requires an expiry timestamp.");
    if (Date.parse(value.expiresAt) <= Date.parse(value.issuedAt)) throw new Error("Guardian Authority record expiry is invalid.");
    if (value.state === "active" && value.consumedAt !== undefined) throw new Error("Active Guardian Authority record must not have a consumed timestamp.");
    if (value.state === "consumed" && value.consumedAt === undefined) throw new Error("Consumed Guardian Authority record requires a consumed timestamp.");
    if (value.consumedAt !== undefined && Date.parse(value.consumedAt) < Date.parse(value.issuedAt)) throw new Error("Guardian Authority record was consumed before issuance.");
    if (value.consumedAt !== undefined && Date.parse(value.consumedAt) > Date.parse(value.expiresAt)) throw new Error("Guardian Authority record was consumed after expiry.");
  }
  return value as unknown as ProtectedGuardianAuthorityRecord;
}

function productionRoot(): string {
  if (process.platform === "linux") return "/var/lib/livariant-guardian/v1";
  if (process.platform === "win32") return "C:\\ProgramData\\Livariant\\Guardian\\v1";
  throw new Error("Guardian Authority helper supports Windows and Linux only.");
}

function rootBinding(root: string): string {
  const material = process.platform === "win32" ? resolve(root).toLowerCase() : resolve(root);
  return createHash("sha256").update(`livariant:guardian-root:v1\0${process.platform}\0${material}`, "utf8").digest("hex");
}

async function assertRealDirectory(path: string, label: string): Promise<void> {
  const stats = await lstat(path);
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error(`${label} must be a real directory and must not be a symbolic link or junction.`);
}

async function assertLinuxProtectedInterpreter(): Promise<void> {
  const interpreter = await realpath(process.execPath);
  const filesystemRoot = parse(interpreter).root;
  let current = interpreter;
  while (true) {
    const stats = await lstat(current);
    if (stats.isSymbolicLink()) throw new Error("Guardian protected helper interpreter path encountered a symbolic link after canonicalization.");
    if (Number(stats.uid) !== 0) throw new Error(`Guardian protected helper interpreter path is not root-owned: ${current}`);
    if ((Number(stats.mode) & 0o022) !== 0) throw new Error(`Guardian protected helper interpreter path is writable by group or other principals: ${current}`);
    if (resolve(current) === resolve(filesystemRoot)) break;
    current = dirname(current);
  }
}

function parseWindowsInterpreterProtection(stdout: string): WindowsInterpreterProtection {
  const matches = stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.startsWith(WINDOWS_INTERPRETER_RESULT_PREFIX))
    .map((line) => WINDOWS_INTERPRETER_RESULT.exec(line))
    .filter((match): match is RegExpExecArray => match !== null);
  if (matches.length !== 1) throw new Error("Guardian protected helper Windows interpreter ACL verification returned an invalid or ambiguous result.");
  const [, ownerSid, unsafeWrite, unsafeReplace] = matches[0];
  return {
    ownerSid,
    ordinaryRequesterWritable: unsafeWrite.toLowerCase() === "yes",
    ordinaryRequesterCanReplaceChildren: unsafeReplace.toLowerCase() === "yes",
  };
}

function inspectWindowsInterpreterProtection(path: string): WindowsInterpreterProtection {
  const script = [
    "$ErrorActionPreference='Stop'",
    `$target=$env:${WINDOWS_INTERPRETER_TARGET_ENV}`,
    "if([string]::IsNullOrEmpty($target)){throw 'Guardian interpreter ACL target is missing'}",
    "$acl=if([System.IO.Directory]::Exists($target)){[System.IO.Directory]::GetAccessControl($target)}elseif([System.IO.File]::Exists($target)){[System.IO.File]::GetAccessControl($target)}else{throw 'Guardian interpreter ACL target does not exist'}",
    "$identity=[System.Security.Principal.WindowsIdentity]::GetCurrent()",
    "$owner=$acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value",
    `$protected=@('${WINDOWS_SYSTEM_SID}','${WINDOWS_ADMINISTRATORS_SID}')`,
    `$blocked=@('${WINDOWS_EVERYONE_SID}','${WINDOWS_AUTHENTICATED_USERS_SID}','${WINDOWS_USERS_SID}',$identity.User.Value)`,
    "foreach($group in $identity.Groups){try{$sid=$group.Value}catch{continue};if($protected -notcontains $sid){$blocked += $sid}}",
    "$blocked=@($blocked | Select-Object -Unique)",
    "$writeDanger=[System.Security.AccessControl.FileSystemRights]::WriteData -bor [System.Security.AccessControl.FileSystemRights]::AppendData -bor [System.Security.AccessControl.FileSystemRights]::WriteExtendedAttributes -bor [System.Security.AccessControl.FileSystemRights]::WriteAttributes -bor [System.Security.AccessControl.FileSystemRights]::DeleteSubdirectoriesAndFiles -bor [System.Security.AccessControl.FileSystemRights]::Delete -bor [System.Security.AccessControl.FileSystemRights]::ChangePermissions -bor [System.Security.AccessControl.FileSystemRights]::TakeOwnership",
    "$replaceChildDanger=[System.Security.AccessControl.FileSystemRights]::DeleteSubdirectoriesAndFiles -bor [System.Security.AccessControl.FileSystemRights]::Delete -bor [System.Security.AccessControl.FileSystemRights]::ChangePermissions -bor [System.Security.AccessControl.FileSystemRights]::TakeOwnership",
    "$unsafeWrite=$false",
    "$unsafeReplace=$false",
    "$rules=$acl.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier])",
    "foreach($rule in $rules){try{$sid=$rule.IdentityReference.Value}catch{continue};if($rule.AccessControlType -ne [System.Security.AccessControl.AccessControlType]::Allow -or $blocked -notcontains $sid){continue};if(($rule.FileSystemRights -band $writeDanger) -ne 0){$unsafeWrite=$true};if(($rule.FileSystemRights -band $replaceChildDanger) -ne 0){$unsafeReplace=$true}}",
    "$writeResult=if($unsafeWrite){'yes'}else{'no'}",
    "$replaceResult=if($unsafeReplace){'yes'}else{'no'}",
    `[Console]::Out.WriteLine('${WINDOWS_INTERPRETER_RESULT_PREFIX}' + $owner + '|' + $writeResult + '|' + $replaceResult)`,
  ].join("; ");
  const result = spawnSync(WINDOWS_POWERSHELL, ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    env: { ...process.env, [WINDOWS_INTERPRETER_TARGET_ENV]: path },
  });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message || result.stderr || result.stdout || `exit ${String(result.status)}`;
    throw new Error(`Guardian protected helper Windows interpreter ACL could not be verified: ${String(detail).trim()}`);
  }
  return parseWindowsInterpreterProtection(result.stdout);
}

function protectedWindowsOwner(ownerSid: string): boolean {
  const normalized = ownerSid.trim().toUpperCase();
  return normalized === WINDOWS_SYSTEM_SID || normalized === WINDOWS_ADMINISTRATORS_SID;
}

async function assertWindowsProtectedInterpreter(): Promise<void> {
  const interpreter = await realpath(process.execPath);
  const parent = dirname(interpreter);
  const anchor = dirname(parent);
  for (const [path, label] of [[interpreter, "interpreter"], [parent, "interpreter directory"]] as const) {
    const protection = inspectWindowsInterpreterProtection(path);
    if (!protectedWindowsOwner(protection.ownerSid)) throw new Error(`Guardian protected helper ${label} is not owned by SYSTEM or built-in Administrators.`);
    if (protection.ordinaryRequesterWritable) throw new Error(`Guardian protected helper ${label} grants write-capable ACL rights to an ordinary requester principal or one of its enabled groups.`);
  }
  const anchorProtection = inspectWindowsInterpreterProtection(anchor);
  if (anchorProtection.ordinaryRequesterCanReplaceChildren) {
    throw new Error("Guardian protected helper interpreter parent anchor allows an ordinary requester principal or one of its groups to replace protected child paths.");
  }
}

async function assertProtectedInterpreter(): Promise<void> {
  if (process.platform === "linux") {
    await assertLinuxProtectedInterpreter();
    return;
  }
  if (process.platform === "win32") {
    await assertWindowsProtectedInterpreter();
    return;
  }
  throw new Error("Guardian Authority helper supports Windows and Linux only.");
}

async function assertProtectedSelf(): Promise<{ root: string; records: string }> {
  const expectedRoot = productionRoot();
  const physicalSelf = await realpath(fileURLToPath(import.meta.url));
  const physicalRoot = await realpath(dirname(physicalSelf));
  if ((process.platform === "win32" ? physicalRoot.toLowerCase() : physicalRoot) !== (process.platform === "win32" ? resolve(expectedRoot).toLowerCase() : resolve(expectedRoot))) {
    throw new Error("Guardian Authority helper refuses execution outside the fixed protected production root.");
  }
  const descriptorPath = resolve(physicalRoot, GUARDIAN_DESCRIPTOR_FILE);
  const records = resolve(physicalRoot, GUARDIAN_RECORDS_DIRECTORY);
  await assertRealDirectory(records, "Guardian records root");
  const descriptorValue = JSON.parse(await readFile(descriptorPath, "utf8")) as unknown;
  if (!plainObject(descriptorValue)) throw new Error("Guardian root descriptor is invalid.");
  strictKeys(descriptorValue, ["schemaVersion", "kind", "guardianVersion", "platform", "helperSha256", "rootBindingSha256"]);
  if (descriptorValue.schemaVersion !== 1 || descriptorValue.kind !== GUARDIAN_ROOT_KIND || descriptorValue.guardianVersion !== 1 || descriptorValue.platform !== process.platform) {
    throw new Error("Guardian root descriptor schema does not match this helper.");
  }
  if (!validSha256(descriptorValue.helperSha256) || !validSha256(descriptorValue.rootBindingSha256)) throw new Error("Guardian root descriptor digest is invalid.");
  const helperSha256 = createHash("sha256").update(await readFile(physicalSelf)).digest("hex");
  if (helperSha256 !== descriptorValue.helperSha256) throw new Error("Guardian helper bytes do not match the protected root descriptor.");
  if (rootBinding(physicalRoot) !== descriptorValue.rootBindingSha256) throw new Error("Guardian helper root location does not match the protected descriptor binding.");
  return { root: physicalRoot, records };
}

function windowsProcessIsElevated(): boolean {
  const script = "$p=New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent()); if($p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){'yes'}else{'no'}";
  const result = spawnSync(WINDOWS_POWERSHELL, ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  return !result.error && result.status === 0 && result.stdout.trim().toLowerCase() === "yes";
}

function requirePrivilegedProcess(): void {
  if (process.platform === "linux") {
    if (typeof process.geteuid !== "function" || process.geteuid() !== 0) throw new Error("Guardian Authority transition requires the protected root principal.");
    return;
  }
  if (process.platform === "win32") {
    if (!windowsProcessIsElevated()) throw new Error("Guardian Authority transition requires an elevated Administrator principal.");
    return;
  }
  throw new Error("Guardian Authority helper supports Windows and Linux only.");
}

function displaySafe(value: string): string {
  return value.replace(/[\r\n\u0000-\u001f\u007f]/gu, " ");
}

async function requireInteractiveIssuance(request: ProtectedGuardianRequest, materialSha256: string): Promise<void> {
  if (!stdin.isTTY || !stderr.isTTY) {
    throw new Error("Guardian Authority issuance requires a local interactive privileged terminal; requester-only, redirected, scripted, provider, and CI issuance is refused.");
  }
  stderr.write("Livariant Guardian Authority review\n");
  stderr.write(`Consumer: ${request.consumer}\n`);
  stderr.write(`Mode: ${request.mode}\n`);
  stderr.write(`Exact material SHA-256: ${materialSha256}\n`);
  for (const field of request.materialFields) stderr.write(`${displaySafe(field.label)}: ${displaySafe(field.value)}\n`);
  if (request.mode === "one-shot") stderr.write("One-shot validity: 10 minutes; successful consumption is non-reusable.\n");
  else stderr.write("Persistent trust remains exact-material-bound until the trusted material changes or the record is explicitly replaced.\n");
  const phrase = `AUTHORIZE ${request.consumer.toUpperCase()} ${materialSha256.slice(0, 12)}`;
  stderr.write(`Type exactly: ${phrase}\n`);
  const terminal = createInterface({ input: stdin, output: stderr });
  try {
    const answer = await terminal.question("> ");
    if (answer !== phrase) throw new Error("Guardian Authority confirmation did not match the exact material challenge.");
  } finally {
    terminal.close();
  }
}

function consumerDirectory(recordsRoot: string, consumer: ProtectedGuardianConsumer): string {
  return resolve(recordsRoot, consumer);
}

function recordPath(recordsRoot: string, consumer: ProtectedGuardianConsumer, recordId: string): string {
  if (!validRecordId(recordId)) throw new Error("Guardian Authority record id is invalid.");
  return resolve(consumerDirectory(recordsRoot, consumer), `${recordId.toLowerCase()}.json`);
}

async function ensureConsumerDirectory(recordsRoot: string, consumer: ProtectedGuardianConsumer): Promise<string> {
  const directory = consumerDirectory(recordsRoot, consumer);
  try {
    await mkdir(directory, { recursive: false, mode: 0o755 });
  } catch (error) {
    if (!(error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "EEXIST")) throw error;
  }
  await assertRealDirectory(directory, "Guardian consumer record directory");
  if (process.platform === "linux") await chmod(directory, 0o755);
  return directory;
}

async function issueAuthority(requestPath: string): Promise<void> {
  const { records } = await assertProtectedSelf();
  requirePrivilegedProcess();
  await assertProtectedInterpreter();
  const request = parseProtectedGuardianRequest(JSON.parse(await readFile(requestPath, "utf8")) as unknown);
  const materialSha256 = protectedGuardianMaterialDigest(request.consumer, request.materialFields);
  await requireInteractiveIssuance(request, materialSha256);

  const issuedAt = new Date();
  const record: ProtectedGuardianAuthorityRecord = {
    schemaVersion: GUARDIAN_AUTHORITY_SCHEMA_VERSION,
    kind: GUARDIAN_AUTHORITY_KIND,
    guardianVersion: 1,
    recordId: randomUUID().toLowerCase(),
    consumer: request.consumer,
    mode: request.mode,
    state: "active",
    materialSha256,
    issuedAt: issuedAt.toISOString(),
    ...(request.mode === "one-shot" ? { expiresAt: new Date(issuedAt.getTime() + ONE_SHOT_TTL_MS).toISOString() } : {}),
  };
  const directory = await ensureConsumerDirectory(records, request.consumer);
  const path = resolve(directory, `${record.recordId}.json`);
  await writeFile(path, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o444 });
  if (process.platform === "linux") await chmod(path, 0o444);
  process.stdout.write(`${JSON.stringify({ schemaVersion: 1, state: "issued", authority: record })}\n`);
}

async function readRecord(recordsRoot: string, consumer: ProtectedGuardianConsumer, recordId: string): Promise<{ path: string; raw: string; record: ProtectedGuardianAuthorityRecord }> {
  const path = recordPath(recordsRoot, consumer, recordId);
  const stats = await lstat(path);
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error("Guardian Authority record must be a regular protected file.");
  const raw = await readFile(path, "utf8");
  const record = parseAuthorityRecord(JSON.parse(raw) as unknown);
  if (record.consumer !== consumer || record.recordId.toLowerCase() !== recordId.toLowerCase()) throw new Error("Guardian Authority record path does not match its protected identity.");
  return { path, raw, record };
}

async function inspectAuthority(consumer: ProtectedGuardianConsumer, recordId: string): Promise<void> {
  const { records } = await assertProtectedSelf();
  const { record } = await readRecord(records, consumer, recordId);
  process.stdout.write(`${JSON.stringify({ schemaVersion: 1, state: "inspected", authority: record })}\n`);
}

async function consumeAuthority(consumer: ProtectedGuardianConsumer, recordId: string, expectedMaterialSha256: string): Promise<void> {
  const { records } = await assertProtectedSelf();
  requirePrivilegedProcess();
  await assertProtectedInterpreter();
  if (!validSha256(expectedMaterialSha256)) throw new Error("Guardian Authority expected material digest is invalid.");
  const { path, raw, record } = await readRecord(records, consumer, recordId);
  if (record.mode !== "one-shot") throw new Error("Persistent Guardian Authority cannot be consumed as a one-shot capability.");
  if (record.state !== "active") throw new Error("Guardian Authority capability has already been consumed.");
  if (record.materialSha256 !== expectedMaterialSha256) throw new Error("Guardian Authority capability does not match the exact requested material.");
  const consumedAt = new Date();
  if (record.expiresAt === undefined || Date.parse(record.expiresAt) <= consumedAt.getTime()) throw new Error("Guardian Authority capability is expired and cannot be consumed.");
  const consumed: ProtectedGuardianAuthorityRecord = { ...record, state: "consumed", consumedAt: consumedAt.toISOString() };
  const temporary = resolve(dirname(path), `.${record.recordId}.consume-${randomUUID()}.tmp`);
  await writeFile(temporary, `${JSON.stringify(consumed, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o444 });
  if (process.platform === "linux") await chmod(temporary, 0o444);
  try {
    const observed = await readFile(path, "utf8");
    if (observed !== raw) throw new Error("Guardian Authority capability changed concurrently; refusing ambiguous consumption.");
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
  process.stdout.write(`${JSON.stringify({ schemaVersion: 1, state: "consumed", authority: consumed })}\n`);
}

function argValue(args: string[], name: string): string {
  const index = args.indexOf(name);
  if (index === -1 || index + 1 >= args.length || !args[index + 1]) throw new Error(`Guardian helper requires ${name} <value>.`);
  return args[index + 1];
}

function parseConsumerArg(args: string[]): ProtectedGuardianConsumer {
  const value = argValue(args, "--consumer");
  if (!validConsumer(value)) throw new Error("Guardian helper consumer is invalid.");
  return value;
}

async function main(args: string[]): Promise<void> {
  const [command] = args;
  if (command === "version" && args.length === 1) {
    process.stdout.write(`${JSON.stringify({
      schemaVersion: 1,
      kind: "livariant-guardian-helper",
      guardianVersion: 1,
      authorityIssuanceSupported: true,
      authorityConsumptionSupported: true,
    })}\n`);
    return;
  }
  if (command === "issue-authority") {
    await issueAuthority(argValue(args, "--request"));
    return;
  }
  if (command === "inspect-authority") {
    await inspectAuthority(parseConsumerArg(args), argValue(args, "--record"));
    return;
  }
  if (command === "consume-authority") {
    await consumeAuthority(parseConsumerArg(args), argValue(args, "--record"), argValue(args, "--material"));
    return;
  }
  throw new Error("Livariant Guardian helper supports only version, issue-authority, inspect-authority, and consume-authority.");
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Guardian helper failure"}\n`);
    process.exitCode = 2;
  });
}
