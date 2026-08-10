import { readMigrationJournal } from "./migration.js";

export async function assertLifecycleQuiescent(projectPath: string, operation: string): Promise<void> {
  let journal: Awaited<ReturnType<typeof readMigrationJournal>>;
  try {
    journal = await readMigrationJournal(projectPath);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "invalid lifecycle evidence";
    throw new Error(`${operation} is blocked because durable lifecycle evidence is invalid: ${reason}`);
  }

  if (journal && journal.state !== "complete" && journal.state !== "failed") {
    throw new Error(`${operation} is blocked because migration recovery is required.`);
  }
}
