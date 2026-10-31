#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmod, lstat, mkdir, open, readFile, readdir, realpath, rename, rm, rmdir, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, parse, resolve } from "node:path";
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
const DESKTOP_UAC_CONSENT_KIND = "livariant-guardian-desktop-uac-consent" as const;
const DESKTOP_UAC_CONSENT_MAX_AGE_MS = 2 * 60 * 1000;
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
  | "release-authorization"
  | "lifecycle-mutation";

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

export interface WindowsLifecycleAuthorizationDialogModel {
  language: "de" | "en";
  projectName: string;
  projectRoot: string;
  filesToCreate: string[];
  materialSha256: string;
  authority: "lifecycle-mutation";
}

function requestField(request: ProtectedGuardianRequest, label: string): string {
  const matches = request.materialFields.filter((field) => field.label === label);
  if (matches.length !== 1) throw new Error(`Guardian native lifecycle review requires exactly one '${label}' field.`);
  return matches[0].value;
}

function parseStringArrayField(request: ProtectedGuardianRequest, label: string): string[] {
  let parsed: unknown;
  try { parsed = JSON.parse(requestField(request, label)) as unknown; }
  catch { throw new Error(`Guardian native lifecycle review field '${label}' is not valid JSON.`); }
  if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== "string" || !value || /[\r\n\u0000]/u.test(value))) {
    throw new Error(`Guardian native lifecycle review field '${label}' is invalid.`);
  }
  return parsed;
}

export function buildWindowsLifecycleAuthorizationDialogModel(
  request: ProtectedGuardianRequest,
  materialSha256: string,
  language: "de" | "en",
): WindowsLifecycleAuthorizationDialogModel {
  if (request.consumer !== "lifecycle-mutation" || request.mode !== "one-shot") throw new Error("Guardian native Desktop confirmation is restricted to one-shot lifecycle Authority.");
  if (requestField(request, "lifecycle-operation") !== "initialize") throw new Error("Guardian native Desktop confirmation is restricted to Project Brain initialization.");
  const filesToCreate = parseStringArrayField(request, "files-to-create-json");
  const projectFilesToModify = parseStringArrayField(request, "project-files-to-modify-json");
  if (filesToCreate.length === 0) throw new Error("Guardian native Desktop confirmation requires an explicit initialization write set.");
  if (projectFilesToModify.length !== 0) throw new Error("Guardian native Desktop confirmation refuses initialization that would modify existing project files.");
  return {
    language,
    projectName: requestField(request, "display-project-name"),
    projectRoot: requestField(request, "physical-project-root"),
    filesToCreate,
    materialSha256,
    authority: "lifecycle-mutation",
  };
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
    || value === "release-authorization"
    || value === "lifecycle-mutation";
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

function windowsNativeConfirmationRequested(
  request: ProtectedGuardianRequest,
  language: "de" | "en" | undefined,
): boolean {
  return process.platform === "win32"
    && language !== undefined
    && (
      (request.consumer === "lifecycle-mutation" && request.mode === "one-shot")
      || (request.consumer === "semantic-mutation" && request.mode === "one-shot")
      || (request.consumer === "project-brain-integrity" && request.mode === "persistent")
    );
}

function requireWindowsNativeLifecycleIssuance(
  request: ProtectedGuardianRequest,
  materialSha256: string,
  language: "de" | "en",
): void {
  const model = buildWindowsLifecycleAuthorizationDialogModel(request, materialSha256, language);
  const env = { ...process.env, LIVARIANT_GUARDIAN_DIALOG_PAYLOAD: Buffer.from(JSON.stringify(model), "utf8").toString("base64") };
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "Add-Type -AssemblyName System.Drawing",
    "$json=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:LIVARIANT_GUARDIAN_DIALOG_PAYLOAD))",
    "$m=$json | ConvertFrom-Json",
    "$de=$m.language -eq 'de'",
    "$form=New-Object Windows.Forms.Form",
    "$form.Text=if($de){'Project Brain anlegen'}else{'Create Project Brain'}",
    "$form.StartPosition='CenterScreen'",
    "$form.Size=New-Object Drawing.Size(660,470)",
    "$form.MinimumSize=New-Object Drawing.Size(660,470)",
    "$form.MaximizeBox=$false",
    "$form.MinimizeBox=$false",
    "$form.TopMost=$true",
    "$title=New-Object Windows.Forms.Label",
    "$title.Location=New-Object Drawing.Point(24,20)",
    "$title.Size=New-Object Drawing.Size(600,34)",
    "$title.Font=New-Object Drawing.Font('Segoe UI',15,[Drawing.FontStyle]::Bold)",
    "$title.Text=if($de){'Project Brain für dieses Projekt anlegen?'}else{'Create a Project Brain for this project?'}",
    "$form.Controls.Add($title)",
    "$body=New-Object Windows.Forms.Label",
    "$body.Location=New-Object Drawing.Point(24,64)",
    "$body.Size=New-Object Drawing.Size(600,64)",
    "$body.Font=New-Object Drawing.Font('Segoe UI',9)",
    "$body.Text=if($de){'Livariant möchte den geschützten Project Brain für dieses Projekt anlegen. Bestehende Projektdateien bleiben unverändert.'}else{'Livariant wants to create the protected Project Brain for this project. Existing project files remain unchanged.'}",
    "$form.Controls.Add($body)",
    "$projectLabel=New-Object Windows.Forms.Label",
    "$projectLabel.Location=New-Object Drawing.Point(24,136)",
    "$projectLabel.Size=New-Object Drawing.Size(600,42)",
    "$projectLabel.Font=New-Object Drawing.Font('Segoe UI',9,[Drawing.FontStyle]::Bold)",
    "$projectPrefix=if($de){'Projekt: '}else{'Project: '}",
    "$projectLabel.Text=$projectPrefix + $m.projectName + [Environment]::NewLine + $m.projectRoot",
    "$form.Controls.Add($projectLabel)",
    "$filesTitle=New-Object Windows.Forms.Label",
    "$filesTitle.Location=New-Object Drawing.Point(24,188)",
    "$filesTitle.Size=New-Object Drawing.Size(600,20)",
    "$filesTitle.Text=if($de){'Diese Dateien werden neu angelegt:'}else{'These files will be created:'}",
    "$form.Controls.Add($filesTitle)",
    "$files=New-Object Windows.Forms.TextBox",
    "$files.Location=New-Object Drawing.Point(24,212)",
    "$files.Size=New-Object Drawing.Size(600,92)",
    "$files.Multiline=$true",
    "$files.ReadOnly=$true",
    "$files.ScrollBars='Vertical'",
    "$files.Text=($m.filesToCreate -join [Environment]::NewLine)",
    "$form.Controls.Add($files)",
    "$details=New-Object Windows.Forms.Panel",
    "$details.Location=New-Object Drawing.Point(24,402)",
    "$details.Size=New-Object Drawing.Size(600,96)",
    "$details.Visible=$false",
    "$detailText=New-Object Windows.Forms.TextBox",
    "$detailText.Dock='Fill'",
    "$detailText.Multiline=$true",
    "$detailText.ReadOnly=$true",
    "$detailText.ScrollBars='Vertical'",
    "$detailText.Text=('Authority: lifecycle-mutation' + [Environment]::NewLine + 'Material SHA-256: ' + $m.materialSha256)",
    "$details.Controls.Add($detailText)",
    "$form.Controls.Add($details)",
    "$toggle=New-Object Windows.Forms.Button",
    "$toggle.Location=New-Object Drawing.Point(24,314)",
    "$toggle.Size=New-Object Drawing.Size(150,28)",
    "$toggle.Text=if($de){'Technische Details'}else{'Technical details'}",
    "$toggle.Add_Click({ $details.Visible=-not $details.Visible; if($details.Visible){$form.Height=570}else{$form.Height=470} })",
    "$form.Controls.Add($toggle)",
    "$cancel=New-Object Windows.Forms.Button",
    "$cancel.Location=New-Object Drawing.Point(382,354)",
    "$cancel.Size=New-Object Drawing.Size(110,32)",
    "$cancel.Text=if($de){'Abbrechen'}else{'Cancel'}",
    "$cancel.Add_Click({ [Console]::Write('CANCELLED'); $form.Tag='done'; $form.Close() })",
    "$form.Controls.Add($cancel)",
    "$authorize=New-Object Windows.Forms.Button",
    "$authorize.Location=New-Object Drawing.Point(500,354)",
    "$authorize.Size=New-Object Drawing.Size(124,32)",
    "$authorize.Text=if($de){'Anlegen autorisieren'}else{'Authorize creation'}",
    "$authorize.Add_Click({ [Console]::Write('AUTHORIZED'); $form.Tag='done'; $form.Close() })",
    "$form.Controls.Add($authorize)",
    "$form.AcceptButton=$authorize",
    "$form.CancelButton=$cancel",
    "$form.Add_FormClosing({ if($form.Tag -ne 'done'){ [Console]::Write('CANCELLED') } })",
    "[void]$form.ShowDialog()",
  ].join("; ");
  const result = spawnSync(WINDOWS_POWERSHELL, ["-NoProfile", "-NonInteractive", "-Sta", "-Command", script], { encoding: "utf8", shell: false, windowsHide: true, env });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message || result.stderr || result.stdout || `exit ${String(result.status)}`;
    throw new Error(`Guardian native lifecycle confirmation failed: ${String(detail).trim()}`);
  }
  if (result.stdout.trim() !== "AUTHORIZED") throw new Error("Guardian Authority confirmation was declined.");
}


