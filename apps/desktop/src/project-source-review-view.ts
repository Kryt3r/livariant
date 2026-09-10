import { getLanguage } from "./i18n/runtime.js";

export type SourceReachability = "unknown" | "reachable" | "unreachable";
export type ReviewLifecycleState = "blocked" | "ready-for-authorization-review" | "authorized-for-separate-apply" | "completed";

export interface DesktopSourceItem {
  kind: "primary" | "additional";
  identity: { provider: string; repositoryId: string; displayName: string; remoteUrl?: string };
  description: string | null;
  localPath: string | null;
  reachability: SourceReachability;
  branch: string | null;
  revision: string | null;
  observedAt: string | null;
  stale: boolean;
  attention: string[];
}

export interface DesktopReviewEvidenceItem {
  evidenceId: string;
  materialDigest: string;
  path: string;
  kind: string;
  scope: string;
  trust: "evidence-only";
  truncated: boolean;
  decision: "accept-as-candidate" | "reject" | "undecided" | "review-again";
  attentionCodes: string[];
  requiresReview: boolean;
}

export interface DesktopReviewPresentation {
  state: ReviewLifecycleState;
  proposalId: string | null;
  evidence: DesktopReviewEvidenceItem[];
  attention: Array<{ code: string; severity?: string; message: string; provenance: string[] }>;
  blockers: Array<{ code: string; message: string; provenance: string[] }>;
  authorizationState: "not-authorized" | "authorized";
  applyState: "not-applied" | "completed";
  requiresReviewAgain: boolean;
}

export interface DesktopSourceReviewPresentation {
  projectId: string;
  sources: DesktopSourceItem[];
  review: DesktopReviewPresentation | null;
  summary: {
    sourceCount: number;
    additionalSourceCount: number;
    unavailableCount: number;
    staleCount: number;
    reviewAttentionCount: number;
    reviewBlockerCount: number;
  };
}

const text = <T>(en: T, de: T): T => getLanguage() === "de" ? de : en;
const escapeHtml = (value: string): string => value.replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
})[character] ?? character);

const labelReachability = (state: SourceReachability): string => {
  if (state === "reachable") return text("Reachable", "Erreichbar");
  if (state === "unreachable") return text("Unreachable", "Nicht erreichbar");
  return text("Unknown", "Unbekannt");
};

const labelLifecycle = (state: ReviewLifecycleState): string => {
  if (state === "blocked") return text("Blocked", "Blockiert");
  if (state === "ready-for-authorization-review") return text("Ready for decision review", "Bereit für Entscheidungsprüfung");
  if (state === "authorized-for-separate-apply") return text("Authorized for separate apply", "Für separate Übernahme autorisiert");
  return text("Completed", "Abgeschlossen");
};

const labelAuthorization = (state: DesktopReviewPresentation["authorizationState"]): string => state === "authorized"
  ? text("Authorized", "Autorisiert")
  : text("Not authorized", "Nicht autorisiert");
const labelApply = (state: DesktopReviewPresentation["applyState"]): string => state === "completed"
  ? text("Completed", "Abgeschlossen")
  : text("Not applied", "Nicht übernommen");

