import { invoke } from "@tauri-apps/api/core";
import { getLanguage } from "./i18n/runtime.js";
import { mountGitHubSourcePicker, type GitHubRepositorySummary } from "./github-source-picker.js";

const mounted = new WeakSet<HTMLElement>();
const text = <T>(en: T, de: T): T => getLanguage() === "de" ? de : en;
const esc = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character] ?? character);

type RepositoryInspection = {
  isRepository: boolean;
  localPath: string;
  repositoryId: string | null;
};

type GitHubCloneResult = {
  state: "cloned";
  repositoryId: string;
  localPath: string;
  detail: string;
};

function field(form: HTMLFormElement, name: string): HTMLInputElement | HTMLSelectElement | null {
  const value = form.elements.namedItem(name);
  return value instanceof HTMLInputElement || value instanceof HTMLSelectElement ? value : null;
}

function setField(form: HTMLFormElement, name: string, value: string): void {
  const target = field(form, name);
  if (!target) return;
  target.value = value;
  target.dispatchEvent(new Event("change", { bubbles: true }));
}

function localPath(form: HTMLFormElement): HTMLInputElement | null {
  const target = form.elements.namedItem("localPath");
  return target instanceof HTMLInputElement ? target : null;
}

function statusNode(form: HTMLFormElement): HTMLElement {
  let status = form.querySelector<HTMLElement>("[data-gh-local-status]");
  if (!status) {
    status = document.createElement("small");
    status.dataset.ghLocalStatus = "true";
    status.className = "fr-footnote";
    form.querySelector("[data-gh-local-actions]")?.after(status);
  }
  return status;
}

function localChoiceMarkup(repository: GitHubRepositorySummary): string {
  return `<div class="fr-github-local" data-gh-local-choice>
    <strong>${text("Local checkout", "Lokaler Checkout")}</strong>
    <span>${text(
      "Choose how this GitHub repository should be available locally. Nothing is cloned or linked without your explicit choice.",
      "Wähle, wie dieses GitHub-Repository lokal verfügbar sein soll. Ohne deine ausdrückliche Auswahl wird nichts geklont oder verknüpft.",
    )}</span>
    <div class="fr-actions" data-gh-local-actions>
      <button class="button secondary" data-gh-existing type="button">${text("Use existing checkout", "Vorhandenen Checkout verwenden")}</button>
      <button class="button primary" data-gh-clone type="button">${text("Clone locally", "Lokal klonen")}</button>
      <button class="button secondary" data-gh-later type="button">${text("Later / remote only", "Später / nur Remote")}</button>
    </div>
    <small>${text(
      `Clone is limited to ${repository.repositoryId} and only into an empty folder you choose. A successful clone still does not confirm this source automatically.`,
      `Das Klonen ist auf ${repository.repositoryId} begrenzt und erfolgt nur in einen von dir gewählten leeren Ordner. Auch ein erfolgreicher Clone bestätigt diese Quelle nicht automatisch.`,
    )}</small>
  </div>`;
}

async function chooseFolder(): Promise<string | null> {
  return invoke<string | null>("pick_first_run_folder");
}