function requireWindowsNativeSimpleIssuance(
  request: ProtectedGuardianRequest,
  language: "de" | "en",
): void {
  const isSemantic = request.consumer === "semantic-mutation" && request.mode === "one-shot";
  const isIntegrity = request.consumer === "project-brain-integrity" && request.mode === "persistent";
  if (!isSemantic && !isIntegrity) throw new Error("Guardian native confirmation received unsupported Authority.");

  const title = isSemantic
    ? (language === "de" ? "Änderung am Projektwissen bestätigen" : "Confirm project knowledge change")
    : (language === "de" ? "Projektwissen sicher einrichten" : "Secure project knowledge setup");
  const body = isSemantic
    ? (language === "de"
      ? "Du hast die Änderung in Livariant als Vorher/Nachher geprüft. Möchtest du genau diese Änderung übernehmen?"
      : "You reviewed the change in Livariant as Before/After. Apply this exact change?")
    : (language === "de"
      ? "Livariant hat den Project Brain automatisch angelegt. Möchtest du den Schutz für unerwartete Änderungen jetzt einmalig einrichten?"
      : "Livariant created the Project Brain automatically. Set up protection against unexpected changes now?");

  const payload = Buffer.from(JSON.stringify({ title, body, language }), "utf8").toString("base64");
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "Add-Type -AssemblyName System.Drawing",
    "$json=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:LIVARIANT_GUARDIAN_DIALOG_PAYLOAD))",
    "$m=$json | ConvertFrom-Json",
    "$form=New-Object Windows.Forms.Form",
    "$form.Text=$m.title",
    "$form.StartPosition='CenterScreen'",
    "$form.Size=New-Object Drawing.Size(580,260)",
    "$form.MinimumSize=New-Object Drawing.Size(580,260)",
    "$form.MaximizeBox=$false",
    "$form.MinimizeBox=$false",
    "$form.TopMost=$true",
    "$form.ShowInTaskbar=$true",
    "$label=New-Object Windows.Forms.Label",
    "$label.Location=New-Object Drawing.Point(24,24)",
    "$label.Size=New-Object Drawing.Size(520,112)",
    "$label.Font=New-Object Drawing.Font('Segoe UI',10)",
    "$label.Text=$m.body",
    "$form.Controls.Add($label)",
    "$cancel=New-Object Windows.Forms.Button",
    "$cancel.Location=New-Object Drawing.Point(334,164)",
    "$cancel.Size=New-Object Drawing.Size(100,32)",
    "$cancel.Text=if($m.language -eq 'de'){'Abbrechen'}else{'Cancel'}",
    "$cancel.Add_Click({[Console]::Write('CANCELLED');$form.Tag='done';$form.Close()})",
    "$form.Controls.Add($cancel)",
    "$ok=New-Object Windows.Forms.Button",
    "$ok.Location=New-Object Drawing.Point(442,164)",
    "$ok.Size=New-Object Drawing.Size(100,32)",
    "$ok.Text=if($m.language -eq 'de'){'Bestätigen'}else{'Confirm'}",
    "$ok.Add_Click({[Console]::Write('AUTHORIZED');$form.Tag='done';$form.Close()})",
    "$form.Controls.Add($ok)",
    "$form.AcceptButton=$ok",
    "$form.CancelButton=$cancel",
    "$timer=New-Object Windows.Forms.Timer",
    "$timer.Interval=300000",
    "$timer.Add_Tick({$timer.Stop();[Console]::Write('CANCELLED');$form.Tag='done';$form.Close()})",
    "$timer.Start()",
    "$form.Add_Shown({$form.Activate();$form.BringToFront()})",
    "$form.Add_FormClosing({if($form.Tag -ne 'done'){[Console]::Write('CANCELLED')}})",
    "[void]$form.ShowDialog()",
    "$timer.Stop()",
  ].join("; ");
  const result = spawnSync(WINDOWS_POWERSHELL, ["-NoProfile", "-NonInteractive", "-Sta", "-Command", script], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    env: { ...process.env, LIVARIANT_GUARDIAN_DIALOG_PAYLOAD: payload },
    timeout: 5 * 60 * 1000,
  });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message || result.stderr || result.stdout || ("exit " + String(result.status));
    throw new Error("Guardian native confirmation failed: " + String(detail).trim());
  }
  if (result.stdout.trim() !== "AUTHORIZED") throw new Error("Guardian Authority confirmation was declined.");
}

