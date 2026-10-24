import { createHash, randomUUID } from "node:crypto";
import { link, lstat, mkdir, open, readFile, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { isStableProjectIdentity } from "../project-brain/identity.js";

export const LIL_EVENT_SCHEMA_VERSION = 1 as const;
export type LILEventKind =
  | "provider-observed" | "context-prepared" | "knowledge-candidate"
  | "decision-proposed" | "authorization-observed" | "verification-observed"
  | "runtime-degraded" | "runtime-recovered" | "task-transition";
export type LILTaskState = "queued" | "analyzing" | "proposal-ready" | "awaiting-approval" | "blocked" | "completed";

export interface LILEvent {
  schemaVersion: 1;
  eventId: string;
  projectId: string;
  occurredAt: string;
  kind: LILEventKind;
  severity: "info" | "warning" | "error" | "critical";
  actor: { kind: "runtime" | "provider" | "user"; id: string };
  correlationId?: string;
  causationEventId?: string;
  taskId?: string;
  evidenceRefs?: string[];
  transition?: { version: number; from: LILTaskState | null; to: LILTaskState };
}

export interface LILActivitySnapshot {
  projectId: string;
  events: LILEvent[];
  incompleteWrites: number;
}

// Local same-principal storage is *observational evidence only*, not Guardian Authority.
// The digest detects accidental corruption; it is not a tamper-proof signature.
const EVENT_KINDS: readonly string[] = [
  "provider-observed", "context-prepared", "knowledge-candidate",
  "decision-proposed", "authorization-observed", "verification-observed",
  "runtime-degraded", "runtime-recovered", "task-transition",
];
const TASK_STATES: readonly string[] = ["queued", "analyzing", "proposal-ready", "awaiting-approval", "blocked", "completed"];
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,119}$/;
const COMMITTED_FILE = /^[a-f0-9]{64}\.json$/;
const PENDING_FILE = /^\.pending-[0-9a-f-]{36}$/;
const MAX_RECORD_BYTES = 16 * 1024;
const MAX_SCAN_ENTRIES = 50000;

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(label + " must be an object.");
  }
  return value as Record<string, unknown>;
}
function onlyKeys(value: Record<string, unknown>, keys: readonly string[], label: string): void {
  const permitted = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!permitted.has(key)) throw new Error(label + " contains unsupported field " + key + ".");
  }
}
function ref(value: unknown, label: string): string {
  if (typeof value !== "string" || !SAFE_REF.test(value)) {
    throw new Error(label + " must be a bounded opaque reference, not raw content.");
  }
  return value;
}
function optionalRef(value: unknown, label: string): string | undefined {
  return value === undefined ? undefined : ref(value, label);
}
function taskState(value: unknown, label: string): LILTaskState {
  if (typeof value !== "string" || !TASK_STATES.includes(value)) throw new Error(label + " is unsupported.");
  return value as LILTaskState;
}
function canonicalTime(value: unknown): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))
      || new Date(value).toISOString() !== value) {
    throw new Error("LIL event timestamp must be canonical UTC ISO-8601.");
  }
  return value;
}

export function validateLILEvent(value: unknown): LILEvent {
  const event = record(value, "LIL event");
  onlyKeys(event, [
    "schemaVersion", "eventId", "projectId", "occurredAt", "kind",
    "severity", "actor", "correlationId", "causationEventId", "taskId",
    "evidenceRefs", "transition",
  ], "LIL event");
  if (event.schemaVersion !== LIL_EVENT_SCHEMA_VERSION) throw new Error("Unsupported LIL event schema.");
  const eventId = ref(event.eventId, "LIL event id");
  if (!isStableProjectIdentity(event.projectId)) throw new Error("LIL event requires a stable project identity.");
  const occurredAt = canonicalTime(event.occurredAt);
  if (typeof event.kind !== "string" || !EVENT_KINDS.includes(event.kind)) throw new Error("Unsupported LIL event kind.");
  if (!["info", "warning", "error", "critical"].includes(String(event.severity))) {
    throw new Error("Unsupported LIL severity.");
  }
  const actor = record(event.actor, "LIL actor");
  onlyKeys(actor, ["kind", "id"], "LIL actor");
  if (!["runtime", "provider", "user"].includes(String(actor.kind))) throw new Error("Unsupported LIL actor kind.");
  ref(actor.id, "LIL actor id");
  const correlationId = optionalRef(event.correlationId, "LIL correlation id");
  const causationEventId = optionalRef(event.causationEventId, "LIL causation id");
  const taskId = optionalRef(event.taskId, "LIL task id");
  let evidenceRefs: string[] | undefined;
  if (event.evidenceRefs !== undefined) {
    if (!Array.isArray(event.evidenceRefs) || event.evidenceRefs.length > 16) {
      throw new Error("LIL evidence references must be a bounded array.");
    }
    evidenceRefs = event.evidenceRefs.map(item => ref(item, "LIL evidence reference"));
    if (new Set(evidenceRefs).size !== evidenceRefs.length) throw new Error("LIL evidence references must be unique.");
  }
  let transition: LILEvent["transition"];
  if (event.kind === "task-transition") {
    if (!taskId) throw new Error("Task transition requires a task id.");
    const entry = record(event.transition, "LIL task transition");
    onlyKeys(entry, ["version", "from", "to"], "LIL task transition");
    if (!Number.isSafeInteger(entry.version) || (entry.version as number) < 0) {
      throw new Error("LIL task transition version is invalid.");
    }
    const from = entry.from === null ? null : taskState(entry.from, "LIL task source state");
    const to = taskState(entry.to, "LIL task target state");
    if (from === null && (entry.version !== 0 || to !== "queued")) {
      throw new Error("Initial LIL task transition must create version zero in queued state.");
    }
    if (from !== null && entry.version === 0) throw new Error("LIL task version zero must be initial.");
    transition = { version: entry.version as number, from, to };
  } else if (event.transition !== undefined) {
    throw new Error("Only task-transition events may contain transition material.");
  }
  const result: LILEvent = {
    schemaVersion: 1, eventId, projectId: event.projectId, occurredAt,
    kind: event.kind as LILEventKind,
    severity: event.severity as LILEvent["severity"],
    actor: { kind: actor.kind as LILEvent["actor"]["kind"], id: actor.id as string },
    ...(correlationId ? { correlationId } : {}),
    ...(causationEventId ? { causationEventId } : {}),
    ...(taskId ? { taskId } : {}),
    ...(evidenceRefs ? { evidenceRefs } : {}),
    ...(transition ? { transition } : {}),
  };
  if (Buffer.byteLength(JSON.stringify(result), "utf8") > MAX_RECORD_BYTES) {
    throw new Error("LIL event exceeds its bounded record size.");
  }
  return result;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
function eventKey(event: LILEvent): string {
  // The task/version slot is a cross-process uniqueness guard, not merely an event ID.
  return event.kind === "task-transition"
    ? "task:" + event.taskId + ":v" + event.transition!.version
    : "event:" + event.eventId;
}
function fileName(event: LILEvent): string { return sha256(eventKey(event)) + ".json"; }
function isCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === code;
}
async function realDirectory(path: string): Promise<void> {
  const stats = await lstat(path);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error("LIL storage must use real directories, not symbolic links.");
  }
}
async function plainFile(path: string): Promise<void> {
  const stats = await lstat(path);
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new Error("LIL event storage contains a non-regular file.");
  }
}
async function createDirectory(path: string): Promise<void> {
  try { await mkdir(path); } catch (error) { if (!isCode(error, "EEXIST")) throw error; }
  await realDirectory(path);
}

