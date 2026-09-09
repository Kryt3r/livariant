import { mountFirstRunOnboarding } from "./first-run-ui.js";

const rootElement = document.querySelector<HTMLDivElement>("#app");
if (!rootElement) throw new Error("Livariant desktop root not found");
const root: HTMLDivElement = rootElement;

const logoUrl = new URL("./assets/livariant-logo.png", import.meta.url).href;
let mainLoaded = false;

async function loadMainSurface(): Promise<void> {
  if (mainLoaded) return;
  mainLoaded = true;
  await import("./main.js");
  await Promise.all([
    import("./project-source-review-navigation.js"),
    import("./first-steps-editor-state.js"),
    import("./runtime-health.js"),
    import("./updater-ui.js"),
    import("./diagnostics-range-guard.js"),
    import("./first-run-revisit.js"),
  ]);
}

async function start(): Promise<void> {
  try {
    const handled = await mountFirstRunOnboarding(root, {
      logoUrl,
      onExit: () => { void loadMainSurface(); },
    });
    if (!handled) await loadMainSurface();
  } catch (error) {
    root.innerHTML = `<main style="padding:32px;font-family:system-ui;color:#eef1ff;background:#0b0d12;min-height:100vh"><h1>Livariant setup could not start</h1><p>${String(error).replace(/[&<>"']/g, "")}</p><p>No project-owned files were changed. Restart Livariant after resolving the runtime issue.</p></main>`;
  }
}

document.addEventListener("livariant:open-first-run", () => {
  void mountFirstRunOnboarding(root, {
    logoUrl,
    force: true,
    onExit: () => window.location.reload(),
  });
});

void start();