async function requireWindowsDesktopUacConsent(
  request: ProtectedGuardianRequest,
  materialSha256: string,
  receiptPath: string,
): Promise<void> {
  if (process.platform !== "win32"
    || request.consumer !== "project-brain-integrity"
    || request.mode !== "persistent") {
    throw new Error("Guardian Desktop UAC consent is restricted to persistent Project Brain Integrity Authority.");
  }

  const root = await realpath(productionRoot());
  const physicalReceipt = await realpath(receiptPath);
  if (dirname(physicalReceipt).toLowerCase() !== root.toLowerCase()) {
    throw new Error("Guardian Desktop UAC consent receipt must be created directly inside the fixed protected Guardian root.");
  }
  const stats = await lstat(physicalReceipt);
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new Error("Guardian Desktop UAC consent receipt must be a regular protected file.");
  }

  const protection = inspectWindowsInterpreterProtection(physicalReceipt);
  if (!protectedWindowsOwner(protection.ownerSid) || protection.ordinaryRequesterWritable) {
    throw new Error("Guardian Desktop UAC consent receipt is not protected from ordinary requester writes.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(physicalReceipt, "utf8")) as unknown;
  } catch {
    throw new Error("Guardian Desktop UAC consent receipt is invalid JSON.");
  }
  if (!plainObject(parsed)) throw new Error("Guardian Desktop UAC consent receipt is invalid.");
  strictKeys(parsed, ["schemaVersion", "kind", "consumer", "mode", "materialSha256", "issuedAt", "expiresAt"]);
  if (parsed.schemaVersion !== 1
    || parsed.kind !== DESKTOP_UAC_CONSENT_KIND
    || parsed.consumer !== "project-brain-integrity"
    || parsed.mode !== "persistent"
    || parsed.materialSha256 !== materialSha256
    || typeof parsed.issuedAt !== "string"
    || typeof parsed.expiresAt !== "string") {
    throw new Error("Guardian Desktop UAC consent receipt does not match the exact prepared integrity material.");
  }
  const issuedAt = Date.parse(parsed.issuedAt);
  const expiresAt = Date.parse(parsed.expiresAt);
  const now = Date.now();
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)
    || issuedAt > now + 5_000
    || expiresAt <= now
    || expiresAt - issuedAt <= 0
    || expiresAt - issuedAt > DESKTOP_UAC_CONSENT_MAX_AGE_MS) {
    throw new Error("Guardian Desktop UAC consent receipt is expired or has an invalid validity window.");
  }

  await rm(physicalReceipt, { force: false });
}

async function requireInteractiveIssuance(
  request: ProtectedGuardianRequest,
  materialSha256: string,
  nativeConfirmationLanguage?: "de" | "en",
  desktopUacReceiptPath?: string,
): Promise<void> {
  if (desktopUacReceiptPath !== undefined) {
    await requireWindowsDesktopUacConsent(request, materialSha256, desktopUacReceiptPath);
    return;
  }
  if (windowsNativeConfirmationRequested(request, nativeConfirmationLanguage)) {
    const language = nativeConfirmationLanguage!;
    if (request.consumer === "lifecycle-mutation") requireWindowsNativeLifecycleIssuance(request, materialSha256, language);
    else requireWindowsNativeSimpleIssuance(request, language);
    return;
  }
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
  } finally { terminal.close(); }
}

/**
 * Protected Helper-local exclusion (Guardian is bootstrapped as ONE FILE).
 * This is not a durable migration fence or native Windows transaction proof.
 * Leftover locks intentionally block consumption until independently reviewed.
 */
export async function withExclusiveGuardianConsumeLock<T>(
  protectedAuthorityRecordPath: string,
  action: () => Promise<T>,
): Promise<T> {
  const file = basename(protectedAuthorityRecordPath);
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.json$/iu.test(file)) {
    throw new Error("Guardian consumption lock requires an exact protected Authority record filename.");
  }
  const directory = dirname(protectedAuthorityRecordPath);
  const parent = await lstat(directory);
  if (!parent.isDirectory() || parent.isSymbolicLink()) {
    throw new Error("Guardian consumption lock parent must be a real protected directory.");
  }
  const lockPath = resolve(directory, "." + file + ".consume.lock");
  try {
    await mkdir(lockPath, { recursive: false, mode: 0o700 });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error("Guardian consumption transition is already active or interrupted; refusing reuse until protected recovery.");
    }
    throw error;
  }

  try {
    return await action();
  } finally {
    // Never delete an unknown non-directory or chase a substituted link.
    // Failure leaves a visible blocking artifact in the protected namespace.
    await rmdir(lockPath);
  }
}

