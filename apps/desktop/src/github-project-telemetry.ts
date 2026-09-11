import { invoke } from "@tauri-apps/api/core";
import { getLanguage } from "./i18n/runtime.js";

export type GitHubTelemetrySurface = {
  state: "available" | "unavailable";
  items: Array<Record<string, unknown>>;
  detail: string | null;
};

export type GitHubProjectTelemetry = {
  state: "ready";
  repositoryId: string;
  observedAtUnix: number;
  repository: GitHubTelemetrySurface;
  actions: GitHubTelemetrySurface;
  pullRequests: GitHubTelemetrySurface;
  issues: GitHubTelemetrySurface;
  releases: GitHubTelemetrySurface;
  boundaries: {
    remoteEvidenceIsProjectTruth: false;
    telemetryGrantsAuthority: false;
    writeCapabilityEnabled: false;
    workflowDispatchEnabled: false;
    pullRequestMutationEnabled: false;
    issueMutationEnabled: false;
    releaseMutationEnabled: false;
    mergeEnabled: false;
    changesProjectOwnedFiles: false;
    performsSemanticApply: false;
  };
};

type GitHubConnectionStatus = {
  state: string;
  connected: boolean;
  configured: boolean;
  login: string | null;
  detail: string;
};

const text = <T>(en: T, de: T): T => getLanguage() === "de" ? de : en;
const esc = (value: unknown): string => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character] ?? character);

const stringValue = (item: Record<string, unknown>, key: string): string => typeof item[key] === "string" ? item[key] as string : "";
const numberValue = (item: Record<string, unknown>, key: string): number | null => typeof item[key] === "number" ? item[key] as number : null;
const boolValue = (item: Record<string, unknown>, key: string): boolean => item[key] === true;

const surfaceUnavailable = (surface: GitHubTelemetrySurface): string => `<div class="gh-telemetry-unavailable"><strong>${text("Unavailable", "Nicht verfügbar")}</strong><span>${esc(surface.detail ?? text("GitHub did not expose this read surface to the current connection.", "GitHub stellt diese Leseansicht für die aktuelle Verbindung nicht bereit."))}</span></div>`;

const repositoryCard = (surface: GitHubTelemetrySurface): string => {
  if (surface.state !== "available") return surfaceUnavailable(surface);
  const item = surface.items[0];
  if (!item) return `<p class="gh-telemetry-muted">${text("No repository metadata returned.", "Keine Repository-Metadaten zurückgegeben.")}</p>`;
  return `<dl class="gh-telemetry-repo-meta">
    <div><dt>${text("Default branch", "Standard-Branch")}</dt><dd>${esc(stringValue(item, "default_branch") || text("Unknown", "Unbekannt"))}</dd></div>
    <div><dt>${text("Visibility", "Sichtbarkeit")}</dt><dd>${boolValue(item, "private") ? text("Private", "Privat") : text("Public", "Öffentlich")}</dd></div>
    <div><dt>${text("Archived", "Archiviert")}</dt><dd>${boolValue(item, "archived") ? text("Yes", "Ja") : text("No", "Nein")}</dd></div>
    <div><dt>${text("Open issues + PRs", "Offene Issues + PRs")}</dt><dd>${numberValue(item, "open_issues_count") ?? "–"}</dd></div>
    <div><dt>${text("Last push", "Letzter Push")}</dt><dd>${esc(stringValue(item, "pushed_at") || text("Unknown", "Unbekannt"))}</dd></div>
  </dl>`;
};

