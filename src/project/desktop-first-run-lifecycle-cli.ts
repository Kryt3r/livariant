import { runDesktopFirstRunLifecycleCli } from "./desktop-first-run-lifecycle.js";

runDesktopFirstRunLifecycleCli().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