// Keep this core self-contained: the installed helper is a single trusted file.
// This is a DENY-ONLY persistent quarantine, never an armed migration capability.
export const GUARDIAN_TRANSITION_LOCK = ".guardian-transition.lock";
export const MIGRATION_FENCE_MARKER = "schema-migration-state-v1.json";
export const MIGRATION_FENCE_NAMESPACE = "schema-migration-v1";
const MIGRATION_FENCE_DOMAIN = "livariant:guardian-deny-migration-fence:v1";
const FENCE_FIELDS = ["schemaVersion", "kind", "stableProjectIdentity", "transactionId", "authorizationOperationId", "protectedSourceRecordId", "declaredPhysicalProjectRoot", "declaredPhysicalProjectBrainRoot", "sourceSchemaVersion", "targetSchemaVersion", "sourceBaselineDomain", "sourceBaselineSha256", "sourceProtectedIntegrityMaterialSha256", "proposedTargetDomain", "proposedTargetSha256", "migrationIntentSha256", "phase", "sequence"] as const;
export interface DeniedMigrationFence extends Record<string, string | number> {
  schemaVersion: 1;
  kind: "livariant-guardian-schema-migration-fence";
  stableProjectIdentity: string;
  transactionId: string;
  authorizationOperationId: string;
  protectedSourceRecordId: string;
  declaredPhysicalProjectRoot: string;
  declaredPhysicalProjectBrainRoot: string;
  sourceProtectedIntegrityMaterialSha256: string;
  phase: "recovery-required";
  sequence: 1;
}
function normalizedFencePath(path: string): string {
  return process.platform === "win32" ? resolve(path).toLowerCase() : resolve(path);
}
export function parseDeniedMigrationFence(value: unknown): DeniedMigrationFence {
  if (!plainObject(value)) throw new Error("Migration fence must be a plain object.");
  strictKeys(value, [...FENCE_FIELDS]);
  if (value.schemaVersion !== 1 || value.kind !== "livariant-guardian-schema-migration-fence"
    || value.sourceSchemaVersion !== 2 || value.targetSchemaVersion !== 3
    || value.sourceBaselineDomain !== "livariant:project-context-baseline:v1"
    || value.proposedTargetDomain !== "livariant:proposed-project-brain-v3-target:v1"
    || value.phase !== "recovery-required" || value.sequence !== 1) {
    throw new Error("Only an initial deny-only recovery-required fence is supported; arming, completion and clearing remain disabled.");
  }
  for (const key of ["stableProjectIdentity", "transactionId", "authorizationOperationId", "protectedSourceRecordId"]) {
    if (!validRecordId(value[key]) || value[key] !== (value[key] as string).toLowerCase()) throw new Error("Migration fence identity is invalid: " + key);
  }
  if (new Set([value.transactionId, value.authorizationOperationId, value.protectedSourceRecordId]).size !== 3) throw new Error("Migration operation identities must differ.");
  for (const key of ["sourceBaselineSha256", "sourceProtectedIntegrityMaterialSha256", "proposedTargetSha256", "migrationIntentSha256"]) {
    if (!validSha256(value[key])) throw new Error("Migration fence digest is invalid: " + key);
  }
  for (const key of ["declaredPhysicalProjectRoot", "declaredPhysicalProjectBrainRoot"]) {
    const path = value[key];
    if (typeof path !== "string" || !isAbsolute(path) || resolve(path) !== path || /[\x00-\x1f]/u.test(path)) throw new Error("Migration physical path is invalid.");
  }
  if (normalizedFencePath(value.declaredPhysicalProjectBrainRoot as string) !== normalizedFencePath(resolve(value.declaredPhysicalProjectRoot as string, ".project-brain"))) throw new Error("Migration Brain path does not belong to project.");
  return Object.fromEntries(FENCE_FIELDS.map(key => [key, value[key]])) as DeniedMigrationFence;
}
function fenceHash(value: unknown): string {
  return createHash("sha256").update(MIGRATION_FENCE_DOMAIN + "\n" + JSON.stringify(value)).digest("hex");
}
async function fencePathIdentity(path: string, directory: boolean): Promise<string> {
  const absolute = resolve(path);
  let current = absolute;
  for (;;) {
    const stat = await lstat(current);
    const physical = await realpath(current);
    if (stat.isSymbolicLink() || normalizedFencePath(physical) !== normalizedFencePath(current)) {
      throw new Error("Migration path contains an alias, junction or symbolic link: " + current + " -> " + physical);
    }
    if (current === absolute && (directory ? !stat.isDirectory() : !stat.isFile())) throw new Error("Migration entry has an invalid file type.");
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  const stat = await lstat(absolute);
  return [stat.dev, stat.ino, stat.birthtimeMs].join(":");
}
async function fenceExists(path: string): Promise<boolean> {
  try { await lstat(path); return true; } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
async function syncFenceDirectory(path: string): Promise<void> {
  // Windows directory/rename power-loss guarantees are NOT established here.
  // Therefore this implementation never permits productive migration arming.
  if (process.platform !== "linux") return;
  const handle = await open(path, "r");
  try { await handle.sync(); } finally { await handle.close(); }
}
async function writeFenceExclusive(path: string, value: unknown): Promise<void> {
  const parentIdentity = await fencePathIdentity(dirname(path), true);
  const handle = await open(path, "wx", 0o644);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.nlink !== 1) throw new Error("Migration journal handle is not an exclusive regular file.");
    await handle.writeFile(JSON.stringify(value) + "\n", "utf8");
    await handle.sync();
    const named = await lstat(path);
    if (named.dev !== stat.dev || named.ino !== stat.ino || named.isSymbolicLink()) throw new Error("Migration file handle was substituted.");
  } finally { await handle.close(); }
  if (await fencePathIdentity(dirname(path), true) !== parentIdentity) throw new Error("Migration parent directory changed during write.");
  await syncFenceDirectory(dirname(path));
}
interface FenceInventoryEntry { sequence: number; previousSha256: string; transactionId: string; bindingSha256: string; journalSha256: string; eventSha256: string }
async function readFenceInventory(path: string): Promise<FenceInventoryEntry[]> {
  await fencePathIdentity(path, false);
  const handle = await open(path, "r");
  let raw: string;
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.nlink !== 1 || stat.size > 512 * 1024 || stat.size === 0) throw new Error("Migration inventory handle/size is unsafe.");
    raw = await handle.readFile("utf8");
    const named = await lstat(path);
    if (named.dev !== stat.dev || named.ino !== stat.ino || named.isSymbolicLink()) throw new Error("Migration inventory handle was substituted.");
  } finally { await handle.close(); }
  if (!raw.endsWith("\n")) throw new Error("Migration inventory has a truncated tail.");
  const lines = raw.slice(0, -1).split("\n");
  if (lines.length < 2 || lines.length > 513) throw new Error("Migration inventory is empty or unbounded.");
  const header: unknown = JSON.parse(lines[0]);
  if (!plainObject(header)) throw new Error("Migration inventory header is invalid.");
  strictKeys(header, ["schemaVersion", "kind", "domain"]);
  if (header.schemaVersion !== 1 || header.kind !== "livariant-guardian-migration-fence-activation" || header.domain !== MIGRATION_FENCE_DOMAIN) throw new Error("Migration activation marker is invalid.");
  const entries: FenceInventoryEntry[] = [];
  const ids = new Set<string>();
  let previous = "0".repeat(64);
  for (const line of lines.slice(1)) {
    const entry: unknown = JSON.parse(line);
    if (!plainObject(entry)) throw new Error("Migration inventory event is invalid.");
    strictKeys(entry, ["sequence", "previousSha256", "transactionId", "bindingSha256", "journalSha256", "eventSha256"]);
    const payload = { sequence: entries.length + 1, previousSha256: previous, transactionId: entry.transactionId, bindingSha256: entry.bindingSha256, journalSha256: entry.journalSha256 };
    if (!validRecordId(entry.transactionId) || ids.has(entry.transactionId) || !validSha256(entry.bindingSha256) || !validSha256(entry.journalSha256)
      || entry.sequence !== payload.sequence || entry.previousSha256 !== previous || entry.eventSha256 !== fenceHash(payload)) throw new Error("Migration inventory chain is corrupt, duplicated or conflicting.");
    ids.add(entry.transactionId);
    previous = entry.eventSha256 as string;
    entries.push(entry as unknown as FenceInventoryEntry);
  }
  return entries;
}
async function validateFenceSource(records: string, binding: DeniedMigrationFence): Promise<void> {
  const metadata = await readFenceJSON(resolve(binding.declaredPhysicalProjectBrainRoot, "metadata.json"), false);
  if (!plainObject(metadata.projectBrain) || metadata.projectBrain.schemaVersion !== 2 || metadata.projectBrain.projectId !== binding.stableProjectIdentity) throw new Error("Migration declared project identity does not match canonical schema-2 metadata.");
  const names = ["decisions.md", "goals.md", "knowledge.md", "metadata.json", "project.md"];
  const inputs = new Map<string, Buffer>();
  for (const name of names) {
    const path = resolve(binding.declaredPhysicalProjectBrainRoot, name);
    await fencePathIdentity(path, false);
    const handle = await open(path, "r");
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.nlink !== 1 || stat.size > 16 * 1024 * 1024) throw new Error("Migration source handle/size is unsafe.");
      inputs.set(name, await handle.readFile());
      const named = await lstat(path);
      if (named.dev !== stat.dev || named.ino !== stat.ino || named.isSymbolicLink()) throw new Error("Migration source handle changed.");
    } finally { await handle.close(); }
  }
  function bytesFrame(hash: ReturnType<typeof createHash>, label: string, bytes: Buffer): void {
    const labels = Buffer.from(label);
    const lengths = Buffer.alloc(8);
    lengths.writeUInt32BE(labels.length, 0); lengths.writeUInt32BE(bytes.length, 4);
    hash.update(lengths).update(labels).update(bytes);
  }
  const contextHash = createHash("sha256");
  bytesFrame(contextHash, "domain", Buffer.from("livariant:project-context-baseline:v1"));
  bytesFrame(contextHash, "schema-version", Buffer.from("2"));
  for (const name of names) bytesFrame(contextHash, "managed:" + name, inputs.get(name)!);
  if (contextHash.digest("hex") !== binding.sourceBaselineSha256) throw new Error("Migration source bytes no longer match the exact declared baseline.");
  const integrityHash = createHash("sha256");
  bytesFrame(integrityHash, "domain", Buffer.from("livariant:project-brain-integrity-material:v1"));
  bytesFrame(integrityHash, "schema-version", Buffer.from("2"));
  bytesFrame(integrityHash, "stable-project-identity", Buffer.from(binding.stableProjectIdentity));
  for (const name of ["project.md", "goals.md", "decisions.md", "knowledge.md"]) bytesFrame(integrityHash, "managed:" + name, inputs.get(name)!);
  const expectedMaterial = protectedGuardianMaterialDigest("project-brain-integrity", [
    { label: "stable-project-identity", value: binding.stableProjectIdentity },
    { label: "physical-project-root", value: normalizedFencePath(binding.declaredPhysicalProjectRoot) },
    { label: "physical-project-brain-root", value: normalizedFencePath(binding.declaredPhysicalProjectBrainRoot) },
    { label: "integrity-schema-version", value: "1" },
    { label: "baseline-schema-version", value: "2" },
    { label: "baseline-domain", value: "livariant:project-brain-integrity-material:v1" },
    { label: "baseline-algorithm", value: "sha256" },
    { label: "baseline-sha256", value: integrityHash.digest("hex") },
  ]);
  const source = (await readRecord(records, "project-brain-integrity", binding.protectedSourceRecordId)).record;
  if (source.consumer !== "project-brain-integrity" || source.mode !== "persistent" || source.state !== "active" || source.materialSha256 !== expectedMaterial || expectedMaterial !== binding.sourceProtectedIntegrityMaterialSha256) throw new Error("Migration source does not match independently protected project/path-bound integrity Authority.");
}
async function appendFenceInventory(path: string, binding: DeniedMigrationFence, journalSha256: string): Promise<void> {
  const existing = await readFile(path, "utf8");
  const inventory = existing.trim().includes("\n") ? await readFenceInventory(path) : [];
  if (inventory.length >= 512 || inventory.some(entry => entry.transactionId === binding.transactionId)) throw new Error("Migration inventory cannot duplicate an existing transaction.");
  const payload = { sequence: inventory.length + 1, previousSha256: inventory.at(-1)?.eventSha256 ?? "0".repeat(64), transactionId: binding.transactionId, bindingSha256: fenceHash(binding), journalSha256 };
  const identity = await fencePathIdentity(path, false);
  const handle = await open(path, "a");
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.nlink !== 1 || await fencePathIdentity(path, false) !== identity) throw new Error("Migration inventory append handle is unsafe.");
    await handle.writeFile(JSON.stringify({ ...payload, eventSha256: fenceHash(payload) }) + "\n", "utf8");
    await handle.sync();
    if (await fencePathIdentity(path, false) !== identity) throw new Error("Migration inventory changed during append.");
  } finally { await handle.close(); }
}
/** Shared by fence creation AND legacy protected issuance/consumption. A failed
 * transition leaves its lock permanently; no PID, age or timeout clears it. */
