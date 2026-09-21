import "./project-settings.css";
import {
  activateDesktopProject,
  detachDesktopProject,
  getActiveDesktopProject,
  getDesktopProjectRegistrySnapshot,
  pickDesktopProjectFolder,
  refreshDesktopProjectRegistrySnapshot,
  registerDesktopProject,
  renameDesktopProject,
  type DesktopProjectEntry,
} from "./desktop-project-registry.js";
import { getLanguage } from "./i18n/runtime.js";

const text = (en: string, de: string) => getLanguage() === "de" ? de : en;
const esc = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
})[character] ?? character);

let selectedProjectId: string | null = null;
let deleteProjectId: string | null = null;
let busy = false;
let feedback: { tone: "success" | "error" | "info"; text: string } | null = null;

const registeredProjects = (): DesktopProjectEntry[] =>
  (getDesktopProjectRegistrySnapshot()?.projects ?? []).filter((project) => project.state === "registered");

const selectedProject = (): DesktopProjectEntry | null => {
  const projects = registeredProjects();
  const requested = selectedProjectId ? projects.find((project) => project.desktopProjectId === selectedProjectId) : null;
  return requested ?? getActiveDesktopProject() ?? projects[0] ?? null;
};

const projectState = (project: DesktopProjectEntry) => {
  if (project.availability !== "available") return text("Local folder unavailable", "Lokaler Ordner nicht verfügbar");
  if (getDesktopProjectRegistrySnapshot()?.active?.desktopProjectId === project.desktopProjectId) {
    return text("Active", "Aktiv");
  }
  return text("Available", "Verfügbar");
};

const projectList = () => {
  const projects = registeredProjects();
  const activeId = getDesktopProjectRegistrySnapshot()?.active?.desktopProjectId;
  if (!projects.length) {
    return `<div class="project-settings-empty">
      <strong>${text("No projects configured", "Keine Projekte eingerichtet")}</strong>
      <p>${text("Add a local project folder to start managing it with Livariant.", "Füge einen lokalen Projektordner hinzu, um ihn mit Livariant zu verwalten.")}</p>
    </div>`;
  }

  return projects.map((project) => `
    <button class="project-settings-row${selectedProject()?.desktopProjectId === project.desktopProjectId ? " selected" : ""}" type="button" data-project-settings-select="${esc(project.desktopProjectId)}">
      <span class="project-settings-row-icon">⌑</span>
      <span><strong>${esc(project.displayName)}</strong><small>${esc(project.localRoot)}</small></span>
      <span class="project-settings-row-state${activeId === project.desktopProjectId ? " active" : ""}">${esc(projectState(project))}</span>
    </button>`).join("");
};

const detailPanel = () => {
  const project = selectedProject();
  if (!project) return "";
  const active = getDesktopProjectRegistrySnapshot()?.active?.desktopProjectId === project.desktopProjectId;
  return `
    <section class="project-settings-detail">
      <div class="project-settings-detail-head">
        <div><span class="eyebrow">${text("Project settings", "Projekteinstellungen")}</span><h3>${esc(project.displayName)}</h3></div>
        ${active ? `<span class="project-settings-active-badge">${text("Active project", "Aktives Projekt")}</span>` : ""}
      </div>

      <div class="project-settings-field">
        <label for="project-settings-name">${text("Project name", "Projektname")}</label>
        <div class="project-settings-inline">
          <input id="project-settings-name" type="text" maxlength="160" value="${esc(project.displayName)}" data-project-settings-name />
          <button type="button" class="project-settings-secondary" data-project-settings-rename ${busy ? "disabled" : ""}>${text("Save", "Speichern")}</button>
        </div>
        <small>${text("This changes only Livariant's display name for the project.", "Dies ändert nur den Anzeigenamen des Projekts in Livariant.")}</small>
      </div>

      <div class="project-settings-meta-grid">
        <div><small>${text("Local project folder", "Lokaler Projektordner")}</small><strong title="${esc(project.localRoot)}">${esc(project.localRoot)}</strong></div>
        <div><small>${text("Availability", "Verfügbarkeit")}</small><strong>${esc(projectState(project))}</strong></div>
        <div><small>Project ID</small><strong>${esc(project.projectId ?? "—")}</strong></div>
        <div><small>${text("Stable identity", "Stabile Identität")}</small><strong>${esc(project.stableProjectIdentity ?? "—")}</strong></div>
      </div>

      <div class="project-settings-actions">
        ${!active ? `<button type="button" class="project-settings-primary" data-project-settings-activate ${project.availability !== "available" || busy ? "disabled" : ""}>${text("Make active", "Als aktiv setzen")}</button>` : ""}
        <button type="button" class="project-settings-secondary" data-project-settings-sources ${busy ? "disabled" : ""}>${text("Manage repositories & sources", "Repositories & Quellen verwalten")}</button>
      </div>

      <section class="project-settings-danger">
        <div><strong>${text("Remove project from Livariant", "Projekt aus Livariant entfernen")}</strong>
        <p>${text(
          "Removes the project from Livariant's active project list. Repository files, the local checkout and remote repositories are not deleted.",
          "Entfernt das Projekt aus Livariants aktiver Projektliste. Repository-Dateien, der lokale Checkout und Remote-Repositories werden nicht gelöscht.",
        )}</p></div>
        <button type="button" data-project-settings-delete-open ${busy ? "disabled" : ""}>${text("Remove project…", "Projekt entfernen…")}</button>
      </section>
    </section>`;
};

