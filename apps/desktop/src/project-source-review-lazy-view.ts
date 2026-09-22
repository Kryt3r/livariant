import { invoke } from "@tauri-apps/api/core";
import { getLanguage } from "./i18n/runtime.js";
import type { DesktopSourceReviewPresentation } from "./project-source-review-view.js";
import { startProjectSourceReview } from "./project-source-review-bridge.js";
import {
  loadGitHubProjectTelemetry,
  renderGitHubTelemetry,
  renderGitHubTelemetryError,
  renderGitHubTelemetryLoading,
} from "./github-project-telemetry.js";

const PAGE_SIZE = 24;
const text = (en: string, de: string) => getLanguage() === "de" ? de : en;
const reachabilityLabel = (value: string) => value === "reachable"
  ? text("Reachable", "Erreichbar")
  : value === "unreachable"
    ? text("Unreachable", "Nicht erreichbar")
    : text("Unknown", "Unbekannt");
const decisionLabel = (value: string) => {
  if (value === "accept-as-candidate") return text("Accepted as candidate", "Als Kandidat angenommen");
  if (value === "reject") return text("Rejected", "Abgelehnt");
  if (value === "review-again") return text("Review again", "Erneut prüfen");
  return text("Undecided", "Unentschieden");
};
const evidenceOnlyLabel = () => text("evidence-only", "nur Evidence");
const escapeHtml = (value: string): string => value.replace(/[&<>'\"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '\"': "&quot;",
})[character] ?? character);

interface ReviewPathInventoryResult {
  schemaVersion: 1;
  state: "ready";
  projectId: string;
  candidates: Array<{ path: string; kind: string; scope: string; trust: "evidence-only" }>;
  selectedReviewPaths: string[];
  attention: Array<{ code: string; message: string; provenance: string[] }>;
}

export function renderProjectSourceReviewHub(presentation: DesktopSourceReviewPresentation | null): string {
  const summary = presentation?.summary;
  return `<header class="topbar source-review-topbar"><div><span class="eyebrow">${text("Where your project information comes from", "Woher deine Projektinformationen stammen")}</span><h1>${text("Sources", "Quellen")}</h1><p>${text("See which repositories Livariant uses as a basis, what has actually been checked and where information is still missing or needs your attention.", "Sieh, welche Repositories Livariant als Grundlage nutzt, was tatsächlich geprüft wurde und wo Informationen noch fehlen oder deine Aufmerksamkeit brauchen.")}</p></div></header>
  <nav class="source-review-subnav" aria-label="${text("Sources and review sections", "Bereiche für Quellen und Prüfung")}">
    <button class="source-review-subnav-item active" type="button" data-source-review-section="overview" aria-current="page"><span>${text("Overview", "Übersicht")}</span></button>
    <button class="source-review-subnav-item" type="button" data-source-review-section="sources"><span>${text("Sources", "Quellen")}</span><b>${summary?.sourceCount ?? "–"}</b></button>
    <button class="source-review-subnav-item" type="button" data-source-review-section="material"><span>${text("Files to review", "Zu prüfende Dateien")}</span></button>
    <button class="source-review-subnav-item" type="button" data-source-review-section="findings"><span>${text("Needs attention", "Braucht Aufmerksamkeit")}</span><b>${summary?.reviewAttentionCount ?? "–"}</b></button>
    <button class="source-review-subnav-item" type="button" data-source-review-section="github"><span>GitHub</span></button>
  </nav>
  <section class="source-review-summary">
    <div><small>${text("Project", "Projekt")}</small><strong>${presentation ? escapeHtml(presentation.projectId) : text("Unavailable", "Nicht verfügbar")}</strong></div>
    <div><small>${text("Sources", "Quellen")}</small><strong>${summary?.sourceCount ?? "–"}</strong></div>
    <div><small>${text("Local checkouts", "Lokale Checkouts")}</small><strong>${summary?.localCheckoutCount ?? "–"}</strong></div>
    <div><small>${text("Review attention", "Prüfung nötig")}</small><strong>${summary?.reviewAttentionCount ?? "–"}</strong></div>
    <div><small>${text("Blockers", "Blocker")}</small><strong>${summary?.reviewBlockerCount ?? "–"}</strong></div>
  </section>
  <section class="source-review-selection source-review-lazy-hub">
    <div class="source-review-overview" data-source-review-overview>
      <div><span class="eyebrow">${text("Start with the basis", "Beginne mit der Grundlage")}</span><h2>${text("Understand what Livariant can actually rely on", "Verstehe, worauf sich Livariant tatsächlich stützen kann")}</h2><p>${text("This overview shows the configured sources without scanning everything in the background. Open a section when you want to inspect files, review findings or check GitHub information.", "Diese Übersicht zeigt die eingerichteten Quellen, ohne im Hintergrund alles zu durchsuchen. Öffne einen Bereich, wenn du Dateien, Prüfbefunde oder GitHub-Informationen genauer ansehen möchtest.")}</p></div>
      <span class="source-review-overview-state">${text("Nothing is treated as project truth automatically", "Nichts wird automatisch zur Projektwahrheit")}</span>
    </div>
    <div data-source-review-heavy-root></div>
  </section>`;
}