class GuardianPrewriteRejection extends Error {}
export interface GuardianTransitionGuard {
  markMutationStarted(): void;
  rejectBeforeMutation(reason: unknown): never;
}
export async function withExclusiveGuardianTransitionLock<T>(records: string, action: (guard: GuardianTransitionGuard) => Promise<T>): Promise<T> {
  const parentIdentity = await fencePathIdentity(records, true);
  const lock = resolve(records, GUARDIAN_TRANSITION_LOCK);
  try { await mkdir(lock, { mode: 0o700 }); } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "EEXIST") throw new Error("Guardian global transition is active or interrupted; protected recovery required.");
    throw error;
  }
  const lockIdentity = await fencePathIdentity(lock, true);
  await syncFenceDirectory(records);
  let mutationStarted = false;
  const guard: GuardianTransitionGuard = {
    markMutationStarted() { mutationStarted = true; },
    rejectBeforeMutation(reason: unknown): never {
      const message = reason instanceof Error ? reason.message : String(reason);
      if (mutationStarted) throw new Error("Guardian transition changed protected state before rejection; recovery required: " + message);
      throw new GuardianPrewriteRejection(message);
    },
  };
  async function releaseOwnedLock(): Promise<void> {
    if (await fencePathIdentity(records, true) !== parentIdentity || await fencePathIdentity(lock, true) !== lockIdentity) throw new Error("Guardian transition lock was substituted; recovery required.");
    await rmdir(lock);
    await syncFenceDirectory(records);
  }
  try {
    const result = await action(guard);
    await releaseOwnedLock();
    return result;
  } catch (error) {
    // ONLY explicit, known pre-write validation denial may release this live
    // process's verified lock. Unknown failures and killed processes retain it.
    if (error instanceof GuardianPrewriteRejection && !mutationStarted) await releaseOwnedLock();
    throw error;
  }
}
async function readFenceJSON(path: string, singleLine = true): Promise<Record<string, unknown>> {
  await fencePathIdentity(path, false);
  const handle = await open(path, "r");
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.nlink !== 1 || stat.size < 2 || stat.size > 65536) throw new Error("Migration record handle/size is unsafe.");
    const bytes = await handle.readFile("utf8");
    if (singleLine && (!bytes.endsWith("\n") || bytes.slice(0, -1).includes("\n"))) throw new Error("Migration journal is truncated or has unsupported events.");
    const named = await lstat(path);
    if (named.dev !== stat.dev || named.ino !== stat.ino || named.isSymbolicLink()) throw new Error("Migration read handle was substituted.");
    const parsed: unknown = JSON.parse(bytes);
    if (!plainObject(parsed)) throw new Error("Migration record is not an object.");
    return parsed;
  } finally { await handle.close(); }
}
/** Caller must independently verify the fixed Guardian root and ACL/owner.
 * Returned records are deny-only, not Authority, migration or read permission. */