function bindLocalChoices(form: HTMLFormElement, repository: GitHubRepositorySummary): void {
  form.querySelector<HTMLButtonElement>("[data-gh-existing]")?.addEventListener("click", async () => {
    const status = statusNode(form);
    status.textContent = text("Choose the existing checkout folder…", "Wähle den vorhandenen Checkout-Ordner…");
    try {
      const path = await chooseFolder();
      if (!path) {
        status.textContent = text("No folder selected.", "Kein Ordner ausgewählt.");
        return;
      }
      const inspection = await invoke<RepositoryInspection>("inspect_first_run_repository", { localPath: path });
      if (!inspection.isRepository || !inspection.repositoryId || inspection.repositoryId.toLowerCase() !== repository.repositoryId.toLowerCase()) {
        status.textContent = text(
          "The selected folder is not a checkout of the selected GitHub repository. No local binding was changed.",
          "Der gewählte Ordner ist kein Checkout des ausgewählten GitHub-Repositories. Die lokale Bindung wurde nicht geändert.",
        );
        return;
      }
      setField(form, "localPath", inspection.localPath);
      status.textContent = text("Existing checkout verified. Confirm the repository form to link it.", "Vorhandener Checkout geprüft. Bestätige das Repository-Formular, um ihn zu verknüpfen.");
    } catch (cause) {
      status.textContent = String(cause);
    }
  });

  form.querySelector<HTMLButtonElement>("[data-gh-clone]")?.addEventListener("click", async () => {
    const status = statusNode(form);
    status.textContent = text("Choose an empty destination folder for the clone…", "Wähle einen leeren Zielordner für den Clone…");
    try {
      const destinationPath = await chooseFolder();
      if (!destinationPath) {
        status.textContent = text("No folder selected.", "Kein Ordner ausgewählt.");
        return;
      }
      status.textContent = text("Cloning the selected repository…", "Das ausgewählte Repository wird geklont…");
      const result = await invoke<GitHubCloneResult>("github_clone_repository", {
        repositoryId: repository.repositoryId,
        numericId: repository.numericId,
        destinationPath,
      });
      if (result.state !== "cloned" || result.repositoryId.toLowerCase() !== repository.repositoryId.toLowerCase()) {
        throw new Error(text("GitHub clone result did not match the selected repository.", "Das GitHub-Clone-Ergebnis stimmt nicht mit dem ausgewählten Repository überein."));
      }
      setField(form, "localPath", result.localPath);
      status.textContent = text("Clone completed. Confirm the repository form to create the local binding.", "Clone abgeschlossen. Bestätige das Repository-Formular, um die lokale Bindung anzulegen.");
    } catch (cause) {
      status.textContent = String(cause);
    }
  });

  form.querySelector<HTMLButtonElement>("[data-gh-later]")?.addEventListener("click", () => {
    setField(form, "localPath", "");
    statusNode(form).textContent = text(
      "This source will remain remote-only until you explicitly link or clone a checkout.",
      "Diese Quelle bleibt nur Remote, bis du ausdrücklich einen Checkout verknüpfst oder klonst.",
    );
  });
}

function fillRepositoryForm(form: HTMLFormElement, repository: GitHubRepositorySummary): void {
  const previousRepositoryId = field(form, "repositoryId")?.value.trim() ?? "";
  const path = localPath(form);
  if (path && previousRepositoryId && previousRepositoryId.toLowerCase() !== repository.repositoryId.toLowerCase()) {
    path.value = "";
    path.dispatchEvent(new Event("change", { bubbles: true }));
  }

  setField(form, "provider", "github");
  setField(form, "repositoryId", repository.repositoryId);
  setField(form, "displayName", repository.displayName);
  setField(form, "remoteUrl", repository.remoteUrl);

  let selected = form.querySelector<HTMLElement>("[data-gh-selected]");
  if (!selected) {
    selected = document.createElement("div");
    selected.dataset.ghSelected = "true";
    selected.className = "fr-detected";
    form.prepend(selected);
  }
  selected.innerHTML = `<strong>GitHub</strong><span>${esc(repository.repositoryId)}${repository.private ? ` · 🔒 ${text("Private", "Privat")}` : ` · ${text("Public", "Öffentlich")}`} · ${esc(repository.defaultBranch)}</span>${localChoiceMarkup(repository)}`;
  bindLocalChoices(form, repository);
}

function install(): void {
  const form = document.querySelector<HTMLFormElement>("form[data-fr-primary], form[data-fr-additional]");
  if (!form || mounted.has(form)) return;
  mounted.add(form);

  const container = document.createElement("div");
  container.dataset.frGithubSourcePicker = "true";
  form.before(container);
  void mountGitHubSourcePicker(container, (repository) => fillRepositoryForm(form, repository));
}

const observer = new MutationObserver(() => install());
observer.observe(document.body, { childList: true, subtree: true });
install();