const deleteDialog = () => {
  const project = deleteProjectId ? registeredProjects().find((item) => item.desktopProjectId === deleteProjectId) : null;
  if (!project) return "";
  return `
    <div class="project-delete-backdrop" data-project-delete-backdrop>
      <section class="project-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="project-delete-title">
        <span class="eyebrow">${text("Confirmation required", "Bestätigung erforderlich")}</span>
        <h3 id="project-delete-title">${text("Remove project from Livariant?", "Projekt aus Livariant entfernen?")}</h3>
        <p>${text(
          "This removes Livariant's registration for this project. It does not delete the project folder, Git repository or remote repository.",
          "Dadurch wird die Registrierung dieses Projekts in Livariant entfernt. Projektordner, Git-Repository und Remote-Repository werden nicht gelöscht.",
        )}</p>
        <div class="project-delete-name"><span>${text("Type the project name to confirm:", "Gib zur Bestätigung den Projektnamen ein:")}</span><strong>${esc(project.displayName)}</strong></div>
        <input type="text" autocomplete="off" spellcheck="false" data-project-delete-confirm-input placeholder="${esc(project.displayName)}" />
        <div class="project-delete-actions">
          <button type="button" class="project-settings-secondary" data-project-delete-cancel>${text("Cancel", "Abbrechen")}</button>
          <button type="button" class="project-delete-confirm" data-project-delete-confirm disabled>${text("Remove permanently from Livariant", "Endgültig aus Livariant entfernen")}</button>
        </div>
      </section>
    </div>`;
};

export function renderProjectSettingsView(): string {
  const projects = registeredProjects();
  return `
    <section class="settings-panel project-settings-panel">
      <div class="project-settings-title">
        <div><span class="eyebrow">${text("Workspace", "Arbeitsbereich")}</span><h2>${text("Projects", "Projekte")}</h2>
        <p>${text("Switch projects, add local projects and manage each project's Livariant registration.", "Wechsle Projekte, füge lokale Projekte hinzu und verwalte die Livariant-Registrierung jedes Projekts.")}</p></div>
        <button type="button" class="project-settings-primary" data-project-settings-add ${busy ? "disabled" : ""}>+ ${text("Add project", "Projekt hinzufügen")}</button>
      </div>
      ${feedback ? `<div class="project-settings-feedback ${feedback.tone}">${esc(feedback.text)}</div>` : ""}
      <div class="project-settings-layout">
        <div class="project-settings-list"><div class="project-settings-list-head"><strong>${text("Configured projects", "Eingerichtete Projekte")}</strong><span>${projects.length}</span></div>${projectList()}</div>
        ${detailPanel()}
      </div>
      ${deleteDialog()}
    </section>`;
}

export async function refreshProjectSettings(): Promise<void> {
  await refreshDesktopProjectRegistrySnapshot();
  if (selectedProjectId && !registeredProjects().some((project) => project.desktopProjectId === selectedProjectId)) {
    selectedProjectId = null;
  }
}