export async function inspectGuardianMigrationFenceStorage(records: string, withinTransition = false): Promise<{ activated: boolean; transactions: DeniedMigrationFence[] }> {
  await fencePathIdentity(records, true);
  const parentIdentity = await fencePathIdentity(records, true);
  if (!withinTransition && await fenceExists(resolve(records, GUARDIAN_TRANSITION_LOCK))) throw new Error("Guardian transition is active/interrupted; migration state cannot be accepted.");
  const names = await readdir(records);
  if (names.length > 4096) throw new Error("Guardian record namespace is unbounded.");
  if (names.includes("schema-migration")) {
    const legacy = resolve(records, "schema-migration");
    await fencePathIdentity(legacy, true);
    if ((await readdir(legacy)).length !== 0) throw new Error("Legacy protected migration evidence requires recovery.");
  }
  const markerPresent = names.includes(MIGRATION_FENCE_MARKER);
  const namespacePresent = names.includes(MIGRATION_FENCE_NAMESPACE);
  const anchorNames = names.filter(name => name.startsWith(".schema-migration-v1."));
  if (names.some(name => /^(?:schema-migration-state-v1|schema-migration-v1|\.schema-migration-v1\.)/iu.test(name)
    && name !== MIGRATION_FENCE_MARKER && name !== MIGRATION_FENCE_NAMESPACE && !anchorNames.includes(name))) throw new Error("Migration namespace alias or unexpected entry.");
  if (!markerPresent && !namespacePresent && anchorNames.length === 0) return { activated: false, transactions: [] };
  if (!markerPresent || !namespacePresent || anchorNames.length === 0) throw new Error("Sticky migration state, anchor or journal namespace is missing; recovery required.");
  const inventory = await readFenceInventory(resolve(records, MIGRATION_FENCE_MARKER));
  const directory = resolve(records, MIGRATION_FENCE_NAMESPACE);
  await fencePathIdentity(directory, true);
  const journalNames = await readdir(directory);
  if (anchorNames.length > 512 || journalNames.length !== anchorNames.length || anchorNames.length !== inventory.length) throw new Error("Migration inventory, journals and permanent anchors disagree.");
  const transactions: DeniedMigrationFence[] = [];
  for (const name of anchorNames) {
    const match = /^\.schema-migration-v1\.([a-f0-9-]+)\.anchor\.json$/u.exec(name);
    if (!match || !validRecordId(match[1])) throw new Error("Invalid migration anchor filename.");
    const anchor = await readFenceJSON(resolve(records, name));
    strictKeys(anchor, ["schemaVersion", "kind", "binding", "bindingSha256", "journalSha256"]);
    const binding = parseDeniedMigrationFence(anchor.binding);
    const inventoryEntry = inventory.find(entry => entry.transactionId === binding.transactionId);
    if (!inventoryEntry || inventoryEntry.bindingSha256 !== fenceHash(binding) || inventoryEntry.journalSha256 !== anchor.journalSha256) throw new Error("Migration write-ahead inventory does not match anchor.");
    if (anchor.schemaVersion !== 1 || anchor.kind !== "livariant-guardian-migration-fence-anchor" || binding.transactionId !== match[1] || anchor.bindingSha256 !== fenceHash(binding)) throw new Error("Migration anchor binding is invalid.");
    const journalName = binding.transactionId + ".jsonl";
    if (!journalNames.includes(journalName)) throw new Error("Migration journal was lost.");
    const event = await readFenceJSON(resolve(directory, journalName));
    strictKeys(event, ["schemaVersion", "kind", "sequence", "previousSha256", "binding", "eventSha256"]);
    const payload = { schemaVersion: 1, kind: "livariant-guardian-migration-fence-event", sequence: 1, previousSha256: "0".repeat(64), binding };
    if (event.schemaVersion !== 1 || event.kind !== payload.kind || event.sequence !== 1 || event.previousSha256 !== payload.previousSha256 || fenceHash(parseDeniedMigrationFence(event.binding)) !== fenceHash(binding)
      || event.eventSha256 !== fenceHash(payload) || anchor.journalSha256 !== event.eventSha256) throw new Error("Migration journal chain or anchored event hash is corrupt.");
    transactions.push(binding);
  }
  if (await fencePathIdentity(records, true) !== parentIdentity || (!withinTransition && await fenceExists(resolve(records, GUARDIAN_TRANSITION_LOCK)))) throw new Error("Migration storage changed while inspected.");
  return { activated: true, transactions };
}
/** Match only scope cryptographically bound into the exact protected material.
 * Legacy clients without that material remain denied while any fence is active.
 * A caller inside the global writer lock passes withinTransition=true. */
