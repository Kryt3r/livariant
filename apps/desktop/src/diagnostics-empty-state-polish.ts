import "./diagnostics-empty-state-polish.css";
import { invoke } from "@tauri-apps/api/core";
import { getLanguage } from "./i18n/runtime.js";
import { onDesktopProjectActivated } from "./desktop-project-registry.js";

type DiagnosticPreset = "1d" | "7d" | "30d" | "90d" | "all";
type DiagnosticsAvailability = { hasObservedData: boolean; observed: { eventCount: number } };

const lang = <T>(en: T, de: T): T => getLanguage() === "de" ? de : en;
let generation = 0;

const reconcileEmptyHero = async () => {
  const hero = document.querySelector<HTMLElement>("[data-surface='diagnostics'] .dc-hero");
  const preset = document.querySelector<HTMLSelectElement>("[data-surface='diagnostics'] .dc-preset")?.value as DiagnosticPreset | undefined;
  if (!hero || !preset || hero.dataset.availabilityChecked === preset) return;
  hero.dataset.availabilityChecked = preset;
  const currentGeneration = ++generation;
  try {
    const summary = await invoke<DiagnosticsAvailability>("codex_diagnostics_summary", { preset });
    if (currentGeneration !== generation || summary.hasObservedData) return;
    hero.classList.add("empty");
    const icon = hero.querySelector<HTMLElement>(".dc-hero-icon");
    const kicker = hero.querySelector<HTMLElement>(".dc-hero-copy > span");
    const title = hero.querySelector<HTMLElement>(".dc-hero-copy > h2");
    const copy = hero.querySelector<HTMLElement>(".dc-hero-copy > p");
    if (icon) icon.textContent = "–";
    if (kicker) kicker.textContent = lang("No observed diagnostic evidence", "Keine beobachtete Diagnose-Evidence");
    if (title) title.textContent = lang("No observed activities in the selected period", "Keine beobachteten Aktivitäten im gewählten Zeitraum");
    if (copy) copy.textContent = lang(
      "Livariant has no observed usage evidence for this period. Missing evidence stays unknown instead of being presented as a healthy state.",
      "Für diesen Zeitraum liegt keine beobachtete Nutzungs-Evidence vor. Fehlende Evidence bleibt unbekannt, statt als gesunder Zustand dargestellt zu werden.",
    );
  } catch {
    // The cockpit owns command/error presentation. This polish must never hide or replace it.
  }
};

onDesktopProjectActivated(() => {
  generation += 1;
  document.querySelectorAll<HTMLElement>("[data-surface='diagnostics'] .dc-hero").forEach((hero) => {
    delete hero.dataset.availabilityChecked;
    hero.classList.remove("empty");
  });
  void reconcileEmptyHero();
});

const observer = new MutationObserver(() => void reconcileEmptyHero());
observer.observe(document.documentElement, { childList: true, subtree: true });
void reconcileEmptyHero();
