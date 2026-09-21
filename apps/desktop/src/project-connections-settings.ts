import "./project-connections-settings.css";
import { invoke } from "@tauri-apps/api/core";
import { getLanguage } from "./i18n/runtime.js";
import { onDesktopProjectActivated } from "./desktop-project-registry.js";
import {
  loadFirstRunLifecycle,
  transitionFirstRunLifecycle,
  type FirstRunLifecycleAction,
  type FirstRunLifecycleSnapshot,
} from "./first-run-lifecycle.js";

type RepositoryIdentity = {
  provider: "github" | "git";
  repositoryId: string;
  displayName: string;
  remoteUrl?: string;
};

type ProjectSourceRegistry = {
  projectId: string;
  primary: {
    kind: "primary";
    identity: RepositoryIdentity;
    local?: { localPath: string };
  };
  additional: Array<{
    kind: "additional";
    identity: RepositoryIdentity;
    description: string;
    local?: { localPath: string };
  }>;
};

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

type RepositoryInspection = {
  isRepository: boolean;
  localPath: string;
  repositoryId: string | null;
};

type PendingConfirmation =
  | { kind: "disconnect-github" }
  | { kind: "remote-only"; identity: RepositoryIdentity }
  | { kind: "remove-source"; identity: RepositoryIdentity };

let githubStatus: GitHubConnectionStatus | null = null;
let sourceRegistry: ProjectSourceRegistry | null = null;
let loading = false;
let busyKey: string | null = null;
let error: string | null = null;
let notice: string | null = null;
let authorization: GitHubDeviceAuthorization | null = null;
let pollTimer: number | null = null;
let activeRerender: (() => void) | null = null;
let pendingConfirmation: PendingConfirmation | null = null;
let projectActivationGeneration = 0;

onDesktopProjectActivated(() => {
  projectActivationGeneration += 1;
  sourceRegistry = null;
  loading = false;
  if (busyKey !== "github") busyKey = null;
  error = null;
  notice = null;
  pendingConfirmation = null;
  activeRerender?.();
  if (!activeRerender) return;
  return refreshProjectConnectionsSettings().then(() => activeRerender?.());
});

const text = <T>(en: T, de: T): T => getLanguage() === "de" ? de : en;
const connectionError = (action: "load" | "connect" | "manage"): string => {
  if (action === "load") return text(
    "Connection settings could not be loaded. Try refreshing this section.",
    "Verbindungseinstellungen konnten nicht geladen werden. Aktualisiere diesen Bereich erneut.",
  );
  if (action === "connect") return text(
    "GitHub connection could not be completed. Check your network connection and try again.",
    "Die GitHub-Verbindung konnte nicht abgeschlossen werden. Prüfe deine Netzwerkverbindung und versuche es erneut.",
  );
  return text(
    "This connection change could not be saved. Nothing was deleted. Try again.",
    "Diese Verbindungsänderung konnte nicht gespeichert werden. Es wurde nichts gelöscht. Versuche es erneut.",
  );
};
const esc = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character] ?? character);

function displayLocalPath(localPath: string): string {
  const value = localPath.trim();
  if (value.startsWith("\\\\?\\UNC\\")) return `\\\\${value.slice(8)}`;
  if (value.startsWith("\\\\?\\")) return value.slice(4);
  return value;
}

function registryFrom(snapshot: FirstRunLifecycleSnapshot): ProjectSourceRegistry | null {
  const state = snapshot.onboardingState as {
    project?: { sourceRegistry?: ProjectSourceRegistry };
  };
  return state.project?.sourceRegistry ?? null;
}

function updateFromSnapshot(snapshot: FirstRunLifecycleSnapshot): void {
  sourceRegistry = registryFrom(snapshot);
}

export async function refreshProjectConnectionsSettings(): Promise<void> {
  const generation = projectActivationGeneration;
  loading = true;
  error = null;
  try {
    const [github, lifecycle] = await Promise.all([
      invoke<GitHubConnectionStatus>("github_connection_status"),
      loadFirstRunLifecycle(),
    ]);
    if (generation !== projectActivationGeneration) return;
    githubStatus = github;
    updateFromSnapshot(lifecycle);
  } catch (_cause) {
    if (generation !== projectActivationGeneration) return;
    error = connectionError("load");
  } finally {
    if (generation === projectActivationGeneration) loading = false;
  }
}

