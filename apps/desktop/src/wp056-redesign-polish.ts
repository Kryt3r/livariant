import "./wp056-redesign-polish.css";
import { invoke } from "@tauri-apps/api/core";
import { getLanguage } from "./i18n/runtime.js";

type MeasurementTarget = {
  provider: string;
  model: string | null;
  displayName: string;
  isDefault: boolean;
  lastSuccessfulAt: string | null;
  retryAt: string | null;
  ready: boolean;
  readiness: "unmeasured" | "cooldown" | "cooldown-complete";
};

type MeasurementStatus = {
  provider: string;
  scope: "model" | "connection" | "unavailable";
  available: boolean;
  cooldownMs: number;
  readyTargetCount: number;
  unmeasuredTargetCount: number;
  nextRetryAt: string | null;
  detail: string | null;
  targets: MeasurementTarget[];
};

type DiagnosticsSummaryEnvelope = { measurement?: MeasurementStatus };
type MeasureResult = {
  measuredTarget?: { provider: string; model: string | null; displayName: string; scope: "model" | "connection" };
  diagnostics?: DiagnosticsSummaryEnvelope;
};

let scheduled = false;
let measuring = false;
const isGerman = () => getLanguage() === "de";

const setTextIfDifferent = (element: Element | null, value: string) => {
  if (element && element.textContent !== value) element.textContent = value;
};

const translateExactText = (root: ParentNode, translations: ReadonlyMap<string, string>) => {
  root.querySelectorAll<HTMLElement>("span, small, strong, p, h1, h2, h3, button, label").forEach((element) => {
    const source = element.textContent?.trim() ?? "";
    const translated = translations.get(source);
    if (translated && element.textContent !== translated) element.textContent = translated;
  });
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
  // Project Knowledge now owns bilingual copy at render time. Do not overwrite it
  // with the older one-way German post-processing that caused mixed-language UI.
};

