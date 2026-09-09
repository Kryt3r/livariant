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

const escapeHtml = (value: string): string => value.replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#39;",
  '"': "&quot;",
})[character] ?? character);

const labelReachability = (state: SourceReachability): string => {
  if (state === "reachable") return "Reachable";
  if (state === "unreachable") return "Unreachable";
  return "Unknown";
};

const sourceCard = (source: DesktopSourceItem): string => {
  const role = source.kind === "primary" ? "Primary repository" : "Additional repository";
  const details = [
    source.branch ? `Branch: ${source.branch}` : "Branch: unknown",
    source.revision ? `Revision: ${source.revision}` : "Revision: unknown",
    source.observedAt ? `Observed: ${source.observedAt}` : "Observed: not yet",
  ];
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
      <div><dt>Provider</dt><dd>${escapeHtml(source.identity.provider)}</dd></div>
      <div><dt>Local checkout</dt><dd>${source.localPath ? escapeHtml(source.localPath) : "Not linked"}</dd></div>
      <div><dt>Remote</dt><dd>${source.identity.remoteUrl ? escapeHtml(source.identity.remoteUrl) : "Not recorded"}</dd></div>
      ${details.map((detail) => `<div><dt>${escapeHtml(detail.split(":")[0] ?? "State")}</dt><dd>${escapeHtml(detail.split(":").slice(1).join(":").trim())}</dd></div>`).join("")}
    </dl>
    ${source.stale ? `<div class="source-review-warning">Observation is stale and should be refreshed.</div>` : ""}
    ${attention}
  </article>`;
};

const decisionLabel = (decision: DesktopReviewEvidenceItem["decision"]): string => {
  if (decision === "accept-as-candidate") return "Accepted as candidate";
  if (decision === "reject") return "Rejected";
  if (decision === "review-again") return "Review again";
  return "Undecided";
};

const reviewSection = (review: DesktopReviewPresentation | null): string => {
  if (!review) {
    return `<section class="source-review-empty"><span class="eyebrow">Review</span><h2>No canonical review loaded</h2><p>Livariant has no current adoption/self-hosting review presentation to show for this project yet. This is not a healthy-state claim.</p></section>`;
  }

  const findings = [
    ...review.attention.map((item) => ({ kind: "attention", code: item.code, message: item.message, provenance: item.provenance })),
    ...review.blockers.map((item) => ({ kind: "blocker", code: item.code, message: item.message, provenance: item.provenance })),
  ];

  return `<section class="source-review-review">
    <div class="source-review-section-head"><div><span class="eyebrow">Canonical review lifecycle</span><h2>Findings, evidence and proposal state</h2></div><span class="source-review-lifecycle">${escapeHtml(review.state)}</span></div>
    <div class="source-review-summary-grid">
      <div><small>Proposal</small><strong>${review.proposalId ? escapeHtml(review.proposalId) : "None"}</strong></div>
      <div><small>Authorization</small><strong>${escapeHtml(review.authorizationState)}</strong></div>
      <div><small>Apply</small><strong>${escapeHtml(review.applyState)}</strong></div>
      <div><small>Review again</small><strong>${review.requiresReviewAgain ? "Required" : "No"}</strong></div>
    </div>
    <div class="source-review-columns">
      <div><h3>Evidence</h3>${review.evidence.length === 0 ? `<p class="source-review-muted">No reviewed evidence is loaded.</p>` : review.evidence.map((item) => `<article class="source-review-evidence">
        <div><strong>${escapeHtml(item.path)}</strong><span>${decisionLabel(item.decision)}</span></div>
        <p>${escapeHtml(item.scope)}</p>
        <small>Trust: evidence-only · Material: ${escapeHtml(item.materialDigest.slice(0, 16))}${item.materialDigest.length > 16 ? "…" : ""}</small>
        ${item.requiresReview ? `<div class="source-review-warning">Needs review${item.truncated ? " · content truncated" : ""}</div>` : ""}
      </article>`).join("")}</div>
      <div><h3>Findings / blockers</h3>${findings.length === 0 ? `<p class="source-review-muted">No current attention or blockers.</p>` : findings.map((item) => `<article class="source-review-finding ${item.kind === "blocker" ? "is-blocker" : ""}">
        <strong>${escapeHtml(item.code)}</strong><p>${escapeHtml(item.message)}</p><small>${item.provenance.length ? escapeHtml(item.provenance.join(" · ")) : "No provenance recorded"}</small>
      </article>`).join("")}</div>
    </div>
    <p class="source-review-boundary">This Desktop surface presents canonical evidence. It does not convert Evidence into Project Truth, mint Authority, resolve conflicts silently or claim Semantic Apply completion without matching canonical evidence.</p>
  </section>`;
};

export function renderProjectSourceReviewUnavailable(detail = "Project Source Center runtime data is not available yet."): string {
  return `<header class="topbar"><div><span class="eyebrow">Project operations</span><h1>Project Sources & Review</h1><p>Repositories, provenance, findings and proposal state from canonical Livariant evidence.</p></div></header>
  <section class="source-review-empty"><span class="eyebrow">Runtime bridge</span><h2>Source state unavailable</h2><p>${escapeHtml(detail)}</p><p>This state is explicitly unknown and is not presented as healthy or current.</p></section>`;
}

export function renderProjectSourceReviewView(presentation: DesktopSourceReviewPresentation): string {
  return `<header class="topbar"><div><span class="eyebrow">Project operations</span><h1>Project Sources & Review</h1><p>Repositories, provenance, findings and proposal state from canonical Livariant evidence.</p></div></header>
  <section class="source-review-summary">
    <div><small>Project</small><strong>${escapeHtml(presentation.projectId)}</strong></div>
    <div><small>Sources</small><strong>${presentation.summary.sourceCount}</strong></div>
    <div><small>Unavailable</small><strong>${presentation.summary.unavailableCount}</strong></div>
    <div><small>Stale</small><strong>${presentation.summary.staleCount}</strong></div>
    <div><small>Review attention</small><strong>${presentation.summary.reviewAttentionCount}</strong></div>
    <div><small>Blockers</small><strong>${presentation.summary.reviewBlockerCount}</strong></div>
  </section>
  <section class="source-review-sources"><div class="source-review-section-head"><div><span class="eyebrow">Configured sources</span><h2>Repositories</h2></div></div><div class="source-review-source-grid">${presentation.sources.map(sourceCard).join("")}</div></section>
  ${reviewSection(presentation.review)}`;
}
