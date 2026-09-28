import "./glass.css";
import "./styles.css";
import "./shell-redesign-compat.css";
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
    import("./shell-redesign.js"),
    import("./project-source-review-navigation.js"),
    import("./notification-center.js"),
    import("./notification-center-drawer.js"),
    import("./operator-live-notice.js"),
    import("./first-steps-editor-state.js"),
    import("./runtime-health.js"),
    import("./updater-ui.js"),
    import("./diagnostics-range-guard.js"),
    import("./first-run-revisit.js"),
    import("./wp056-redesign-polish.js"),
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
    try {
      // A broken or older resumable setup record must never make an existing
      // installation unusable. Preserve all app/project data and enter the
      // normal Desktop surface; setup remains explicitly resumable later.
      await loadMainSurface();
    } catch (mainError) {
      console.error("Livariant main surface recovery failed", mainError);
      root.innerHTML = `<main style="padding:32px;font-family:system-ui;color:#eef1ff;background:#0b0d12;min-height:100vh"><h1>${text("Livariant could not start", "Livariant konnte nicht gestartet werden")}</h1><p>${text("The setup state could not be loaded, and the normal Desktop surface could not be opened either. Restart Livariant and collect Diagnostics for support.", "Der Einrichtungszustand konnte nicht geladen werden und auch die normale Desktop-Oberfläche ließ sich nicht öffnen. Starte Livariant neu und sammle die Diagnoseinformationen für den Support.")}</p><p>${text("No project-owned files or Livariant app data were deleted.", "Es wurden keine projekt-eigenen Dateien und keine Livariant-Anwendungsdaten gelöscht.")}</p></main>`;
    }
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