const actionsCard = (surface: GitHubTelemetrySurface): string => {
  if (surface.state !== "available") return surfaceUnavailable(surface);
  if (!surface.items.length) return `<p class="gh-telemetry-muted">${text("No workflow runs returned.", "Keine Workflow-Runs zurückgegeben.")}</p>`;
  return `<div class="gh-telemetry-list">${surface.items.map((item) => {
    const conclusion = stringValue(item, "conclusion") || stringValue(item, "status") || text("Unknown", "Unbekannt");
    const headSha = stringValue(item, "head_sha");
    return `<article><div><strong>${esc(stringValue(item, "name") || text("Workflow run", "Workflow-Run"))}</strong><span>#${numberValue(item, "run_number") ?? "–"} · ${esc(stringValue(item, "event"))}</span></div><em data-state="${esc(conclusion)}">${esc(conclusion)}</em><small>${esc(stringValue(item, "head_branch") || text("No branch", "Kein Branch"))}${headSha ? ` · ${esc(headSha.slice(0, 8))}` : ""}</small></article>`;
  }).join("")}</div>`;
};

const issueLikeCard = (surface: GitHubTelemetrySurface, emptyEn: string, emptyDe: string): string => {
  if (surface.state !== "available") return surfaceUnavailable(surface);
  if (!surface.items.length) return `<p class="gh-telemetry-muted">${text(emptyEn, emptyDe)}</p>`;
  return `<div class="gh-telemetry-list">${surface.items.map((item) => `<article><div><strong>#${numberValue(item, "number") ?? "–"} ${esc(stringValue(item, "title"))}</strong><span>${esc(stringValue(item, "updated_at"))}</span></div>${boolValue(item, "draft") ? `<em>${text("Draft", "Entwurf")}</em>` : ""}</article>`).join("")}</div>`;
};

const releaseCard = (surface: GitHubTelemetrySurface): string => {
  if (surface.state !== "available") return surfaceUnavailable(surface);
  if (!surface.items.length) return `<p class="gh-telemetry-muted">${text("No releases returned.", "Keine Releases zurückgegeben.")}</p>`;
  return `<div class="gh-telemetry-list">${surface.items.map((item) => `<article><div><strong>${esc(stringValue(item, "name") || stringValue(item, "tag_name") || text("Release", "Release"))}</strong><span>${esc(stringValue(item, "tag_name"))}</span></div><em>${boolValue(item, "draft") ? text("Draft", "Entwurf") : boolValue(item, "prerelease") ? text("Prerelease", "Vorabversion") : text("Published", "Veröffentlicht")}</em><small>${esc(stringValue(item, "published_at") || stringValue(item, "created_at"))}</small></article>`).join("")}</div>`;
};

export function renderGitHubTelemetryLoading(repositoryId: string): string {
  return `<section class="gh-telemetry" data-gh-project-telemetry><div class="source-review-section-head"><div><span class="eyebrow">GitHub</span><h2>${text("Remote project status", "Remote-Projektstatus")}</h2><p>${esc(repositoryId)}</p></div></div><div class="gh-telemetry-loading">${text("Loading read-only GitHub project data…", "Lese GitHub-Projektdaten schreibgeschützt…")}</div></section>`;
}

export function renderGitHubTelemetryError(repositoryId: string, detail: string): string {
  return `<section class="gh-telemetry" data-gh-project-telemetry><div class="source-review-section-head"><div><span class="eyebrow">GitHub</span><h2>${text("Remote project status", "Remote-Projektstatus")}</h2><p>${esc(repositoryId)}</p></div></div><div class="gh-telemetry-unavailable"><strong>${text("GitHub telemetry unavailable", "GitHub-Telemetrie nicht verfügbar")}</strong><span>${esc(detail)}</span></div><p class="source-review-boundary">${text("No missing data is interpreted as healthy. GitHub read access grants no permission to change workflows, pull requests, issues or releases.", "Fehlende Daten werden nicht als gesund interpretiert. GitHub-Lesezugriff erteilt keine Berechtigung, Workflows, Pull Requests, Issues oder Releases zu verändern.")}</p></section>`;
}

export function renderGitHubTelemetry(telemetry: GitHubProjectTelemetry): string {
  const observed = new Date(telemetry.observedAtUnix * 1000).toLocaleString(getLanguage() === "de" ? "de-DE" : "en-US");
  return `<section class="gh-telemetry" data-gh-project-telemetry>
    <div class="source-review-section-head"><div><span class="eyebrow">GitHub</span><h2>${text("Remote project status", "Remote-Projektstatus")}</h2><p>${esc(telemetry.repositoryId)} · ${text("Observed", "Beobachtet")}: ${esc(observed)}</p></div><span class="source-review-lifecycle">${text("Read only", "Nur Lesen")}</span></div>
    <div class="gh-telemetry-grid">
      <section><h3>${text("Repository", "Repository")}</h3>${repositoryCard(telemetry.repository)}</section>
      <section><h3>${text("Actions · latest runs", "Actions · letzte Runs")}</h3>${actionsCard(telemetry.actions)}</section>
      <section><h3>${text("Open pull requests", "Offene Pull Requests")}</h3>${issueLikeCard(telemetry.pullRequests, "No open pull requests returned.", "Keine offenen Pull Requests zurückgegeben.")}</section>
      <section><h3>${text("Open issues", "Offene Issues")}</h3>${issueLikeCard(telemetry.issues, "No open issues returned.", "Keine offenen Issues zurückgegeben.")}</section>
      <section><h3>${text("Recent releases", "Letzte Releases")}</h3>${releaseCard(telemetry.releases)}</section>
    </div>
    <p class="source-review-boundary">${text("GitHub data shown here is external evidence. It is not Project Truth and does not authorize workflow dispatch, pull-request or issue changes, merges, releases, Semantic Apply or project-file mutation.", "Die hier angezeigten GitHub-Daten sind externe Nachweise. Sie sind kein Projektwissen und autorisieren weder Workflow-Starts noch Pull-Request-/Issue-Änderungen, Merges, Releases, Semantic Apply oder Änderungen an Projektdateien.")}</p>
  </section>`;
}

export async function loadGitHubProjectTelemetry(repositoryId: string): Promise<GitHubProjectTelemetry> {
  const status = await invoke<GitHubConnectionStatus>("github_connection_status");
  if (!status.configured || !status.connected) {
    throw new Error(status.detail || "GitHub connection is unavailable.");
  }
  return invoke<GitHubProjectTelemetry>("github_project_telemetry", { repositoryId });
}
