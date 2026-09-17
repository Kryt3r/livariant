import "./wp056-redesign-polish.css";
import { invoke } from "@tauri-apps/api/core";
import { getLanguage } from "./i18n/runtime.js";

type ConnectorStatus = { connected: boolean };

let scheduled = false;
let measuring = false;
const isGerman = () => getLanguage() === "de";

const setTextIfDifferent = (element: Element | null, value: string) => {
  if (element && element.textContent !== value) element.textContent = value;
};

const localizeRevisitCard = () => {
  const button = document.querySelector<HTMLButtonElement>("[data-reopen-first-run]");
  const card = button?.closest<HTMLElement>(".settings-card");
  if (!button || !card) return;
  const strong = card.querySelector("strong");
  const span = card.querySelector("div > span");
  if (isGerman()) {
    setTextIfDifferent(strong, "Einrichtungsassistent");
    setTextIfDifferent(span, "Einrichtung für Projekt, Quellen und Provider prüfen oder dort fortfahren, wo du aufgehört hast.");
    setTextIfDifferent(button, "Einrichtung öffnen");
  } else {
    setTextIfDifferent(strong, "Setup assistant");
    setTextIfDifferent(span, "Review or continue the resumable first-run project, source and provider setup.");
    setTextIfDifferent(button, "Open setup");
  }
};

const localizeProjectKnowledge = () => {
  const workspace = document.querySelector<HTMLElement>(".truth-workspace");
  if (!workspace) return;

  if (isGerman()) {
    const topbar = workspace.querySelector<HTMLElement>(":scope > .topbar");
    setTextIfDifferent(topbar?.querySelector(".eyebrow") ?? null, "PROJECT-BRAIN-ARBEITSBEREICH");
    setTextIfDifferent(topbar?.querySelector("h1") ?? null, "Projektwissen");
    setTextIfDifferent(topbar?.querySelector("p") ?? null, "Eine klare Sicht auf das bestehende Project Brain von Livariant: aktuelles Wissen prüfen, Änderungen mitteilen und jede kanonische Aktualisierung vor der Übernahme kontrollieren.");
    const chip = topbar?.querySelector<HTMLElement>(".project-chip");
    setTextIfDifferent(chip?.querySelector("small") ?? null, "Aktuelles Projekt");
    const projectName = chip?.querySelector("strong");
    if (projectName?.textContent === "No project selected") projectName.textContent = "Kein Projekt ausgewählt";

    const boundary = workspace.querySelector<HTMLElement>(".truth-boundary-card p");
    const desired = "Ein kanonisches Brain, mehrere Eingabeoberflächen.|Desktop, Codex, Claude und andere Provider können Evidence einreichen, aber Project Brain bleibt die dauerhafte Quelle der Wahrheit. Der zukünftige lokale Mutationskoordinator wird akzeptierte Schreibvorgänge serialisieren und veraltete Revisionen vor der Mutation zurückweisen.";
    if (boundary && boundary.dataset.wp056Copy !== desired) {
      boundary.innerHTML = "<strong>Ein kanonisches Brain, mehrere Eingabeoberflächen.</strong> Desktop, Codex, Claude und andere Provider können Evidence einreichen, aber Project Brain bleibt die dauerhafte Quelle der Wahrheit. Der zukünftige lokale Mutationskoordinator wird akzeptierte Schreibvorgänge serialisieren und veraltete Revisionen vor der Mutation zurückweisen.";
      boundary.dataset.wp056Copy = desired;
    }
  }
};

const localizeNotificationCopy = () => {
  if (!isGerman()) return;
  document.querySelectorAll<HTMLElement>(".notification-drawer-item").forEach((item) => {
    const category = item.querySelector<HTMLElement>(".notification-drawer-category")?.textContent?.trim();
    const body = item.querySelector<HTMLElement>("p");
    if (category !== "Update" || !body) return;
    const match = body.textContent?.match(/^A signed Livariant update to version (.+) is available\.$/);
    if (match) body.textContent = `Ein signiertes Livariant-Update auf Version ${match[1]} ist verfügbar.`;
  });
};