function renderSources(presentation: DesktopSourceReviewPresentation): string {
  const cards = presentation.sources.map((source) => `<article class="source-review-card"><div class="source-review-card-head"><div><span class="eyebrow">${source.kind === "primary" ? text("Primary repository", "Hauptrepository") : text("Additional repository", "Zusätzliches Repository")}</span><h3>${escapeHtml(source.identity.displayName)}</h3><p>${escapeHtml(source.identity.repositoryId)}</p></div><span class="source-review-state">${escapeHtml(reachabilityLabel(source.reachability))}</span></div><dl class="source-review-meta"><div><dt>${text("Local checkout", "Lokaler Checkout")}</dt><dd>${source.localPath ? escapeHtml(source.localPath) : text("Not linked", "Nicht verknüpft")}</dd></div><div><dt>${text("Branch", "Branch")}</dt><dd>${source.branch ? escapeHtml(source.branch) : text("Unknown", "Unbekannt")}</dd></div><div><dt>${text("Revision", "Revision")}</dt><dd>${source.revision ? escapeHtml(source.revision) : text("Unknown", "Unbekannt")}</dd></div><div><dt>${text("Observed", "Beobachtet")}</dt><dd>${source.observedAt ? escapeHtml(source.observedAt) : text("Not yet", "Noch nicht")}</dd></div></dl></article>`).join("");
  return `<div class="source-review-source-grid">${cards || `<p class="source-review-muted">${text("No sources recorded.", "Keine Quellen hinterlegt.")}</p>`}</div>`;
}

function renderFindingsPage(presentation: DesktopSourceReviewPresentation, offset: number): string {
  const review = presentation.review;
  if (!review) return `<p class="source-review-muted">${text("No current review loaded.", "Keine aktuelle Prüfung geladen.")}</p>`;
  const rows = [
    ...review.evidence.map((item) => ({ type: "evidence", title: item.path, body: `${item.scope} · ${evidenceOnlyLabel()}`, extra: decisionLabel(item.decision) })),
    ...review.attention.map((item) => ({ type: "attention", title: item.code, body: item.message, extra: item.provenance.join(" · ") })),
    ...review.blockers.map((item) => ({ type: "blocker", title: item.code, body: item.message, extra: item.provenance.join(" · ") })),
  ];
  const visible = rows.slice(0, offset + PAGE_SIZE);
  const html = visible.map((row) => `<article class="source-review-finding ${row.type === "blocker" ? "is-blocker" : ""}"><strong>${escapeHtml(row.title)}</strong><p>${escapeHtml(row.body)}</p><small>${escapeHtml(row.extra || "")}</small></article>`).join("");
  const more = visible.length < rows.length ? `<button type="button" data-source-review-more="findings" data-offset="${visible.length}">${text("Show more", "Mehr anzeigen")}</button>` : "";
  return `${html || `<p class="source-review-muted">${text("No findings or evidence.", "Keine Befunde oder Nachweise.")}</p>`}<div class="source-review-selection-actions">${more}</div>`;
}

