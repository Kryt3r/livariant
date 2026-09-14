import "./glass.css";
import "./styles.css";
import "./github-first-run-integration.js";
import { mountFirstRunOnboarding } from "./first-run-ui.js";
import { getLanguage } from "./i18n/runtime.js";

const rootElement = document.querySelector<HTMLDivElement>("#app");
if (!rootElement) throw new Error("Livariant desktop root not found");
const root: HTMLDivElement = rootElement;

const logoUrl = new URL("./assets/livariant-logo.png", import.meta.url).href;
let mainLoaded = false;

const text = (en: string, de: string) => getLanguage() === "de" ? de : en;

async function loadMainSurface(): Promise<void> {
  if (mainLoaded) return;
  mainLoaded = true;
  await import("./main.js");
  await Promise.all([
    import("./project-source-review-navigation.js"),
    import("./notification-center.js"),
    import("./operator-live-notice.js"),
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
    console.error("Livariant first-run startup failed", error);
    root.innerHTML = `<main style="padding:32px;font-family:system-ui;color:#eef1ff;background:#0b0d12;min-height:100vh"><h1>${text("Livariant setup could not start", "Livariant-Einrichtung konnte nicht gestartet werden")}</h1><p>${text("Livariant could not open the setup flow. Restart Livariant. If the problem continues, review Diagnostics after the app opens or collect the diagnostic information for support.", "Livariant konnte die Einrichtung nicht öffnen. Starte Livariant neu. Wenn das Problem bestehen bleibt, prüfe nach dem Öffnen der App die Diagnose oder sammle die Diagnoseinformationen für den Support.")}</p><p>${text("No project-owned files were changed.", "Es wurden keine projekt-eigenen Dateien verändert.")}</p></main>`;
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