import { getLanguage } from "./i18n/runtime.js";
import {
  activateDesktopProject,
  getActiveDesktopProject,
  getDesktopProjectRegistrySnapshot,
  onDesktopProjectActivated,
  onDesktopProjectRegistryChanged,
  refreshDesktopProjectRegistrySnapshot,
} from "./desktop-project-registry.js";

const text = (en: string, de: string) => getLanguage() === "de" ? de : en;
const esc = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character] ?? character);

const projectIcon = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h6l2 2h8v10H4z"/><path d="M4 7V5h6l2 2"/></svg>';

let loaded = false;
let loading = false;
let error: string | null = null;

const stateLabel = (state: string, availability: string) => {
  if (state === "detached") return text("Detached", "Getrennt");
  if (availability !== "available") return text("Unavailable", "Nicht verfügbar");
  return text("Available", "Verfügbar");
};

function markup(): string {
  const snapshot = getDesktopProjectRegistrySnapshot();
  const active = getActiveDesktopProject();
  const projects = snapshot?.projects ?? [];
  const recovery = snapshot?.startupRecovery
    ?? (snapshot?.legacyMigration.state === "recovery-required"
      ? snapshot.legacyMigration.detail ?? text("Project recovery is required.", "Projekt-Wiederherstellung ist erforderlich.")
      : null);

  const options = projects.length
    ? projects.map((project) => {
        const isActive = snapshot?.active?.desktopProjectId === project.desktopProjectId;
        const available = project.state === "registered" && project.availability === "available";
        return `<button class="global-project-option${isActive ? " active" : ""}" type="button" data-project-switch-id="${esc(project.desktopProjectId)}" ${!available || isActive ? "disabled" : ""}>
          <span><strong>${esc(project.displayName)}</strong><small>${esc(stateLabel(project.state, project.availability))}</small></span>
          ${isActive ? `<i>${text("Active", "Aktiv")}</i>` : ""}
        </button>`;
      }).join("")
    : `<div class="global-project-empty">${text("No registered projects yet.", "Noch keine registrierten Projekte.")}</div>`;

  const currentName = active?.displayName
    ?? (projects.length ? text("Select project", "Projekt wählen") : text("No project", "Kein Projekt"));

  return `<div class="global-project-wrap" data-open="false" data-switching="false">
    <button class="global-project" type="button" data-shell-project aria-haspopup="true" aria-expanded="false" ${snapshot?.startupRecovery ? "disabled" : ""}>
      <span class="global-project-icon">${projectIcon}</span>
      <span><small>${text("Current project", "Aktuelles Projekt")}</small><strong data-shell-project-name>${esc(currentName)}</strong></span>
      <span class="global-project-chevron">⌄</span>
    </button>
    <div class="global-project-popover" role="dialog" aria-label="${text("Project switcher", "Projektwechsler")}">
      <div class="global-project-popover-head"><strong>${text("Projects", "Projekte")}</strong><span>${projects.length}</span></div>
      ${recovery ? `<div class="global-project-recovery">${esc(recovery)}</div>` : ""}
      <div class="global-project-options">${options}</div>
      <div class="global-project-status" data-project-switch-status>${error ? esc(error) : ""}</div>
    </div>
  </div>`;
}

export function syncShellProjectSwitcher(): void {
  document.querySelectorAll<HTMLElement>("[data-shell-project-host]").forEach((host) => {
    host.innerHTML = markup();
    const wrap = host.querySelector<HTMLElement>(".global-project-wrap");
    const button = host.querySelector<HTMLButtonElement>("[data-shell-project]");
    const popover = host.querySelector<HTMLElement>(".global-project-popover");
    if (!wrap || !button || !popover) return;

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const nextOpen = wrap.dataset.open !== "true";
      document.querySelectorAll<HTMLElement>(".global-health-wrap[data-open='true']").forEach((item) => {
        item.dataset.open = "false";
        item.querySelector<HTMLButtonElement>("[data-shell-health]")?.setAttribute("aria-expanded", "false");
      });
      wrap.dataset.open = nextOpen ? "true" : "false";
      button.setAttribute("aria-expanded", nextOpen ? "true" : "false");
    });

    popover.querySelectorAll<HTMLButtonElement>("[data-project-switch-id]").forEach((option) => {
      option.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const desktopProjectId = option.dataset.projectSwitchId;
        if (!desktopProjectId) return;
        const status = popover.querySelector<HTMLElement>("[data-project-switch-status]");
        wrap.dataset.switching = "true";
        error = null;
        if (status) status.textContent = text("Switching project…", "Projekt wird gewechselt…");
        popover.querySelectorAll<HTMLButtonElement>("button").forEach((item) => { item.disabled = true; });
        try {
          await activateDesktopProject(desktopProjectId);
          wrap.dataset.open = "false";
          button.setAttribute("aria-expanded", "false");
        } catch (cause: unknown) {
          error = text(
          "Project switching could not be completed. Your current project remains active. Try again.",
          "Der Projektwechsel konnte nicht abgeschlossen werden. Dein aktuelles Projekt bleibt aktiv. Versuche es erneut.",
        );
          if (status) status.textContent = error;
        } finally {
          wrap.dataset.switching = "false";
          syncShellProjectSwitcher();
        }
      });
    });
  });
}

export function ensureShellProjectRegistryLoaded(): void {
  if (loaded || loading) return;
  loading = true;
  void refreshDesktopProjectRegistrySnapshot()
    .then(() => {
      loaded = true;
      error = null;
    })
    .catch((_cause: unknown) => {
      error = text(
        "Projects could not be loaded. Try opening the project menu again.",
        "Projekte konnten nicht geladen werden. Öffne das Projektmenü erneut.",
      );
    })
    .finally(() => {
      loading = false;
      syncShellProjectSwitcher();
    });
}

document.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  if (target.closest(".global-project-wrap")) return;
  document.querySelectorAll<HTMLElement>(".global-project-wrap[data-open='true']").forEach((item) => {
    item.dataset.open = "false";
    item.querySelector<HTMLButtonElement>("[data-shell-project]")?.setAttribute("aria-expanded", "false");
  });
});

onDesktopProjectRegistryChanged(() => syncShellProjectSwitcher());
onDesktopProjectActivated(() => {
  error = null;
  syncShellProjectSwitcher();
});