function renderMaterialPage(inventory: ReviewPathInventoryResult, selected: Set<string>, offset: number): string {
  const visible = inventory.candidates.slice(0, offset + PAGE_SIZE);
  const rows = visible.map((candidate) => `<label class="source-review-candidate"><input type="checkbox" data-review-path value="${escapeHtml(candidate.path)}" ${selected.has(candidate.path) ? "checked" : ""}/><span><strong>${escapeHtml(candidate.path)}</strong><small>${escapeHtml(candidate.kind)} · ${text("Scope", "Geltungsbereich")}: ${escapeHtml(candidate.scope)} · ${evidenceOnlyLabel()}</small></span></label>`).join("");
  const more = visible.length < inventory.candidates.length ? `<button type="button" data-source-review-more="material" data-offset="${visible.length}">${text("Show more", "Mehr anzeigen")}</button>` : "";
  return `<div class="source-review-selection-toolbar"><span data-review-selection-count>${selected.size} ${text("selected", "ausgewählt")}</span></div><div class="source-review-candidate-list">${rows}</div><div class="source-review-selection-actions">${more}<button type="button" data-start-project-review ${selected.size === 0 ? "disabled" : ""}>${text("Start review", "Review starten")}</button><span data-review-start-status aria-live="polite"></span></div>`;
}