const localizeDiagnosticsTerms = () => {
  if (!isGerman()) return;
  const map = new Map<string, string>([
    ["Observed", "Beobachtet"],
    ["Avoided", "Vermieden"],
    ["Estimated", "Geschätzt"],
    ["Observed / Avoided / Estimated", "Beobachtet / Vermieden / Geschätzt"],
    ["Cache Read", "Cache gelesen"],
    ["Cache Write", "Cache geschrieben"],
    ["Reasoning", "Denkprozess"],
  ]);
  document.querySelectorAll<HTMLElement>(".dc-shell span, .dc-shell strong, .dc-shell h3").forEach((element) => {
    const current = element.textContent?.trim() ?? "";
    const translated = map.get(current);
    if (translated && element.textContent !== translated) element.textContent = translated;
  });
};

const removeDuplicateOverviewComposition = () => {
  document.querySelector<HTMLElement>(".dc-overview .dc-composition")?.remove();
};

const showMeasureNotice = (surface: HTMLElement, message: string, tone: "success" | "error") => {
  let notice = surface.querySelector<HTMLElement>(".wp056-measure-notice");
  if (!notice) {
    notice = document.createElement("div");
    notice.className = "wp056-measure-notice";
    const tabs = surface.querySelector(".dc-tabs");
    tabs?.insertAdjacentElement("afterend", notice);
  }
  notice.dataset.tone = tone;
  notice.textContent = message;
};

const addMeasureAction = () => {
  const surface = document.querySelector<HTMLElement>("[data-surface='diagnostics']");
  const actions = surface?.querySelector<HTMLElement>(".dc-header-actions");
  if (!surface || !actions || actions.querySelector(".dc-measure-polish")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "button primary dc-measure-polish";
  button.textContent = isGerman() ? "Messung starten" : "Start measurement";
  const exportButton = actions.querySelector(".dc-export");
  actions.insertBefore(button, exportButton ?? null);

  button.addEventListener("click", async () => {
    if (measuring) return;
    measuring = true;
    button.disabled = true;
    button.textContent = isGerman() ? "Messung läuft…" : "Measuring…";
    try {
      const connector = await invoke<ConnectorStatus>("codex_connector_status");
      if (!connector.connected) {
        showMeasureNotice(surface, isGerman() ? "Codex ist nicht verbunden. Stelle zuerst die Verbindung her, bevor du eine Messung startest." : "Codex is not connected. Connect it before starting a measurement.", "error");
        return;
      }
      await invoke("codex_diagnostics_measure");
      surface.querySelector<HTMLButtonElement>(".dc-refresh")?.click();
      window.setTimeout(() => {
        const currentSurface = document.querySelector<HTMLElement>("[data-surface='diagnostics']");
        if (currentSurface) showMeasureNotice(currentSurface, isGerman() ? "Messung abgeschlossen. Die Diagnose wurde mit der neuen Evidence aktualisiert." : "Measurement completed. Diagnostics were refreshed with the new evidence.", "success");
      }, 180);
    } catch (cause) {
      showMeasureNotice(surface, `${isGerman() ? "Messung fehlgeschlagen" : "Measurement failed"}: ${String(cause)}`, "error");
    } finally {
      measuring = false;
      if (button.isConnected) {
        button.disabled = false;
        button.textContent = isGerman() ? "Messung starten" : "Start measurement";
      }
    }
  });
};

const revealWhenReady = (content: HTMLElement, view: string) => {
  const selector = view === "steps" ? ".truth-workspace" : view === "diagnostics" ? ".dc-shell" : null;
  if (!selector) {
    delete content.dataset.wp056RouteTransition;
    return;
  }
  let frames = 0;
  const check = () => {
    frames += 1;
    if (content.querySelector(selector) || frames > 40) {
      requestAnimationFrame(() => delete content.dataset.wp056RouteTransition);
      return;
    }
    requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
};

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const nav = event.target.closest<HTMLButtonElement>("nav.nav [data-view]");
  const view = nav?.dataset.view;
  if (view !== "steps" && view !== "diagnostics") return;
  const content = document.querySelector<HTMLElement>("main.content");
  if (!content) return;
  content.dataset.wp056RouteTransition = view;
  revealWhenReady(content, view);
}, { capture: true });

const polish = () => {
  localizeRevisitCard();
  localizeProjectKnowledge();
  localizeNotificationCopy();
  removeDuplicateOverviewComposition();
  addMeasureAction();
  localizeDiagnosticsTerms();
};

const schedulePolish = () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    polish();
  });
};

const observer = new MutationObserver(schedulePolish);
observer.observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener("click", schedulePolish, { capture: true });
window.addEventListener("livariant:language-changed", schedulePolish as EventListener);

polish();