const localizeNotificationCopy = () => {const localizeNotificationCopy = () => {
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
  const pairs = [
    ["Observed", "Beobachtet"],
    ["Avoided", "Vermieden"],
    ["Estimated", "Geschätzt"],
    ["Observed / Avoided / Estimated", "Beobachtet / Vermieden / Geschätzt"],
    ["Cache Read", "Cache gelesen"],
    ["Cache Write", "Cache geschrieben"],
    ["Reasoning", "Denkprozess"],
    ["Observed ≠ Avoided ≠ Estimated. Unknown remains unknown.", "Beobachtet ≠ Vermieden ≠ Geschätzt. Unbekannt bleibt unbekannt."],
  ] as const;
  const map = new Map<string, string>();
  for (const [en, de] of pairs) {
    map.set(en, isGerman() ? de : en);
    map.set(de, isGerman() ? de : en);
  }
  document.querySelectorAll<HTMLElement>(".dc-shell span, .dc-shell strong, .dc-shell h3, .dc-shell p, .dc-shell footer").forEach((element) => {
    const current = element.textContent?.trim() ?? "";
    const translated = map.get(current);
    if (translated && element.textContent !== translated) element.textContent = translated;
  });
};

const removeDuplicateOverviewComposition = () => {const removeDuplicateOverviewComposition = () => {
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

const formatWait = (retryAt: string | null): string => {
  if (!retryAt) return isGerman() ? "später" : "later";
  const remaining = Math.max(0, Date.parse(retryAt) - Date.now());
  const minutes = Math.max(1, Math.ceil(remaining / 60_000));
  const weeks = Math.floor(minutes / (7 * 24 * 60));
  const days = Math.floor((minutes % (7 * 24 * 60)) / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;
  if (isGerman()) {
    if (weeks > 0) return `${weeks} Wo. ${days} T.`;
    if (days > 0) return `${days} T. ${hours} Std.`;
    if (hours > 0) return `${hours} Std. ${mins} Min.`;
    return `${mins} Min.`;
  }
  if (weeks > 0) return `${weeks}w ${days}d`;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

const selectRecommendedTarget = (status: MeasurementStatus): MeasurementTarget | undefined => {
  const ready = status.targets.filter((target) => target.ready);
  const unmeasured = ready.filter((target) => target.readiness === "unmeasured");
  return unmeasured.find((target) => target.isDefault)
    ?? unmeasured[0]
    ?? ready.find((target) => target.isDefault)
    ?? ready[0];
};

const loadMeasurementStatus = async (): Promise<MeasurementStatus | null> => {
  try {
    const preset = document.querySelector<HTMLSelectElement>(".dc-preset")?.value ?? "30d";
    const summary = await invoke<DiagnosticsSummaryEnvelope>("codex_diagnostics_summary", { preset });
    return summary.measurement ?? null;
  } catch {
    return null;
  }
};

const applyMeasurementButtonState = (button: HTMLButtonElement, status: MeasurementStatus | null) => {
  if (measuring) return;
  if (!status) {
    button.disabled = false;
    button.textContent = isGerman() ? "Messung starten" : "Start measurement";
    return;
  }
  if (!status.available) {
    button.disabled = true;
    button.textContent = isGerman() ? "Messung nicht verfügbar" : "Measurement unavailable";
    return;
  }
  if (status.readyTargetCount > 0) {
    button.disabled = false;
    button.textContent = status.unmeasuredTargetCount > 0
      ? (isGerman() ? "Neues Modell messen" : "Measure new model")
      : (isGerman() ? "Messung starten" : "Start measurement");
    return;
  }
  button.disabled = true;
  button.textContent = isGerman()
    ? `Bitte warten: ${formatWait(status.nextRetryAt)}`
    : `Please wait: ${formatWait(status.nextRetryAt)}`;
};

const openMeasurementDialog = (status: MeasurementStatus): Promise<boolean> => new Promise((resolve) => {
  document.querySelector(".wp056-measure-dialog-backdrop")?.remove();
  const target = selectRecommendedTarget(status);
  if (!target) {
    resolve(false);
    return;
  }

  const backdrop = document.createElement("div");
  backdrop.className = "wp056-measure-dialog-backdrop";
  const dialog = document.createElement("section");
  dialog.className = "wp056-measure-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "wp056-measure-dialog-title");

  const scopedNote = status.scope === "model"
    ? (isGerman()
      ? `<div class="wp056-measure-target"><small>MESSZIEL</small><strong>${target.displayName}</strong><span>Nur dieses Modell wird gemessen. Bereits gemessene Modelle bleiben unberührt.</span></div>`
      : `<div class="wp056-measure-target"><small>MEASUREMENT TARGET</small><strong>${target.displayName}</strong><span>Only this model will be measured. Previously measured models stay untouched.</span></div>`)
    : (isGerman()
      ? `<div class="wp056-measure-target" data-tone="warning"><small>MESSZIEL</small><strong>Codex-Standardverbindung</strong><span>Dieser Codex App Server stellt keinen modellgenauen Katalog bereit. Livariant misst deshalb nur die Standardverbindung und behauptet keine Modellgenauigkeit.</span></div>`
      : `<div class="wp056-measure-target" data-tone="warning"><small>MEASUREMENT TARGET</small><strong>Codex default connection</strong><span>This Codex App Server does not expose a model-scoped catalog. Livariant therefore measures only the default connection and does not claim model-level precision.</span></div>`);

  dialog.innerHTML = isGerman()
    ? `<button type="button" class="wp056-measure-dialog-close" aria-label="Schließen">×</button>
       <span class="wp056-measure-eyebrow">DIAGNOSEMESSUNG</span>
       <h2 id="wp056-measure-dialog-title">Messung starten?</h2>
       <p class="wp056-measure-lead">Livariant führt dafür einen kurzen echten Codex-Aufruf aus, um zu prüfen, ob Usage-Evidence korrekt erfasst wird.</p>
       ${scopedNote}
       <div class="wp056-measure-guidance"><strong>Eine Messung ist sinnvoll:</strong><ul><li>nach dem Einrichten oder Ändern einer Codex-Verbindung,</li><li>wenn trotz tatsächlicher Nutzung keine oder unerwartete Diagnose-Evidence erscheint,</li><li>zur gezielten Fehlersuche nach Änderungen oder Updates.</li></ul></div>
       <div class="wp056-measure-warning"><strong>Tokenverbrauch & Messrauschen</strong><p>Die Messung verbraucht selbst Tokens und wird als beobachtete Nutzung gespeichert. Häufiges Ausführen kann besonders bei kurzen Zeiträumen oder wenig sonstiger Aktivität die angezeigten Nutzungswerte merklich beeinflussen.</p><p>Für normales Nachladen vorhandener Daten verwende <b>„Aktualisieren“</b>.</p></div>
       <div class="wp056-measure-dialog-actions"><button type="button" class="button secondary" data-measure-cancel>Abbrechen</button><button type="button" class="button primary" data-measure-confirm>Messung starten</button></div>`
    : `<button type="button" class="wp056-measure-dialog-close" aria-label="Close">×</button>
       <span class="wp056-measure-eyebrow">DIAGNOSTICS MEASUREMENT</span>
       <h2 id="wp056-measure-dialog-title">Start measurement?</h2>
       <p class="wp056-measure-lead">Livariant will perform one short real Codex call to verify that usage evidence is captured correctly.</p>
       ${scopedNote}
       <div class="wp056-measure-guidance"><strong>A measurement is useful:</strong><ul><li>after setting up or changing a Codex connection,</li><li>when real usage produces no or unexpected diagnostics evidence,</li><li>for targeted troubleshooting after changes or updates.</li></ul></div>
       <div class="wp056-measure-warning"><strong>Token use & measurement noise</strong><p>The measurement consumes tokens and is stored as observed usage. Running it frequently can noticeably influence usage values, especially in short time ranges or when there is little other activity.</p><p>Use <b>Refresh</b> to reload existing data without creating provider activity.</p></div>
       <div class="wp056-measure-dialog-actions"><button type="button" class="button secondary" data-measure-cancel>Cancel</button><button type="button" class="button primary" data-measure-confirm>Start measurement</button></div>`;

  backdrop.append(dialog);
  document.body.append(backdrop);

  let settled = false;
  const finish = (confirmed: boolean) => {
    if (settled) return;
    settled = true;
    backdrop.remove();
    resolve(confirmed);
  };
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) finish(false);
  });
  dialog.querySelector(".wp056-measure-dialog-close")?.addEventListener("click", () => finish(false));
  dialog.querySelector("[data-measure-cancel]")?.addEventListener("click", () => finish(false));
  dialog.querySelector("[data-measure-confirm]")?.addEventListener("click", () => finish(true));
  document.addEventListener("keydown", function escape(event) {
    if (event.key !== "Escape") return;
    document.removeEventListener("keydown", escape);
    finish(false);
  });
});

const addMeasureAction = () => {
  const surface = document.querySelector<HTMLElement>("[data-surface='diagnostics']");
  const actions = surface?.querySelector<HTMLElement>(".dc-header-actions");
  if (!surface || !actions || actions.querySelector(".dc-measure-polish")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "button primary dc-measure-polish";
  button.textContent = isGerman() ? "Messstatus wird geprüft…" : "Checking measurement…";
  button.disabled = true;
  const exportButton = actions.querySelector(".dc-export");
  actions.insertBefore(button, exportButton ?? null);

  void loadMeasurementStatus().then((status) => {
    if (button.isConnected) applyMeasurementButtonState(button, status);
  });

  button.addEventListener("click", async () => {
    if (measuring) return;
    const status = await loadMeasurementStatus();
    if (!status?.available || status.readyTargetCount < 1) {
      applyMeasurementButtonState(button, status);
      return;
    }
    if (!(await openMeasurementDialog(status))) return;

    measuring = true;
    button.disabled = true;
    button.textContent = isGerman() ? "Messung läuft…" : "Measuring…";
    try {
      const result = await invoke<MeasureResult>("codex_diagnostics_measure");
      surface.querySelector<HTMLButtonElement>(".dc-refresh")?.click();
      const measured = result.measuredTarget?.displayName;
      window.setTimeout(() => {
        const currentSurface = document.querySelector<HTMLElement>("[data-surface='diagnostics']");
        if (currentSurface) showMeasureNotice(
          currentSurface,
          isGerman()
            ? `Messung abgeschlossen${measured ? `: ${measured}` : ""}. Die Diagnose wurde mit der neuen Evidence aktualisiert.`
            : `Measurement completed${measured ? `: ${measured}` : ""}. Diagnostics were refreshed with the new evidence.`,
          "success",
        );
      }, 180);
    } catch (cause) {
      showMeasureNotice(
        surface,
        isGerman()
          ? "Messung konnte nicht abgeschlossen werden. Bestehende Evidence wurde beibehalten; versuche es erneut."
          : "Measurement could not be completed. Existing evidence was kept; try again.",
        "error",
      );
    } finally {
      measuring = false;
      if (button.isConnected) {
        const refreshed = await loadMeasurementStatus();
        applyMeasurementButtonState(button, refreshed);
      }
    }
  });
};

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