export function bindProjectSourceReviewHub(content: HTMLElement, presentation: DesktopSourceReviewPresentation | null, isStillActive: () => boolean): void {
  const heavyRoot = content.querySelector<HTMLElement>("[data-source-review-heavy-root]");
  if (!heavyRoot) return;
  let inventory: ReviewPathInventoryResult | null = null;
  const selected = new Set<string>();

  const renderSection = async (section: string) => {
    heavyRoot.replaceChildren();
    if (!presentation) {
      heavyRoot.innerHTML = `<p class="source-review-muted">${text("No safe local snapshot is available yet.", "Noch kein sicherer lokaler Snapshot verfügbar.")}</p>`;
      return;
    }
    if (section === "sources") {
      heavyRoot.innerHTML = renderSources(presentation);
      return;
    }
    if (section === "findings") {
      heavyRoot.innerHTML = renderFindingsPage(presentation, 0);
      return;
    }
    if (section === "github") {
      const primary = presentation.sources.find((source) => source.kind === "primary" && source.identity.provider === "github");
      if (!primary) {
        heavyRoot.innerHTML = `<p class="source-review-muted">${text("No GitHub primary source is configured.", "Keine GitHub-Hauptquelle eingerichtet.")}</p>`;
        return;
      }
      heavyRoot.innerHTML = renderGitHubTelemetryLoading(primary.identity.repositoryId);
      try {
        const loaded = await loadGitHubProjectTelemetry(primary.identity.repositoryId);
        if (!isStillActive()) return;
        heavyRoot.innerHTML = renderGitHubTelemetry(loaded.snapshot.telemetry, loaded.snapshot);
        if (loaded.refresh) {
          try {
            const refreshed = await loaded.refresh;
            if (!isStillActive()) return;
            heavyRoot.innerHTML = renderGitHubTelemetry(refreshed.telemetry, refreshed);
          } catch (cause) {
            if (!isStillActive()) return;
            heavyRoot.insertAdjacentHTML(
              "beforeend",
              `<div class="gh-telemetry-unavailable"><strong>${text("Background refresh failed", "Hintergrund-Aktualisierung fehlgeschlagen")}</strong><span>${text("Try refreshing this section.", "Aktualisiere diesen Bereich erneut.")}</span></div>`,
            );
          }
        }
      } catch (cause) {
        if (!isStillActive()) return;
        heavyRoot.innerHTML = renderGitHubTelemetryError(primary.identity.repositoryId, text("GitHub activity could not be loaded. Try again.", "GitHub-Aktivität konnte nicht geladen werden. Versuche es erneut."));
      }
      return;
    }
    if (section === "material") {
      heavyRoot.innerHTML = `<p class="source-review-muted">${text("Reading bounded review material…", "Begrenztes Review-Material wird ausgelesen…")}</p>`;
      try {
        inventory = await invoke<ReviewPathInventoryResult>("inventory_project_source_review_paths");
        if (!isStillActive()) return;
        selected.clear();
        inventory.selectedReviewPaths.forEach((path) => selected.add(path));
        heavyRoot.innerHTML = renderMaterialPage(inventory, selected, 0);
      } catch (cause) {
        if (!isStillActive()) return;
        heavyRoot.innerHTML = `<p class="source-review-muted">${text("Review material could not be read safely", "Review-Material konnte nicht sicher ausgelesen werden")}: ${text("Try refreshing this section.", "Aktualisiere diesen Bereich erneut.")}</p>`;
      }
    }
  };

  content.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const sectionButton = target.closest<HTMLButtonElement>("[data-source-review-section]");
    if (sectionButton) {
      const section = sectionButton.dataset.sourceReviewSection ?? "";
      content.querySelectorAll<HTMLButtonElement>("[data-source-review-section]").forEach((candidate) => {
        const active = candidate === sectionButton;
        candidate.classList.toggle("active", active);
        if (active) candidate.setAttribute("aria-current", "page");
        else candidate.removeAttribute("aria-current");
      });
      const overview = content.querySelector<HTMLElement>("[data-source-review-overview]");
      if (overview) overview.hidden = section !== "overview";
      if (section === "overview") {
        heavyRoot.replaceChildren();
        return;
      }
      await renderSection(section);
      return;
    }
    const moreButton = target.closest<HTMLButtonElement>("[data-source-review-more]");
    if (moreButton?.dataset.sourceReviewMore === "findings" && presentation) {
      heavyRoot.innerHTML = renderFindingsPage(presentation, Number(moreButton.dataset.offset ?? 0));
      return;
    }
    if (moreButton?.dataset.sourceReviewMore === "material" && inventory) {
      heavyRoot.innerHTML = renderMaterialPage(inventory, selected, Number(moreButton.dataset.offset ?? 0));
      return;
    }
    const startButton = target.closest<HTMLButtonElement>("[data-start-project-review]");
    if (startButton && inventory) {
      if (selected.size === 0) return;
      const status = heavyRoot.querySelector<HTMLElement>("[data-review-start-status]");
      startButton.disabled = true;
      if (status) status.textContent = text("Starting review…", "Review wird gestartet…");
      try {
        await startProjectSourceReview([...selected]);
        if (!isStillActive()) return;
        if (status) status.textContent = text("Review started.", "Review gestartet.");
      } catch (cause) {
        if (!isStillActive()) return;
        startButton.disabled = false;
        if (status) status.textContent = text("Review could not be started safely. Check the selected material and try again.", "Review konnte nicht sicher gestartet werden. Prüfe das ausgewählte Material und versuche es erneut.");
      }
    }
  });

  content.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.matches("[data-review-path]")) return;
    if (target.checked) selected.add(target.value); else selected.delete(target.value);
    const count = heavyRoot.querySelector<HTMLElement>("[data-review-selection-count]");
    if (count) count.textContent = `${selected.size} ${text("selected", "ausgewählt")}`;
    const startButton = heavyRoot.querySelector<HTMLButtonElement>("[data-start-project-review]");
    if (startButton) startButton.disabled = selected.size === 0;
  });
}