const sourceCard = (source: DesktopSourceItem): string => {
  const role = source.kind === "primary" ? text("Primary repository", "Hauptrepository") : text("Additional repository", "Zusätzliches Repository");
  const attention = source.attention.length > 0
    ? `<ul class="source-review-attention">${source.attention.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";

  return `<article class="source-review-card">
    <div class="source-review-card-head">
      <div><span class="eyebrow">${role}</span><h3>${escapeHtml(source.identity.displayName)}</h3><p>${escapeHtml(source.identity.repositoryId)}</p></div>
      <span class="source-review-state source-review-state-${source.reachability}">${labelReachability(source.reachability)}</span>
    </div>
    ${source.description ? `<p class="source-review-description">${escapeHtml(source.description)}</p>` : ""}
    <dl class="source-review-meta">
      <div><dt>${text("Provider", "Provider")}</dt><dd>${escapeHtml(source.identity.provider)}</dd></div>
      <div><dt>${text("Local checkout", "Lokaler Checkout")}</dt><dd>${source.localPath ? escapeHtml(source.localPath) : text("Not linked", "Nicht verknüpft")}</dd></div>
      <div><dt>${text("Remote", "Remote")}</dt><dd>${source.identity.remoteUrl ? escapeHtml(source.identity.remoteUrl) : text("Not recorded", "Nicht hinterlegt")}</dd></div>
      <div><dt>${text("Branch", "Branch")}</dt><dd>${source.branch ? escapeHtml(source.branch) : text("Unknown", "Unbekannt")}</dd></div>
      <div><dt>${text("Revision", "Revision")}</dt><dd>${source.revision ? escapeHtml(source.revision) : text("Unknown", "Unbekannt")}</dd></div>
      <div><dt>${text("Observed", "Beobachtet")}</dt><dd>${source.observedAt ? escapeHtml(source.observedAt) : text("Not yet", "Noch nicht")}</dd></div>
    </dl>
    ${source.stale ? `<div class="source-review-warning">${text("This observation is stale and should be refreshed.", "Diese Beobachtung ist veraltet und sollte aktualisiert werden.")}</div>` : ""}
    ${attention}
  </article>`;
};

const decisionLabel = (decision: DesktopReviewEvidenceItem["decision"]): string => {
  if (decision === "accept-as-candidate") return text("Accepted as candidate", "Als Kandidat akzeptiert");
  if (decision === "reject") return text("Rejected", "Abgelehnt");
  if (decision === "review-again") return text("Review again", "Erneut prüfen");
  return text("Undecided", "Unentschieden");
};

const reviewSection = (review: DesktopReviewPresentation | null): string => {
  if (!review) {
    return `<section class="source-review-empty"><span class="eyebrow">${text("Review", "Prüfung")}</span><h2>${text("No current review loaded", "Keine aktuelle Prüfung geladen")}</h2><p>${text("Livariant does not yet have a current project-adoption or self-observation review to show here. This does not mean the project is healthy or fully understood.", "Livariant hat für dieses Projekt noch keine aktuelle Übernahme- oder Selbstbeobachtungsprüfung, die hier angezeigt werden kann. Das bedeutet nicht, dass das Projekt gesund oder vollständig verstanden ist.")}</p></section>`;
  }

  const findings = [
    ...review.attention.map((item) => ({ kind: "attention", code: item.code, message: item.message, provenance: item.provenance })),
    ...review.blockers.map((item) => ({ kind: "blocker", code: item.code, message: item.message, provenance: item.provenance })),
  ];

  return `<section class="source-review-review">
    <div class="source-review-section-head"><div><span class="eyebrow">${text("Review lifecycle", "Prüfstatus")}</span><h2>${text("Findings, evidence and proposal status", "Befunde, Nachweise und Vorschlagsstatus")}</h2></div><span class="source-review-lifecycle">${escapeHtml(labelLifecycle(review.state))}</span></div>
    <div class="source-review-summary-grid">
      <div><small>${text("Proposal", "Vorschlag")}</small><strong>${review.proposalId ? escapeHtml(review.proposalId) : text("None", "Keiner")}</strong></div>
      <div><small>${text("Authorization", "Autorisierung")}</small><strong>${labelAuthorization(review.authorizationState)}</strong></div>
      <div><small>${text("Apply", "Übernahme")}</small><strong>${labelApply(review.applyState)}</strong></div>
      <div><small>${text("Review again", "Erneute Prüfung")}</small><strong>${review.requiresReviewAgain ? text("Required", "Erforderlich") : text("No", "Nein")}</strong></div>
    </div>
    <div class="source-review-columns">
      <div><h3>${text("Evidence", "Nachweise")}</h3>${review.evidence.length === 0 ? `<p class="source-review-muted">${text("No reviewed evidence is loaded.", "Keine geprüften Nachweise geladen.")}</p>` : review.evidence.map((item) => `<article class="source-review-evidence"><div><strong>${escapeHtml(item.path)}</strong><span>${decisionLabel(item.decision)}</span></div><p>${escapeHtml(item.scope)}</p><small>${text("Trust", "Vertrauensstatus")}: evidence-only · Material: ${escapeHtml(item.materialDigest.slice(0, 16))}${item.materialDigest.length > 16 ? "…" : ""}</small>${item.requiresReview ? `<div class="source-review-warning">${text("Needs review", "Prüfung nötig")}${item.truncated ? text(" · content truncated", " · Inhalt gekürzt") : ""}</div>` : ""}</article>`).join("")}</div>
      <div><h3>${text("Findings / blockers", "Befunde / Blocker")}</h3>${findings.length === 0 ? `<p class="source-review-muted">${text("No current attention or blockers.", "Aktuell keine Hinweise oder Blocker.")}</p>` : findings.map((item) => `<article class="source-review-finding ${item.kind === "blocker" ? "is-blocker" : ""}"><strong>${escapeHtml(item.code)}</strong><p>${escapeHtml(item.message)}</p><small>${item.provenance.length ? escapeHtml(item.provenance.join(" · ")) : text("No provenance recorded", "Keine Herkunft hinterlegt")}</small></article>`).join("")}</div>
    </div>
    <p class="source-review-boundary">${text("This view presents Livariant's current evidence and review status. It does not silently turn repository content into confirmed project knowledge or grant permission to change files.", "Diese Ansicht zeigt Livariants aktuelle Nachweise und den Prüfstatus. Repository-Inhalte werden dadurch nicht stillschweigend zu bestätigtem Projektwissen und es werden keine Änderungsrechte erteilt.")}</p>
  </section>`;
};

export function renderProjectSourceReviewUnavailable(detail = text("Project source data is not available yet.", "Projektquellen-Daten sind noch nicht verfügbar.")): string {
  return `<header class="topbar"><div><span class="eyebrow">${text("Project operations", "Projektbetrieb")}</span><h1>${text("Project sources & review", "Projektquellen & Prüfung")}</h1><p>${text("Repositories, source status, findings and proposals for the current project.", "Repositories, Quellenstatus, Befunde und Vorschläge für das aktuelle Projekt.")}</p></div></header><section class="source-review-empty"><span class="eyebrow">${text("Runtime bridge", "Laufzeitverbindung")}</span><h2>${text("Source state unavailable", "Quellenstatus nicht verfügbar")}</h2><p>${escapeHtml(detail)}</p><p>${text("The state is unknown and is not presented as healthy or current.", "Der Zustand ist unbekannt und wird nicht als gesund oder aktuell dargestellt.")}</p></section>`;
}

export function renderProjectSourceReviewView(presentation: DesktopSourceReviewPresentation): string {
  return `<header class="topbar"><div><span class="eyebrow">${text("Project operations", "Projektbetrieb")}</span><h1>${text("Project sources & review", "Projektquellen & Prüfung")}</h1><p>${text("Repositories, source status, findings and proposals for the current project.", "Repositories, Quellenstatus, Befunde und Vorschläge für das aktuelle Projekt.")}</p></div></header>
  <section class="source-review-summary">
    <div><small>${text("Project", "Projekt")}</small><strong>${escapeHtml(presentation.projectId)}</strong></div>
    <div><small>${text("Sources", "Quellen")}</small><strong>${presentation.summary.sourceCount}</strong></div>
    <div><small>${text("Unavailable", "Nicht verfügbar")}</small><strong>${presentation.summary.unavailableCount}</strong></div>
    <div><small>${text("Stale", "Veraltet")}</small><strong>${presentation.summary.staleCount}</strong></div>
    <div><small>${text("Review attention", "Prüfung nötig")}</small><strong>${presentation.summary.reviewAttentionCount}</strong></div>
    <div><small>${text("Blockers", "Blocker")}</small><strong>${presentation.summary.reviewBlockerCount}</strong></div>
  </section>
  <section class="source-review-sources"><div class="source-review-section-head"><div><span class="eyebrow">${text("Configured sources", "Eingerichtete Quellen")}</span><h2>${text("Repositories", "Repositories")}</h2></div></div><div class="source-review-source-grid">${presentation.sources.map(sourceCard).join("")}</div></section>
  ${reviewSection(presentation.review)}`;
}
