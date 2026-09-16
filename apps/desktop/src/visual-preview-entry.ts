/* WP-056 visual QA only.
   This entry is never loaded by the production Desktop entry point. It renders the
   real Desktop renderer/shell in Vite and supplies only the minimal native bridge
   fixture needed to inspect visual fidelity without installing the Rust toolchain. */

type VisualInvoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

const invoke: VisualInvoke = async (command) => {
  if (command === "codex_connector_status") {
    return {
      installationState: "available",
      version: "visual-qa",
      connected: true,
      connectionState: "connected",
      pendingApprovals: 0,
      detail: "Visual QA fixture: connected",
      connectionMode: "auto",
      configuredCommand: null,
    };
  }
  throw new Error(`Native command '${command}' is unavailable in the visual QA preview.`);
};

Object.defineProperty(window, "__TAURI_INTERNALS__", {
  configurable: true,
  value: {
    invoke,
    metadata: {
      currentWindow: { label: "main" },
      currentWebview: { label: "main" },
    },
  },
});

await import("./main.js");
await import("./project-source-review-navigation.js");
await import("./shell-redesign.js");

window.requestAnimationFrame(() => {
  document.querySelector<HTMLButtonElement>("nav.nav [data-view='overview']")?.click();
});