export async function assertGuardianRequestNotMigrationFenced(
  records: string,
  input: unknown,
  expectedMaterialSha256?: string,
  withinTransition = false,
): Promise<void> {
  const request = parseProtectedGuardianRequest(input);
  const digest = protectedGuardianMaterialDigest(request.consumer, request.materialFields);
  if (expectedMaterialSha256 !== undefined && digest !== expectedMaterialSha256) throw new Error("Guardian request scope does not match exact protected Authority material.");
  const state = await inspectGuardianMigrationFenceStorage(records, withinTransition);
  if (!state.activated) return;
  const root = requestField(request, "physical-project-root");
  const id = request.materialFields.find(field => field.label === "stable-project-identity")?.value;
  const requiresIdentity = request.consumer === "semantic-mutation" || request.consumer === "project-brain-integrity";
  if ((requiresIdentity && id === undefined) || (id !== undefined && !validRecordId(id))
    || typeof root !== "string" || !isAbsolute(root) || resolve(root) !== root || /[\x00-\x1f]/u.test(root)) {
    throw new Error("Guardian request lacks exact project scope while migration quarantine exists.");
  }
  // Lifecycle/runtime/release contracts bind physical root without a stable ID.
  // Do not invent a new field or change their existing exact material digests.
  await fencePathIdentity(root, true);
  if (state.transactions.some(record => (id !== undefined && record.stableProjectIdentity === id.toLowerCase())
    || normalizedFencePath(record.declaredPhysicalProjectRoot) === normalizedFencePath(root))) {
    throw new Error("Protected migration quarantine blocks this exact Guardian project scope; recovery required.");
  }
}
export async function createDeniedGuardianMigrationFence(records: string, input: unknown, options: { checkpoint?: (name: string) => Promise<void> } = {}): Promise<DeniedMigrationFence> {
  const binding = parseDeniedMigrationFence(input);
  return withExclusiveGuardianTransitionLock(records, async guard => {
    await options.checkpoint?.("lock-acquired");
    const existing = await inspectGuardianMigrationFenceStorage(records, true);
    if (existing.transactions.some(record => record.transactionId === binding.transactionId)) guard.rejectBeforeMutation(new Error("Protected migration transaction already exists; refusing duplicate denial."));
    let projectIdentity!: string;
    let brainIdentity!: string;
    try {
      projectIdentity = await fencePathIdentity(binding.declaredPhysicalProjectRoot, true);
      brainIdentity = await fencePathIdentity(binding.declaredPhysicalProjectBrainRoot, true);
      await validateFenceSource(records, binding);
    } catch (error) { guard.rejectBeforeMutation(error); }
    await options.checkpoint?.("source-validated");
    guard.markMutationStarted();
    const markerPath = resolve(records, MIGRATION_FENCE_MARKER);
    if (!await fenceExists(markerPath)) await writeFenceExclusive(markerPath, { schemaVersion: 1, kind: "livariant-guardian-migration-fence-activation", domain: MIGRATION_FENCE_DOMAIN });
    const payload = { schemaVersion: 1, kind: "livariant-guardian-migration-fence-event", sequence: 1, previousSha256: "0".repeat(64), binding };
    const eventSha256 = fenceHash(payload);
    await appendFenceInventory(markerPath, binding, eventSha256);
    await options.checkpoint?.("activation-synced");
    const directory = resolve(records, MIGRATION_FENCE_NAMESPACE);
    if (!await fenceExists(directory)) { await mkdir(directory, { mode: 0o755 }); await syncFenceDirectory(records); }
    await fencePathIdentity(directory, true);
    await writeFenceExclusive(resolve(records, ".schema-migration-v1." + binding.transactionId + ".anchor.json"), { schemaVersion: 1, kind: "livariant-guardian-migration-fence-anchor", binding, bindingSha256: fenceHash(binding), journalSha256: eventSha256 });
    await options.checkpoint?.("anchor-synced");
    await writeFenceExclusive(resolve(directory, binding.transactionId + ".jsonl"), { ...payload, eventSha256 });
    await options.checkpoint?.("journal-synced");
    if (await fencePathIdentity(binding.declaredPhysicalProjectRoot, true) !== projectIdentity || await fencePathIdentity(binding.declaredPhysicalProjectBrainRoot, true) !== brainIdentity) throw new Error("Migration physical project changed during quarantine.");
    await validateFenceSource(records, binding);
    await inspectGuardianMigrationFenceStorage(records, true);
    await options.checkpoint?.("verified-before-unlock");
    return binding;
  });
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

async function issueAuthority(
  requestPath: string,
  nativeConfirmationLanguage?: "de" | "en",
  desktopUacReceiptPath?: string,
): Promise<void> {
  const { records } = await assertProtectedSelf();
  requirePrivilegedProcess();
  await assertProtectedInterpreter();
  const request = parseProtectedGuardianRequest(JSON.parse(await readFile(requestPath, "utf8")) as unknown);
  const materialSha256 = protectedGuardianMaterialDigest(request.consumer, request.materialFields);
  // Avoid presenting an authorization dialogue for an already quarantined
  // store. This preflight is not a lease; repeat under the writer lock below.
  await assertGuardianRequestNotMigrationFenced(records, request);
  await requireInteractiveIssuance(request, materialSha256, nativeConfirmationLanguage, desktopUacReceiptPath);
  await withExclusiveGuardianTransitionLock(records, async guard => {
  // All legacy transitions synchronize with deny-fence creation. Since old
  // clients do not implement this protocol, productive arming stays disabled.
  try { await assertGuardianRequestNotMigrationFenced(records, request, materialSha256, true); }
  catch (error) { guard.rejectBeforeMutation(error); }
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
  guard.markMutationStarted();
  const directory = await ensureConsumerDirectory(records, request.consumer);
  const path = resolve(directory, `${record.recordId}.json`);
  await writeFile(path, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o444 });
  if (process.platform === "linux") await chmod(path, 0o444);
  process.stdout.write(`${JSON.stringify({ schemaVersion: 1, state: "issued", authority: record })}\n`);
  });
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
  const fence = await inspectGuardianMigrationFenceStorage(records);
  const { record } = await readRecord(records, consumer, recordId);
  const rechecked = await inspectGuardianMigrationFenceStorage(records);
  if (JSON.stringify(rechecked) !== JSON.stringify(fence)) throw new Error("Guardian migration state changed during inspection.");
  process.stdout.write(`${JSON.stringify({ schemaVersion: 1, state: "inspected", authority: record })}\n`);
}

