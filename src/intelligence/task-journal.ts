import { randomUUID } from "node:crypto";
import { LILEventStore, type LILEvent, type LILTaskState } from "./event-ledger.js";

export interface LILTaskSnapshot {
  taskId: string;
  version: number;
  state: LILTaskState;
  lastEventId: string;
}

const NEXT: Record<LILTaskState, readonly LILTaskState[]> = {
  queued: ["analyzing", "blocked"],
  analyzing: ["proposal-ready", "completed", "blocked"],
  "proposal-ready": ["awaiting-approval", "blocked"],
  "awaiting-approval": ["blocked"],
  blocked: ["queued"],
  completed: [],
};

export interface LILTaskTransitionRequest {
  taskId: string;
  expectedVersion: number | null;
  from: LILTaskState | null;
  to: LILTaskState;
}

// This is an *observational workflow journal*, not a grant of user/Guardian Authority.
// Deliberately no transition from awaiting-approval to execution before a qualified
// proposal-bound authorization and apply contract is integrated in a later slice.
export class LILTaskJournal {
  constructor(private readonly ledger: LILEventStore) {}

  async tasks(): Promise<LILTaskSnapshot[]> {
    const snapshot = await this.ledger.snapshot();
    if (snapshot.incompleteWrites > 0) {
      throw new Error("LIL task replay blocked: incomplete event writes require review.");
    }
    const byTask = new Map<string, LILEvent[]>();
    for (const event of snapshot.events) {
      if (event.kind !== "task-transition") continue;
      if (event.actor.kind !== "runtime") throw new Error("LIL task transition must be recorded by the runtime.");
      const taskId = event.taskId!;
      const history = byTask.get(taskId) ?? [];
      history.push(event);
      byTask.set(taskId, history);
    }
    const tasks: LILTaskSnapshot[] = [];
    for (const [taskId, history] of byTask) {
      history.sort((a, b) => a.transition!.version - b.transition!.version);
      let state: LILTaskState | null = null;
      let version = -1;
      let lastEventId = "";
      for (const event of history) {
        const step = event.transition!;
        if (step.version !== version + 1 || step.from !== state
            || (state === null ? step.to !== "queued" : !NEXT[state].includes(step.to))) {
          throw new Error("LIL task history is discontinuous or contains an unauthorized state transition.");
        }
        version = step.version;
        state = step.to;
        lastEventId = event.eventId;
      }
      tasks.push({ taskId, version, state: state!, lastEventId });
    }
    return tasks.sort((a, b) => a.taskId.localeCompare(b.taskId));
  }

  async transition(request: LILTaskTransitionRequest): Promise<LILTaskSnapshot> {
    const tasks = await this.tasks();
    const current = tasks.find(task => task.taskId === request.taskId);
    const actualVersion = current?.version ?? null;
    const actualState = current?.state ?? null;
    if (request.expectedVersion !== actualVersion || request.from !== actualState) {
      throw new Error("LIL task transition rejected: stale version or source state.");
    }
    if (actualState === null && request.to !== "queued") {
      throw new Error("LIL tasks must begin in queued state.");
    }
    if (actualState !== null && !NEXT[actualState].includes(request.to)) {
      throw new Error("LIL task transition is not permitted.");
    }

    const event: LILEvent = {
      schemaVersion: 1,
      eventId: "lil-" + randomUUID(),
      projectId: this.ledger.projectId,
      occurredAt: new Date().toISOString(),
      kind: "task-transition",
      severity: request.to === "blocked" ? "warning" : "info",
      actor: { kind: "runtime", id: "livariant-lil" },
      taskId: request.taskId,
      correlationId: request.taskId,
      ...(current ? { causationEventId: current.lastEventId } : {}),
      transition: {
        version: (actualVersion ?? -1) + 1,
        from: actualState,
        to: request.to,
      },
    };
    // The ledger's atomic taskId/version slot rejects concurrent competing transitions.
    await this.ledger.append(event);
    return {
      taskId: request.taskId,
      version: event.transition!.version,
      state: request.to,
      lastEventId: event.eventId,
    };
  }
}