const statusBadge = () => {
  if (!githubStatus?.configured) return `<span class="project-connection-badge muted">${text("Not configured", "Nicht konfiguriert")}</span>`;
  if (githubStatus.connected) return `<span class="project-connection-badge ok">${text("Read access", "Lesezugriff")}</span>`;
  return `<span class="project-connection-badge warning">${text("Disconnected", "Getrennt")}</span>`;
};

const githubConnectionMarkup = () => {
  if (loading && !githubStatus) {
    return `<article class="project-connection-card"><strong>${text("Checking GitHub…", "GitHub wird geprüft…")}</strong></article>`;
  }

  if (!githubStatus?.configured) {
    return `<article class="project-connection-card">
      <div class="project-connection-card-head"><div><small>GitHub</small><strong>${text("Production connection unavailable", "Produktionsverbindung nicht verfügbar")}</strong></div>${statusBadge()}</div>
      <p>${text("This build has no configured GitHub App client identity.", "Dieser Build enthält keine konfigurierte GitHub-App-Client-Identität.")}</p>
    </article>`;
  }

  if (!githubStatus.connected) {
    return `<article class="project-connection-card">
      <div class="project-connection-card-head"><div><small>GitHub</small><strong>${text("GitHub disconnected", "GitHub getrennt")}</strong></div>${statusBadge()}</div>
      <p>${text("Reconnect to discover and inspect repositories authorized through the Livariant GitHub App.", "Verbinde GitHub erneut, um über die Livariant GitHub App freigegebene Repositories zu entdecken und zu prüfen.")}</p>
      ${authorization ? `<div class="project-github-device"><span>${text("Enter this code on GitHub", "Gib diesen Code bei GitHub ein")}</span><code>${esc(authorization.userCode)}</code><button class="button secondary" data-project-gh-open type="button">${text("Open GitHub", "GitHub öffnen")}</button></div>` : `<button class="button primary" data-project-gh-connect type="button" ${busyKey ? "disabled" : ""}>${text("Connect GitHub", "GitHub verbinden")}</button>`}
    </article>`;
  }

  return `<article class="project-connection-card">
    <div class="project-connection-card-head"><div><small>GitHub</small><strong>${esc(githubStatus.login ?? "GitHub")}</strong><span>${text("Authorized repository discovery and read access", "Autorisierte Repository-Erkennung und Lesezugriff")}</span></div>${statusBadge()}</div>
    <div class="project-connection-actions">
      <button class="button secondary" data-project-gh-refresh type="button" ${busyKey ? "disabled" : ""}>${text("Refresh", "Aktualisieren")}</button>
      <button class="button secondary project-danger-soft" data-project-gh-disconnect type="button" ${busyKey ? "disabled" : ""}>${text("Disconnect GitHub", "GitHub trennen")}</button>
    </div>
    <p class="project-connection-boundary">${text("Disconnecting GitHub does not remove repositories from this project and never deletes local checkouts.", "Das Trennen von GitHub entfernt keine Repositories aus diesem Projekt und löscht niemals lokale Checkouts.")}</p>
  </article>`;
};

function sourceLocalMarkup(localPath: string | undefined): string {
  return localPath?.trim()
    ? `<span class="project-source-local linked" title="${esc(displayLocalPath(localPath))}">${esc(displayLocalPath(localPath))}</span>`
    : `<span class="project-source-local remote">${text("Remote only", "Nur Remote")}</span>`;
}

function sourceIdentityData(identity: RepositoryIdentity): string {
  return esc(JSON.stringify(identity));
}

const primarySourceMarkup = () => {
  if (!sourceRegistry) return "";
  const source = sourceRegistry.primary;
  const busy = busyKey === `primary:${source.identity.repositoryId}`;
  return `<article class="project-source-manage-card primary">
    <div class="project-source-manage-head"><div><span class="project-source-kind">${text("Primary repository", "Hauptrepository")}</span><strong>${esc(source.identity.displayName)}</strong><small>${esc(source.identity.repositoryId)}</small></div><span class="project-source-protected">${text("Protected", "Geschützt")}</span></div>
    <div class="project-source-manage-local"><small>${text("Local checkout", "Lokaler Checkout")}</small>${sourceLocalMarkup(source.local?.localPath)}</div>
    <div class="project-source-manage-actions">
      <button class="button secondary" data-source-primary-checkout type="button" ${busy ? "disabled" : ""}>${text("Change checkout", "Checkout ändern")}</button>
    </div>
    <p>${text("The primary repository remains required for this project and cannot be removed here. Changing the checkout only changes Livariant's local association; no files are moved or deleted.", "Das Hauptrepository bleibt für dieses Projekt erforderlich und kann hier nicht entfernt werden. Ein Checkout-Wechsel ändert nur Livariants lokale Zuordnung; Dateien werden weder verschoben noch gelöscht.")}</p>
  </article>`;
};