async function consumeAuthority(consumer: ProtectedGuardianConsumer, recordId: string, expectedMaterialSha256: string, requestPath?: string): Promise<void> {
  const { records } = await assertProtectedSelf();
  requirePrivilegedProcess();
  await assertProtectedInterpreter();
  if (!validSha256(expectedMaterialSha256)) throw new Error("Guardian Authority expected material digest is invalid.");
  const request = requestPath === undefined ? undefined : parseProtectedGuardianRequest(JSON.parse(await readFile(requestPath, "utf8")) as unknown);
  if (request && (request.consumer !== consumer || request.mode !== "one-shot"
    || protectedGuardianMaterialDigest(request.consumer, request.materialFields) !== expectedMaterialSha256)) {
    throw new Error("Guardian consumption request does not match exact consumer, mode and material.");
  }

  // A protected per-record exclusive directory serializes independent helpers.
  // Read/revalidate the active capability INSIDE the lock, not before it.
  // Crash remnants intentionally refuse automatic retries. These guards do
  // NOT establish full Windows power-loss durability or schema-3 Authority.
  const selectedRecordPath = recordPath(records, consumer, recordId);
  await withExclusiveGuardianTransitionLock(records, async guard => {
  if (request) {
    try { await assertGuardianRequestNotMigrationFenced(records, request, expectedMaterialSha256, true); }
    catch (error) { guard.rejectBeforeMutation(error); }
  } else if ((await inspectGuardianMigrationFenceStorage(records, true)).activated) {
    guard.rejectBeforeMutation(new Error("Protected migration quarantine requires exact request material; unscoped legacy consumption is blocked."));
  }
  await withExclusiveGuardianConsumeLock(selectedRecordPath, async () => {
    let current!: Awaited<ReturnType<typeof readRecord>>;
    try {
      current = await readRecord(records, consumer, recordId);
      if (current.record.mode !== "one-shot") throw new Error("Persistent Guardian Authority cannot be consumed as a one-shot capability.");
      if (current.record.state !== "active") throw new Error("Guardian Authority capability has already been consumed.");
      if (current.record.materialSha256 !== expectedMaterialSha256) throw new Error("Guardian Authority capability does not match the exact requested material.");
      if (current.record.expiresAt === undefined || Date.parse(current.record.expiresAt) <= Date.now()) throw new Error("Guardian Authority capability is expired and cannot be consumed.");
    } catch (error) { guard.rejectBeforeMutation(error); }
    const { path, raw, record } = current;
    const consumedAt = new Date();
    if (record.expiresAt === undefined || Date.parse(record.expiresAt) <= consumedAt.getTime()) guard.rejectBeforeMutation(new Error("Guardian Authority capability is expired and cannot be consumed."));
    const consumed: ProtectedGuardianAuthorityRecord = { ...record, state: "consumed", consumedAt: consumedAt.toISOString() };
    const temporary = resolve(dirname(path), "." + record.recordId + ".consume-" + randomUUID() + ".tmp");

    // Flush file contents before promotion. Directory/rename crash durability
    // on Windows remains an explicit native-adapter acceptance gate.
    guard.markMutationStarted();
    const tempFile = await open(temporary, "wx", 0o444);
    try {
      await tempFile.writeFile(JSON.stringify(consumed, null, 2) + "\n", "utf8");
      await tempFile.sync();
    } catch (error) {
      await tempFile.close();
      await rm(temporary, { force: true });
      throw error;
    }
    await tempFile.close();
    if (process.platform === "linux") await chmod(temporary, 0o444);
    try {
      const observed = await readFile(path, "utf8");
      if (observed !== raw) throw new Error("Guardian Authority capability changed concurrently; refusing ambiguous consumption.");
      await rename(temporary, path);
    } catch (error) {
      await rm(temporary, { force: true });
      throw error;
    }
    // A process interrupted after promotion but before the response can leave
    // a consumed record; nobody may assume the call is safe to repeat.
    process.stdout.write(JSON.stringify({ schemaVersion: 1, state: "consumed", authority: consumed }) + "\n");
  });
  });
}

async function assertMigrationProtectedOwner(path: string): Promise<void> {
  const stat = await lstat(path);
  if (stat.isSymbolicLink()) throw new Error("Guardian migration protected path is a reparse/symbolic entry.");
  if (process.platform === "linux") {
    if (stat.uid !== 0 || (stat.mode & 0o022) !== 0) throw new Error("Guardian migration path must be root-owned and not ordinary-user writable.");
  } else if (process.platform === "win32") {
    const protection = inspectWindowsInterpreterProtection(path);
    if (!protectedWindowsOwner(protection.ownerSid) || protection.ordinaryRequesterWritable || protection.ordinaryRequesterCanReplaceChildren) throw new Error("Guardian migration path ACL/owner is not independently protected.");
  } else throw new Error("Guardian migration protection platform is unsupported.");
}

async function denyMigrationFence(requestPath: string): Promise<void> {
  const { root, records } = await assertProtectedSelf();
  requirePrivilegedProcess();
  await assertProtectedInterpreter();
  await assertMigrationProtectedOwner(root);
  await assertMigrationProtectedOwner(records);
  const request = parseDeniedMigrationFence(await readFenceJSON(resolve(requestPath), false));
  await assertMigrationProtectedOwner(resolve(records, "project-brain-integrity"));
  await assertMigrationProtectedOwner(recordPath(records, "project-brain-integrity", request.protectedSourceRecordId));
  const binding = await createDeniedGuardianMigrationFence(records, request);
  process.stdout.write(JSON.stringify({ schemaVersion: 1, state: "recovery-required", binding, armed: false, migrationAuthorityIssued: false, canonicalWritesPerformed: false, nativeWindowsDurabilityProven: false, oldClientQuiescenceProven: false }) + "\n");
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

function optionalArgValue(args: string[], name: string): string | undefined {
  const indexes = args.map((value, index) => value === name ? index : -1).filter((index) => index >= 0);
  if (indexes.length === 0) return undefined;
  if (indexes.length !== 1) throw new Error(`Guardian helper argument ${name} is duplicated.`);
  const index = indexes[0];
  if (index + 1 >= args.length || !args[index + 1]) throw new Error(`Guardian helper requires ${name} <value>.`);
  return args[index + 1];
}

function parseDesktopUacReceipt(args: string[]): string | undefined {
  return optionalArgValue(args, "--desktop-uac-receipt");
}

function parseNativeConfirmationLanguage(args: string[]): "de" | "en" | undefined {
  const value = optionalArgValue(args, "--native-confirmation-language");
  if (value === undefined || value === "de" || value === "en") return value;
  throw new Error("Guardian native confirmation language is invalid.");
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
    await issueAuthority(
      argValue(args, "--request"),
      parseNativeConfirmationLanguage(args),
      parseDesktopUacReceipt(args),
    );
    return;
  }
  if (command === "deny-migration-fence" && args.length === 3 && args[1] === "--request") {
    await denyMigrationFence(argValue(args, "--request"));
    return;
  }
  if (command === "arm-migration-fence" || command === "complete-migration-fence" || command === "clear-migration-fence") {
    throw new Error("Productive migration arming, completion and clearing remain disabled: native Windows durability and old-client quiescence are unproven.");
  }
  if (command === "inspect-authority") {
    await inspectAuthority(parseConsumerArg(args), argValue(args, "--record"));
    return;
  }
  if (command === "consume-authority") {
    await consumeAuthority(parseConsumerArg(args), argValue(args, "--record"), argValue(args, "--material"), optionalArgValue(args, "--request"));
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
