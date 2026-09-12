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
  return `<header class="topbar"><div><span class="eyebrow">${text("Project operations", "Projektbetrieb")}</span><h1>${text("Project sources & review", "Projektquellen & Prüfung")}</h1><p>${text("Open only the area you need. Heavy repository material is loaded on demand.", "Öffne nur den Bereich, den du gerade brauchst. Umfangreiches Repository-Material wird erst auf Anforderung geladen.")}</p></div></header>
  <section class="source-review-summary">
    <div><small>${text("Project", "Projekt")}</small><strong>${presentation ? escapeHtml(presentation.projectId) : text("Unavailable", "Nicht verfügbar")}</strong></div>
    <div><small>${text("Sources", "Quellen")}</small><strong>${summary?.sourceCount ?? "–"}</strong></div>
    <div><small>${text("Local checkouts", "Lokale Checkouts")}</small><strong>${summary?.localCheckoutCount ?? "–"}</strong></div>
    <div><small>${text("Review attention", "Prüfung nötig")}</small><strong>${summary?.reviewAttentionCount ?? "–"}</strong></div>
    <div><small>${text("Blockers", "Blocker")}</small><strong>${summary?.reviewBlockerCount ?? "–"}</strong></div>
  </section>
  <section class="source-review-selection source-review-lazy-hub">
    <div class="source-review-section-head"><div><span class="eyebrow">${text("Details", "Details")}</span><h2>${text("Load a section", "Bereich öffnen")}</h2><p>${text("Nothing below is scanned or expanded automatically just because you opened this page.", "Nur weil du diese Seite öffnest, wird darunter nichts automatisch gescannt oder vollständig aufgebaut.")}</p></div></div>
    <div class="source-review-lazy-actions">
      <button type="button" data-source-review-section="sources">${text("Show sources", "Quellen anzeigen")}</button>
      <button type="button" data-source-review-section="material">${text("Read review material", "Review-Material auslesen")}</button>
      <button type="button" data-source-review-section="findings">${text("Show findings & evidence", "Befunde & Nachweise anzeigen")}</button>
      <button type="button" data-source-review-section="github">${text("Show GitHub status", "GitHub-Status anzeigen")}</button>
    </div>
    <div data-source-review-heavy-root></div>
  </section>`;
}

function renderSources(presentation: DesktopSourceReviewPresentation): string {
  const cards = presentation.sources.map((source) => `<article class="source-review-card"><div class="source-review-card-head"><div><span class="eyebrow">${source.kind === "primary" ? text("Primary repository", "Hauptrepository") : text("Additional repository", "Zusätzliches Repository")}</span><h3>${escapeHtml(source.identity.displayName)}</h3><p>${escapeHtml(source.identity.repositoryId)}</p></div><span class="source-review-state">${escapeHtml(source.reachability)}</span></div><dl class="source-review-meta"><div><dt>${text("Local checkout", "Lokaler Checkout")}</dt><dd>${source.localPath ? escapeHtml(source.localPath) : text("Not linked", "Nicht verknüpft")}</dd></div><div><dt>${text("Branch", "Branch")}</dt><dd>${source.branch ? escapeHtml(source.branch) : text("Unknown", "Unbekannt")}</dd></div><div><dt>${text("Revision", "Revision")}</dt><dd>${source.revision ? escapeHtml(source.revision) : text("Unknown", "Unbekannt")}</dd></div><div><dt>${text("Observed", "Beobachtet")}</dt><dd>${source.observedAt ? escapeHtml(source.observedAt) : text("Not yet", "Noch nicht")}</dd></div></dl></article>`).join("");
  return `<div class="source-review-source-grid">${cards || `<p class="source-review-muted">${text("No sources recorded.", "Keine Quellen hinterlegt.")}</p>`}</div>`;
}

function renderFindingsPage(presentation: DesktopSourceReviewPresentation, offset: number): string {
  const review = presentation.review;
  if (!review) return `<p class="source-review-muted">${text("No current review loaded.", "Keine aktuelle Prüfung geladen.")}</p>`;
  const rows = [
    ...review.evidence.map((item) => ({ type: "evidence", title: item.path, body: `${item.scope} · evidence-only`, extra: item.decision })),
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
  const rows = visible.map((candidate) => `<label class="source-review-candidate"><input type="checkbox" data-review-path value="${escapeHtml(candidate.path)}" ${selected.has(candidate.path) ? "checked" : ""}/><span><strong>${escapeHtml(candidate.path)}</strong><small>${escapeHtml(candidate.kind)} · ${text("Scope", "Geltungsbereich")}: ${escapeHtml(candidate.scope)} · evidence-only</small></span></label>`).join("");
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
        const telemetry = await loadGitHubProjectTelemetry(primary.identity.repositoryId);
        if (!isStillActive()) return;
        heavyRoot.innerHTML = renderGitHubTelemetry(telemetry);
      } catch (cause) {
        if (!isStillActive()) return;
        heavyRoot.innerHTML = renderGitHubTelemetryError(primary.identity.repositoryId, String(cause));
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
        heavyRoot.innerHTML = `<p class="source-review-muted">${text("Review material could not be read safely", "Review-Material konnte nicht sicher ausgelesen werden")}: ${escapeHtml(String(cause))}</p>`;
      }
    }
  };

  content.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const sectionButton = target.closest<HTMLButtonElement>("[data-source-review-section]");
    if (sectionButton) {
      await renderSection(sectionButton.dataset.sourceReviewSection ?? "");
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
        if (status) status.textContent = `${text("Review could not be started safely", "Review konnte nicht sicher gestartet werden")}: ${String(cause)}`;
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