export function bindProjectSettingsEvents(rerender: () => void, closeSettings: () => void): void {
  document.querySelectorAll<HTMLButtonElement>("[data-project-settings-select]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedProjectId = button.dataset.projectSettingsSelect ?? null;
      feedback = null;
      rerender();
    });
  });

  document.querySelector<HTMLButtonElement>("[data-project-settings-add]")?.addEventListener("click", async () => {
    if (busy) return;
    busy = true; feedback = null; rerender();
    try {
      const folder = await pickDesktopProjectFolder();
      if (!folder) return;
      const snapshot = await registerDesktopProject(folder);
      const project = snapshot.projects.find((item) => item.state === "registered" && item.localRoot.toLowerCase() === folder.toLowerCase())
        ?? snapshot.projects.filter((item) => item.state === "registered").at(-1);
      if (project) {
        selectedProjectId = project.desktopProjectId;
        if (project.availability === "available") await activateDesktopProject(project.desktopProjectId);
      }
      feedback = { tone: "success", text: text("Project added to Livariant.", "Projekt wurde zu Livariant hinzugefügt.") };
    } catch {
      feedback = { tone: "error", text: text("The project could not be added. No project files were changed.", "Das Projekt konnte nicht hinzugefügt werden. Es wurden keine Projektdateien verändert.") };
    } finally {
      busy = false; rerender();
    }
  });

  document.querySelector<HTMLButtonElement>("[data-project-settings-rename]")?.addEventListener("click", async () => {
    const project = selectedProject();
    const name = document.querySelector<HTMLInputElement>("[data-project-settings-name]")?.value.trim() ?? "";
    if (!project || !name || busy) return;
    busy = true; feedback = null; rerender();
    try {
      await renameDesktopProject(project.desktopProjectId, name);
      feedback = { tone: "success", text: text("Project name saved.", "Projektname gespeichert.") };
    } catch {
      feedback = { tone: "error", text: text("The project name could not be saved.", "Der Projektname konnte nicht gespeichert werden.") };
    } finally { busy = false; rerender(); }
  });

  document.querySelector<HTMLButtonElement>("[data-project-settings-activate]")?.addEventListener("click", async () => {
    const project = selectedProject();
    if (!project || busy) return;
    busy = true; feedback = null; rerender();
    try {
      await activateDesktopProject(project.desktopProjectId);
      feedback = { tone: "success", text: text("Active project changed.", "Aktives Projekt wurde gewechselt.") };
    } catch {
      feedback = { tone: "error", text: text("The project could not be activated.", "Das Projekt konnte nicht aktiviert werden.") };
    } finally { busy = false; rerender(); }
  });

  document.querySelector<HTMLButtonElement>("[data-project-settings-sources]")?.addEventListener("click", () => {
    closeSettings();
    window.setTimeout(() => document.querySelector<HTMLButtonElement>("nav.nav [data-view='source-review']")?.click(), 0);
  });

  document.querySelector<HTMLButtonElement>("[data-project-settings-delete-open]")?.addEventListener("click", () => {
    deleteProjectId = selectedProject()?.desktopProjectId ?? null;
    feedback = null;
    rerender();
  });

  document.querySelector<HTMLButtonElement>("[data-project-delete-cancel]")?.addEventListener("click", () => {
    deleteProjectId = null;
    rerender();
  });

  document.querySelector<HTMLElement>("[data-project-delete-backdrop]")?.addEventListener("click", (event) => {
    if (event.target !== event.currentTarget) return;
    deleteProjectId = null;
    rerender();
  });

  const confirmInput = document.querySelector<HTMLInputElement>("[data-project-delete-confirm-input]");
  const confirmButton = document.querySelector<HTMLButtonElement>("[data-project-delete-confirm]");
  const deleteTarget = deleteProjectId ? registeredProjects().find((item) => item.desktopProjectId === deleteProjectId) : null;
  confirmInput?.addEventListener("input", () => {
    if (confirmButton && deleteTarget) confirmButton.disabled = confirmInput.value !== deleteTarget.displayName || busy;
  });
  confirmButton?.addEventListener("click", async () => {
    if (!deleteTarget || confirmInput?.value !== deleteTarget.displayName || busy) return;
    busy = true; confirmButton.disabled = true;
    try {
      await detachDesktopProject(deleteTarget.desktopProjectId);
      selectedProjectId = null;
      deleteProjectId = null;
      feedback = { tone: "success", text: text("Project removed from Livariant. Project files were not deleted.", "Projekt wurde aus Livariant entfernt. Projektdateien wurden nicht gelöscht.") };
    } catch {
      feedback = { tone: "error", text: text("The project could not be removed.", "Das Projekt konnte nicht entfernt werden.") };
    } finally { busy = false; rerender(); }
  });
}