export class LILEventStore {
  readonly projectId: string;
  readonly path: string;
  private readonly storageRoot: string;

  constructor(projectStateRoot: string, stableProjectId: string) {
    if (!isStableProjectIdentity(stableProjectId)) throw new Error("LIL store requires an explicit stable project identity.");
    this.projectId = stableProjectId;
    this.storageRoot = resolve(projectStateRoot);
    this.path = resolve(this.storageRoot, "lil", "events", this.projectId);
  }

  private async prepare(): Promise<void> {
    // The host must supply the correct project-specific state root. Desktop selection is not Authority.
    await realDirectory(this.storageRoot);
    await createDirectory(resolve(this.storageRoot, "lil"));
    await createDirectory(resolve(this.storageRoot, "lil", "events"));
    await createDirectory(this.path);
  }

  private async readCommitted(path: string, expectedName: string): Promise<LILEvent> {
    await plainFile(path);
    const source = await readFile(path, "utf8");
    if (Buffer.byteLength(source, "utf8") > MAX_RECORD_BYTES + 200) {
      throw new Error("LIL committed event exceeds the storage limit.");
    }
    let envelope: unknown;
    try { envelope = JSON.parse(source) as unknown; }
    catch { throw new Error("LIL committed event is malformed."); }
    const row = record(envelope, "LIL envelope");
    onlyKeys(row, ["schemaVersion", "event", "digest"], "LIL envelope");
    if (row.schemaVersion !== 1 || typeof row.digest !== "string") {
      throw new Error("LIL committed event has an unsupported envelope.");
    }
    const event = validateLILEvent(row.event);
    if (event.projectId !== this.projectId || fileName(event) !== expectedName
        || row.digest !== sha256(JSON.stringify(event))) {
      throw new Error("LIL committed event failed project, identity or integrity checks.");
    }
    return event;
  }

  async append(input: LILEvent): Promise<"recorded" | "duplicate"> {
    const event = validateLILEvent(input);
    if (event.projectId !== this.projectId) throw new Error("LIL cross-project event rejected.");
    await this.prepare();
    const name = fileName(event);
    const target = resolve(this.path, name);
    const temporary = resolve(this.path, ".pending-" + randomUUID());
    const envelope = JSON.stringify({ schemaVersion: 1, event, digest: sha256(JSON.stringify(event)) }) + "\n";
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(envelope, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    try {
      try {
        // Atomic hard-link creation cannot overwrite an already committed slot.
        await link(temporary, target);
        return "recorded";
      } catch (error) {
        if (!isCode(error, "EEXIST")) throw error;
        const existing = await this.readCommitted(target, name);
        if (JSON.stringify(existing) !== JSON.stringify(event)) {
          throw new Error("LIL conflicting duplicate event or task transition rejected.");
        }
        return "duplicate";
      }
    } finally {
      await rm(temporary, { force: true });
    }
  }

  async snapshot(): Promise<LILActivitySnapshot> {
    await this.prepare();
    const entries = await readdir(this.path);
    if (entries.length > MAX_SCAN_ENTRIES) throw new Error("LIL event storage exceeds the bounded scan limit.");
    const events: LILEvent[] = [];
    const ids = new Set<string>();
    let incompleteWrites = 0;
    for (const entry of entries.sort()) {
      const path = resolve(this.path, entry);
      if (PENDING_FILE.test(entry)) {
        await plainFile(path);
        incompleteWrites++;
        continue;
      }
      if (!COMMITTED_FILE.test(entry)) throw new Error("LIL event storage contains an unsupported entry.");
      const event = await this.readCommitted(path, entry);
      if (ids.has(event.eventId)) throw new Error("LIL duplicate event identity was detected on replay.");
      ids.add(event.eventId);
      events.push(event);
    }
    events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.eventId.localeCompare(b.eventId));
    return { projectId: this.projectId, events, incompleteWrites };
  }
}
