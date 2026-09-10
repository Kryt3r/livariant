import { invoke } from "@tauri-apps/api/core";
import { getLanguage } from "./i18n/runtime.js";

type GitHubConnectionStatus = {
  state: "not-configured" | "disconnected" | "connected";
  connected: boolean;
  configured: boolean;
  login: string | null;
  detail: string;
};

type GitHubDeviceAuthorization = {
  state: "verification-required";
  userCode: string;
  verificationUri: string;
  expiresAt: number;
  intervalSeconds: number;
};

type GitHubDevicePollResult = {
  state: "pending" | "connected" | "expired" | "failed";
  connected: boolean;
  login: string | null;
  retryAfterSeconds: number | null;
  detail: string;
};

export type GitHubRepositorySummary = {
  repositoryId: string;
  numericId: number;
  displayName: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  remoteUrl: string;
  htmlUrl: string;
  archived: boolean;
};

const text = <T>(en: T, de: T): T => getLanguage() === "de" ? de : en;
const esc = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character] ?? character);

export async function mountGitHubSourcePicker(
  container: HTMLElement,
  onSelect: (repository: GitHubRepositorySummary) => void,
): Promise<() => void> {
  let status: GitHubConnectionStatus | null = null;
  let authorization: GitHubDeviceAuthorization | null = null;
  let repositories: GitHubRepositorySummary[] = [];
  let error: string | null = null;
  let disposed = false;
  let timer: number | null = null;

  const clearTimer = () => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
  };

  const loadRepositories = async () => {
    try {
      repositories = await invoke<GitHubRepositorySummary[]>("github_list_repositories");
      error = null;
    } catch (cause) {
      error = String(cause);
      repositories = [];
    }
  };

  const render = () => {
    if (disposed) return;
    if (!status) {
      container.innerHTML = `<div class="fr-github-card"><strong>${text("Checking GitHub…", "GitHub wird geprüft…")}</strong></div>`;
      return;
    }
    if (!status.configured) {
      container.innerHTML = `<div class="fr-github-card muted"><div><strong>GitHub</strong><span>${text("GitHub repository selection is not configured in this build yet. Manual repository entry remains available below.", "Die GitHub-Repository-Auswahl ist in diesem Build noch nicht konfiguriert. Die manuelle Repository-Eingabe darunter bleibt verfügbar.")}</span></div></div>`;
      return;
    }
    if (!status.connected) {
      container.innerHTML = `<div class="fr-github-card"><div><strong>${text("Choose from GitHub", "Aus GitHub auswählen")}</strong><span>${text("Connect GitHub to list repositories you explicitly authorized, including private repositories.", "Verbinde GitHub, um die ausdrücklich freigegebenen Repositories einschließlich privater Repositories auszuwählen.")}</span></div>
        ${authorization ? `<div class="fr-github-device"><span>${text("Enter this code on GitHub", "Gib diesen Code bei GitHub ein")}</span><code>${esc(authorization.userCode)}</code><button class="button secondary" data-gh-open type="button">${text("Open GitHub", "GitHub öffnen")}</button><small>${text("Livariant waits for your confirmation. The connection itself grants no project-change permission.", "Livariant wartet auf deine Bestätigung. Die Verbindung selbst erteilt keine Berechtigung für Projektänderungen.")}</small></div>` : `<button class="button primary" data-gh-connect type="button">${text("Connect GitHub", "GitHub verbinden")}</button>`}
        ${error ? `<small class="fr-github-error">${esc(error)}</small>` : ""}</div>`;
      container.querySelector<HTMLButtonElement>("[data-gh-connect]")?.addEventListener("click", () => void beginAuthorization());
      container.querySelector<HTMLButtonElement>("[data-gh-open]")?.addEventListener("click", () => void invoke("github_open_verification_page"));
      return;
    }

    container.innerHTML = `<div class="fr-github-card"><div class="fr-github-head"><div><strong>${text("GitHub connected", "GitHub verbunden")}</strong><span>${esc(status.login ?? "GitHub")}</span></div><span class="fr-provider-state ok">${text("Read access", "Lesezugriff")}</span></div>
      <label class="fr-github-search"><span>${text("Find repository", "Repository suchen")}</span><input data-gh-search type="search" placeholder="${text("Name or owner…", "Name oder Besitzer…")}"/></label>
      <div class="fr-github-repositories" data-gh-list>${repositoryMarkup(repositories)}</div>
      ${error ? `<small class="fr-github-error">${esc(error)}</small>` : ""}</div>`;

    const search = container.querySelector<HTMLInputElement>("[data-gh-search]");
    const list = container.querySelector<HTMLElement>("[data-gh-list]");
    search?.addEventListener("input", () => {
      const needle = search.value.trim().toLowerCase();
      const filtered = needle ? repositories.filter((repo) => `${repo.repositoryId} ${repo.displayName}`.toLowerCase().includes(needle)) : repositories;
      if (list) list.innerHTML = repositoryMarkup(filtered);
      bindRepositoryButtons();
    });
    bindRepositoryButtons();
  };

  const repositoryMarkup = (items: GitHubRepositorySummary[]) => items.length
    ? items.map((repo) => `<button class="fr-github-repository" data-gh-repo="${esc(repo.repositoryId)}" type="button"><div><strong>${esc(repo.repositoryId)}</strong><span>${esc(repo.defaultBranch)}${repo.archived ? ` · ${text("archived", "archiviert")}` : ""}</span></div><em>${repo.private ? `🔒 ${text("Private", "Privat")}` : text("Public", "Öffentlich")}</em></button>`).join("")
    : `<div class="fr-empty"><strong>${text("No repositories available", "Keine Repositories verfügbar")}</strong><span>${text("Only repositories exposed by the authorized GitHub App/user connection are shown.", "Es werden nur Repositories angezeigt, die über die autorisierte GitHub-App-/Benutzerverbindung freigegeben sind.")}</span></div>`;

  const bindRepositoryButtons = () => {
    container.querySelectorAll<HTMLButtonElement>("[data-gh-repo]").forEach((button) => button.addEventListener("click", () => {
      const repository = repositories.find((item) => item.repositoryId === button.dataset.ghRepo);
      if (repository) onSelect(repository);
    }));
  };

  const poll = async (delaySeconds: number) => {
    clearTimer();
    timer = window.setTimeout(async () => {
      if (disposed) return;
      try {
        const result = await invoke<GitHubDevicePollResult>("github_poll_device_authorization");
        if (result.connected) {
          status = { state: "connected", connected: true, configured: true, login: result.login, detail: result.detail };
          authorization = null;
          await loadRepositories();
          render();
          return;
        }
        if (result.state === "pending") {
          render();
          void poll(result.retryAfterSeconds ?? delaySeconds);
          return;
        }
        authorization = null;
        error = result.detail;
        render();
      } catch (cause) {
        authorization = null;
        error = String(cause);
        render();
      }
    }, Math.max(5, delaySeconds) * 1000);
  };

  const beginAuthorization = async () => {
    try {
      authorization = await invoke<GitHubDeviceAuthorization>("github_begin_device_authorization");
      error = null;
      render();
      await invoke("github_open_verification_page");
      void poll(authorization.intervalSeconds);
    } catch (cause) {
      error = String(cause);
      render();
    }
  };

  try {
    status = await invoke<GitHubConnectionStatus>("github_connection_status");
    if (status.connected) await loadRepositories();
  } catch (cause) {
    status = { state: "disconnected", connected: false, configured: true, login: null, detail: String(cause) };
    error = String(cause);
  }
  render();

  return () => {
    disposed = true;
    clearTimer();
  };
}