const additionalSourceMarkup = (source: ProjectSourceRegistry["additional"][number]) => {
  const key = source.identity.repositoryId;
  const busy = busyKey === `additional:${key}`;
  return `<article class="project-source-manage-card" data-source-card="${esc(key)}">
    <div class="project-source-manage-head"><div><span class="project-source-kind">${text("Additional repository", "Zusätzliches Repository")}</span><strong>${esc(source.identity.displayName)}</strong><small>${esc(source.identity.repositoryId)}</small></div><span class="project-source-provider">${esc(source.identity.provider)}</span></div>
    <label class="project-source-description"><span>${text("Purpose in this project", "Zweck in diesem Projekt")}</span><input type="text" data-source-description value="${esc(source.description)}" ${busy ? "disabled" : ""}/></label>
    <div class="project-source-manage-local"><small>${text("Local checkout", "Lokaler Checkout")}</small>${sourceLocalMarkup(source.local?.localPath)}</div>
    <div class="project-source-manage-actions">
      <button class="button secondary" data-source-save-description data-source-identity="${sourceIdentityData(source.identity)}" type="button" ${busy ? "disabled" : ""}>${text("Save description", "Beschreibung speichern")}</button>
      <button class="button secondary" data-source-checkout data-source-identity="${sourceIdentityData(source.identity)}" type="button" ${busy ? "disabled" : ""}>${text("Change checkout", "Checkout ändern")}</button>
      ${source.local?.localPath ? `<button class="button secondary" data-source-remote-only data-source-identity="${sourceIdentityData(source.identity)}" type="button" ${busy ? "disabled" : ""}>${text("Remote only", "Nur Remote")}</button>` : ""}
      <button class="button secondary project-danger-soft" data-source-remove data-source-identity="${sourceIdentityData(source.identity)}" type="button" ${busy ? "disabled" : ""}>${text("Remove from project", "Aus Projekt entfernen")}</button>
    </div>
    <p>${text("Removing this association never deletes the remote repository or any local checkout.", "Das Entfernen dieser Zuordnung löscht weder das Remote-Repository noch einen lokalen Checkout.")}</p>
  </article>`;
};

const repositoriesMarkup = () => {
  if (!sourceRegistry) {
    return `<div class="project-source-empty"><strong>${text("No project repository registry is configured yet.", "Für dieses Projekt ist noch kein Repository-Register konfiguriert.")}</strong></div>`;
  }
  return `<div class="project-source-manage-list">${primarySourceMarkup()}${sourceRegistry.additional.map(additionalSourceMarkup).join("")}</div>`;
};

function confirmationMarkup(): string {
  if (!pendingConfirmation) return "";

  if (pendingConfirmation.kind === "disconnect-github") {
    return `<div class="project-confirm-backdrop" data-project-confirm-backdrop>
      <section class="project-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="project-confirm-title">
        <div class="project-confirm-icon">GH</div>
        <div class="project-confirm-copy">
          <span class="eyebrow">GitHub</span>
          <h3 id="project-confirm-title">${text("Disconnect GitHub?", "GitHub trennen?")}</h3>
          <p>${text(
            "Livariant removes only the locally stored protected GitHub credential. The GitHub-side app authorization is not revoked here and must be revoked separately in GitHub if you want to remove it there. Project repository associations and every local checkout remain unchanged.",
            "Livariant entfernt nur das lokal gespeicherte geschützte GitHub-Credential. Die GitHub-seitige App-Autorisierung wird hier nicht widerrufen und muss bei Bedarf separat in GitHub widerrufen werden. Projekt-Repository-Zuordnungen und alle lokalen Checkouts bleiben unverändert.",
          )}</p>
        </div>
        <div class="project-confirm-boundary">${text(
          "No repository or local file will be deleted.",
          "Kein Repository und keine lokale Datei wird gelöscht.",
        )}</div>
        <div class="project-confirm-actions">
          <button class="button secondary" data-project-confirm-cancel type="button">${text("Cancel", "Abbrechen")}</button>
          <button class="button project-confirm-action" data-project-confirm-accept type="button">${text("Disconnect GitHub", "GitHub trennen")}</button>
        </div>
      </section>
    </div>`;
  }

  const identity = pendingConfirmation.identity;
  const repository = esc(identity.repositoryId);
  if (pendingConfirmation.kind === "remote-only") {
    return `<div class="project-confirm-backdrop" data-project-confirm-backdrop>
      <section class="project-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="project-confirm-title">
        <div class="project-confirm-icon">↗</div>
        <div class="project-confirm-copy">
          <span class="eyebrow">${text("Local checkout", "Lokaler Checkout")}</span>
          <h3 id="project-confirm-title">${text("Switch to Remote only?", "Auf „Nur Remote“ umstellen?")}</h3>
          <p>${text(
            `Livariant removes only the local checkout association for ${identity.repositoryId}. The folder stays untouched on this computer and the GitHub repository remains unchanged.`,
            `Livariant entfernt nur die lokale Checkout-Zuordnung für ${identity.repositoryId}. Der Ordner bleibt auf diesem Computer unverändert und das GitHub-Repository bleibt bestehen.`,
          )}</p>
        </div>
        <div class="project-confirm-repository">${repository}</div>
        <div class="project-confirm-boundary">${text(
          "Afterwards Livariant keeps this source as Remote only. Nothing is deleted.",
          "Danach führt Livariant diese Quelle als „Nur Remote“. Es wird nichts gelöscht.",
        )}</div>
        <div class="project-confirm-actions">
          <button class="button secondary" data-project-confirm-cancel type="button">${text("Cancel", "Abbrechen")}</button>
          <button class="button project-confirm-action" data-project-confirm-accept type="button">${text("Switch to Remote only", "Auf Nur Remote umstellen")}</button>
        </div>
      </section>
    </div>`;
  }

  return `<div class="project-confirm-backdrop" data-project-confirm-backdrop>
    <section class="project-confirm-dialog danger" role="alertdialog" aria-modal="true" aria-labelledby="project-confirm-title">
      <div class="project-confirm-icon">−</div>
      <div class="project-confirm-copy">
        <span class="eyebrow">${text("Project source", "Projektquelle")}</span>
        <h3 id="project-confirm-title">${text("Remove repository from this project?", "Repository aus diesem Projekt entfernen?")}</h3>
        <p>${text(
          `${identity.repositoryId} is removed only from this Livariant project's source registry. Local files and the GitHub repository remain untouched.`,
          `${identity.repositoryId} wird nur aus dem Quellenregister dieses Livariant-Projekts entfernt. Lokale Dateien und das GitHub-Repository bleiben unverändert.`,
        )}</p>
      </div>
      <div class="project-confirm-repository">${repository}</div>
      <div class="project-confirm-boundary">${text(
        "This does not delete the repository, its checkout, or project-owned files.",
        "Dabei werden weder das Repository noch sein Checkout oder projekt-eigene Dateien gelöscht.",
      )}</div>
      <div class="project-confirm-actions">
        <button class="button secondary" data-project-confirm-cancel type="button">${text("Cancel", "Abbrechen")}</button>
        <button class="button project-confirm-action danger" data-project-confirm-accept type="button">${text("Remove association", "Zuordnung entfernen")}</button>
      </div>
    </section>
  </div>`;
}

export function renderProjectConnectionsSettings(): string {
  return `<section class="project-connections-settings" aria-label="${text("GitHub and project repositories", "GitHub und Projekt-Repositories")}">
    <div class="project-connections-section-head"><div><span class="eyebrow">GitHub</span><h3>${text("GitHub connection", "GitHub-Verbindung")}</h3><p>${text("Manage the account connection separately from repositories associated with this project.", "Verwalte die Account-Verbindung getrennt von den diesem Projekt zugeordneten Repositories.")}</p></div></div>
    ${error ? `<div class="project-connections-error">${esc(error)}</div>` : ""}
    ${notice ? `<div class="project-connections-notice">${esc(notice)}</div>` : ""}
    ${githubConnectionMarkup()}
    <div class="project-connections-section-head repositories"><div><span class="eyebrow">${text("Project sources", "Projektquellen")}</span><h3>${text("Associated repositories", "Zugeordnete Repositories")}</h3><p>${text("Edit local bindings and semantic descriptions or remove additional repository associations.", "Bearbeite lokale Zuordnungen und semantische Beschreibungen oder entferne zusätzliche Repository-Zuordnungen.")}</p></div><span class="project-source-count">${sourceRegistry ? 1 + sourceRegistry.additional.length : 0}</span></div>
    ${repositoriesMarkup()}
    ${confirmationMarkup()}
  </section>`;
}

function identityFrom(element: HTMLElement): RepositoryIdentity | null {
  const raw = element.dataset.sourceIdentity;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RepositoryIdentity;
    return parsed?.repositoryId ? parsed : null;
  } catch {
    return null;
  }
}

async function transitionForCurrentProject(action: FirstRunLifecycleAction): Promise<FirstRunLifecycleSnapshot | null> {
  const generation = projectActivationGeneration;
  const snapshot = await transitionFirstRunLifecycle(action);
  return generation === projectActivationGeneration ? snapshot : null;
}

async function applyAction(action: FirstRunLifecycleAction, key: string, rerender: () => void): Promise<void> {
  busyKey = key;
  error = null;
  notice = null;
  rerender();
  try {
    const snapshot = await transitionForCurrentProject(action);
    if (!snapshot) return;
    updateFromSnapshot(snapshot);
    notice = text("Project repository settings updated.", "Projekt-Repository-Einstellungen wurden aktualisiert.");
  } catch (cause) {
    error = connectionError("manage");
  } finally {
    busyKey = null;
    rerender();
  }
}

async function verifiedCheckout(identity: RepositoryIdentity): Promise<string | null> {
  const path = await invoke<string | null>("pick_first_run_folder");
  if (!path) return null;
  const inspection = await invoke<RepositoryInspection>("inspect_first_run_repository", { localPath: path });
  if (!inspection.isRepository || !inspection.repositoryId || inspection.repositoryId.toLowerCase() !== identity.repositoryId.toLowerCase()) {
    throw new Error(text(
      "The selected folder is not a checkout of this repository.",
      "Der gewählte Ordner ist kein Checkout dieses Repositories.",
    ));
  }
  return inspection.localPath;
}

function clearPoll(): void {
  if (pollTimer !== null) window.clearTimeout(pollTimer);
  pollTimer = null;
}

function pollAuthorization(delaySeconds: number): void {
  clearPoll();
  pollTimer = window.setTimeout(async () => {
    try {
      const result = await invoke<GitHubDevicePollResult>("github_poll_device_authorization");
      if (result.connected) {
        githubStatus = { state: "connected", connected: true, configured: true, login: result.login, detail: result.detail };
        authorization = null;
        notice = text("GitHub connected.", "GitHub verbunden.");
        activeRerender?.();
        return;
      }
      if (result.state === "pending") {
        activeRerender?.();
        pollAuthorization(result.retryAfterSeconds ?? delaySeconds);
        return;
      }
      authorization = null;
      error = result.detail;
      activeRerender?.();
    } catch (_cause) {
      authorization = null;
      error = connectionError("connect");
      activeRerender?.();
    }
  }, Math.max(5, delaySeconds) * 1000);
}

export function bindProjectConnectionsSettingsEvents(rerender: () => void): void {
  activeRerender = rerender;

  document.querySelector<HTMLButtonElement>("[data-project-gh-refresh]")?.addEventListener("click", async () => {
    busyKey = "github";
    await refreshProjectConnectionsSettings();
    busyKey = null;
    rerender();
  });

  document.querySelector<HTMLButtonElement>("[data-project-gh-disconnect]")?.addEventListener("click", () => {
    pendingConfirmation = { kind: "disconnect-github" };
    rerender();
  });

  document.querySelector<HTMLButtonElement>("[data-project-gh-connect]")?.addEventListener("click", async () => {
    busyKey = "github"; error = null; notice = null; rerender();
    try {
      authorization = await invoke<GitHubDeviceAuthorization>("github_begin_device_authorization");
      await invoke("github_open_verification_page");
      pollAuthorization(authorization.intervalSeconds);
    } catch (_cause) {
      error = connectionError("connect");
      authorization = null;
    } finally {
      busyKey = null;
      rerender();
    }
  });

  document.querySelector<HTMLButtonElement>("[data-project-gh-open]")?.addEventListener("click", () => {
    void invoke("github_open_verification_page");
  });

  document.querySelector<HTMLButtonElement>("[data-source-primary-checkout]")?.addEventListener("click", async () => {
    if (!sourceRegistry) return;
    const identity = sourceRegistry.primary.identity;
    const key = `primary:${identity.repositoryId}`;
    busyKey = key; error = null; notice = null; rerender();
    try {
      const generation = projectActivationGeneration;
      const localPath = await verifiedCheckout(identity);
      if (!localPath || generation !== projectActivationGeneration) return;
      const snapshot = await transitionForCurrentProject({ type: "set-primary-local-binding", localPath });
      if (!snapshot) return;
      updateFromSnapshot(snapshot);
      notice = text("Primary checkout updated.", "Checkout des Hauptrepositories wurde aktualisiert.");
    } catch (cause) {
      error = connectionError("manage");
    } finally {
      busyKey = null;
      rerender();
    }
  });

  document.querySelectorAll<HTMLButtonElement>("[data-source-save-description]").forEach((button) => button.addEventListener("click", () => {
    const identity = identityFrom(button);
    if (!identity) return;
    const card = button.closest<HTMLElement>("[data-source-card]");
    const description = card?.querySelector<HTMLInputElement>("[data-source-description]")?.value.trim() ?? "";
    void applyAction({ type: "update-additional-repository-description", identity, description }, `additional:${identity.repositoryId}`, rerender);
  }));

  document.querySelectorAll<HTMLButtonElement>("[data-source-checkout]").forEach((button) => button.addEventListener("click", async () => {
    const identity = identityFrom(button);
    if (!identity) return;
    const key = `additional:${identity.repositoryId}`;
    busyKey = key; error = null; notice = null; rerender();
    try {
      const generation = projectActivationGeneration;
      const localPath = await verifiedCheckout(identity);
      if (!localPath || generation !== projectActivationGeneration) return;
      const snapshot = await transitionForCurrentProject({ type: "set-additional-local-binding", identity, localPath });
      if (!snapshot) return;
      updateFromSnapshot(snapshot);
      notice = text("Local checkout association updated.", "Lokale Checkout-Zuordnung wurde aktualisiert.");
    } catch (cause) {
      error = connectionError("manage");
    } finally {
      busyKey = null;
      rerender();
    }
  }));

  document.querySelectorAll<HTMLButtonElement>("[data-source-remote-only]").forEach((button) => button.addEventListener("click", () => {
    const identity = identityFrom(button);
    if (!identity) return;
    pendingConfirmation = { kind: "remote-only", identity };
    rerender();
  }));

  document.querySelectorAll<HTMLButtonElement>("[data-source-remove]").forEach((button) => button.addEventListener("click", () => {
    const identity = identityFrom(button);
    if (!identity) return;
    pendingConfirmation = { kind: "remove-source", identity };
    rerender();
  }));

  const cancelConfirmation = () => {
    pendingConfirmation = null;
    rerender();
  };

  document.querySelector<HTMLButtonElement>("[data-project-confirm-cancel]")?.addEventListener("click", cancelConfirmation);
  document.querySelector<HTMLElement>("[data-project-confirm-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) cancelConfirmation();
  });

  document.querySelector<HTMLButtonElement>("[data-project-confirm-accept]")?.addEventListener("click", async () => {
    const confirmation = pendingConfirmation;
    if (!confirmation) return;
    pendingConfirmation = null;

    if (confirmation.kind === "disconnect-github") {
      busyKey = "github"; error = null; notice = null; rerender();
      try {
        await invoke("github_disconnect");
        githubStatus = await invoke<GitHubConnectionStatus>("github_connection_status");
        notice = text(
          "Local GitHub credential removed. Project sources were kept. GitHub-side app authorization was not revoked.",
          "Lokales GitHub-Credential entfernt. Projektquellen wurden beibehalten. Die GitHub-seitige App-Autorisierung wurde nicht widerrufen.",
        );
      } catch (cause) {
        error = connectionError("manage");
      } finally {
        busyKey = null;
        rerender();
      }
      return;
    }

    if (confirmation.kind === "remote-only") {
      await applyAction(
        { type: "set-additional-local-binding", identity: confirmation.identity },
        `additional:${confirmation.identity.repositoryId}`,
        rerender,
      );
      return;
    }

    await applyAction(
      { type: "remove-additional-repository", identity: confirmation.identity },
      `additional:${confirmation.identity.repositoryId}`,
      rerender,
    );
  });
}
