import "./glass.css";
import "./styles.css";
import "./project-truth.css";
import "./project-truth-workspace.css";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  bindConnectionDiagnosticsEvents,
  refreshConnector,
  refreshDiagnostics,
  renderConnectionsSettingsView,
  renderConnectionsView,
  renderDiagnosticsView,
} from "./connections-diagnostics.js";

const livariantLogo = new URL("./assets/livariant-logo.png", import.meta.url).href;
const appWindow = getCurrentWindow();

type View = "steps" | "updates" | "connections" | "diagnostics";
type SettingsSection = "general" | "connections" | "system";
type NoticeKind = "info" | "success" | "warning" | "error";
type AreaState = "open" | "deferred" | "review" | "confirmed";
type TruthFilter = "all" | "review" | "open" | "conflicts";
type TruthImpact = "new" | "extends" | "refines" | "replaces" | "unchanged";
type SourceMode = "rendered" | "raw";
type UpdateState = "idle" | "checking" | "not-configured" | "invalid-config" | "available" | "current" | "error";
type TruthRevision = { value: string; reason: "accepted" | "merged" };
type TruthArea = {
  id: string;
  kind: string;
  title: string;
  description: string;
  question: string;
  state: AreaState;
  pendingValue: string;
  confirmedValue: string;
  history: TruthRevision[];
  sourceHints: string[];
};
type Notice = { kind: NoticeKind; title: string; detail?: string };
type UpdateCheckResult = {
  state: Exclude<UpdateState, "idle" | "checking">;
  currentVersion: string;
  availableVersion: string | null;
  detail: string;
};
type TruthProposal = {
  impact: TruthImpact;
  label: string;
  explanation: string;
  conflict: boolean;
};

const areas: TruthArea[] = [
  {
    id: "purpose",
    kind: "Purpose",
    title: "Project purpose",
    description: "Why the project exists and which outcome it is meant to create.",
    question: "What is this project for? Describe the outcome or problem it exists to address.",
    state: "open",
    pendingValue: "",
    confirmedValue: "",
    history: [],
    sourceHints: ["Project Brain · project identity and intent"],
  },
  {
    id: "direction",
    kind: "Direction",
    title: "Current direction",
    description: "The active product direction and the next meaningful outcome.",
    question: "What is the current product direction or the next useful outcome?",
    state: "open",
    pendingValue: "",
    confirmedValue: "",
    history: [],
    sourceHints: ["Project Brain · accepted goals and decisions"],
  },
  {
    id: "rules",
    kind: "Rules",
    title: "Rules & constraints",
    description: "Protected properties, boundaries and constraints that current work must preserve.",
    question: "Which project rules or constraints must Livariant never violate?",
    state: "open",
    pendingValue: "",
    confirmedValue: "",
    history: [],
    sourceHints: ["Project Brain · protected properties and constraints"],
  },
];

let currentView: View = "steps";
let settingsOpen = false;
let settingsSection: SettingsSection = "general";
let truthFilter: TruthFilter = "all";
let truthSearch = "";
let selectedReviewAreaId: string | null = null;
let selectedSourceAreaId: string | null = null;
let sourceMode: SourceMode = "rendered";
let notice: Notice | null = null;
let updateState: UpdateState = "idle";
let updateResult: UpdateCheckResult | null = null;
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Livariant desktop root not found");

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
})[character] ?? character);

const normalizeTruth = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
const renderTruthText = (value: string) => value.split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`).join("");

const icon = (name: "home" | "steps" | "updates" | "settings" | "diagnostics") => {
  const paths = {
    home: '<path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    steps: '<path d="M7 4h13M7 12h13M7 20h13"/><path d="m2.5 4 1 1 2-2M2.5 12l1 1 2-2M2.5 20l1 1 2-2"/>',
    updates: '<path d="M20 7h-5V2"/><path d="M20 7a9 9 0 1 0 2 5"/>',
    settings: '<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21H10v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
    diagnostics: '<path d="M4 19V9m5 10V5m5 14v-7m5 7V3"/>',
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[name]}</svg>`;
};

const classifyTruthProposal = (area: TruthArea, proposedValue = area.pendingValue): TruthProposal => {
  const existing = normalizeTruth(area.confirmedValue);
  const proposed = normalizeTruth(proposedValue);
  if (!existing) return { impact: "new", label: "New", explanation: "Adds new durable knowledge to this Project Brain area.", conflict: false };
  if (existing === proposed) return { impact: "unchanged", label: "No material change", explanation: "The proposed statement matches the currently confirmed Project Brain knowledge.", conflict: false };
  if (proposed.includes(existing) && proposed.length > existing.length) {
    return { impact: "extends", label: "Extends", explanation: "The proposal contains the existing statement and adds more context. Until semantic Project Brain analysis is connected, Livariant treats any material change to confirmed knowledge as potentially conflicting and requires review.", conflict: true };
  }
  if (existing.includes(proposed) && existing.length > proposed.length) {
    return { impact: "refines", label: "Refines", explanation: "The proposal narrows the existing statement. Until semantic Project Brain analysis is connected, this remains a potential conflict that requires review.", conflict: true };
  }
  return { impact: "replaces", label: "Replaces", explanation: "The proposal is materially different from the currently confirmed statement and may replace it.", conflict: true };
};

const areaState = (area: TruthArea) => {
  if (area.state === "confirmed") return { label: "Confirmed", css: "confirmed" };
  if (area.state === "review") {
    const proposal = classifyTruthProposal(area);
    return { label: proposal.conflict ? "Conflict to review" : "Needs review", css: proposal.conflict ? "conflict" : "review" };
  }
  if (area.state === "deferred") return { label: "Deferred", css: "open" };
  return { label: "Knowledge gap", css: "open" };
};

const areaTypeCode = (kind: string) => kind === "Purpose" ? "P" : kind === "Direction" ? "D" : "R";

const sourceMarkdown = (area: TruthArea) => {
  const value = area.confirmedValue.trim() || "_No canonical Project Brain content is loaded for this area in the renderer preview._";
  return `# ${area.title}\n\n${value}\n`;
};

const renderAreaCard = (area: TruthArea) => {
  const state = areaState(area);
  const proposal = area.state === "review" ? classifyTruthProposal(area) : null;
  const searchText = `${area.kind} ${area.title} ${area.description} ${area.question} ${area.pendingValue} ${area.confirmedValue}`.toLowerCase();
  const composerValue = area.pendingValue;
  return `
    <article class="truth-area-card" data-truth-item data-state="${area.state}" data-conflict="${proposal?.conflict === true ? "true" : "false"}" data-search="${escapeHtml(searchText)}" data-area="${area.id}">
      <div class="truth-area-head">
        <div class="truth-area-identity"><span class="truth-item-type" title="${escapeHtml(area.kind)}">${areaTypeCode(area.kind)}</span><div><span class="eyebrow">${escapeHtml(area.kind)}</span><h3>${escapeHtml(area.title)}</h3><p>${escapeHtml(area.description)}</p></div></div>
        <div class="truth-area-head-actions"><span class="truth-state truth-state-${state.css}">${state.label}</span><button class="button secondary view-truth-source" type="button">View source</button></div>
      </div>

      <div class="truth-area-current ${area.confirmedValue ? "has-value" : "empty"}">
        <div class="truth-area-current-head"><div><small>Project Brain snapshot</small><strong>${area.confirmedValue ? "Current canonical knowledge" : "No canonical knowledge loaded yet"}</strong></div><span class="truth-source-origin">Project Brain</span></div>
        ${area.confirmedValue
          ? `<div class="truth-formatted-value">${renderTruthText(area.confirmedValue)}</div>`
          : `<p class="truth-area-empty-copy">This renderer preview does not create a separate Project Truth store. Once the Project Brain bridge is connected, this area will display the relevant existing canonical knowledge here.</p>`}
      </div>

      ${area.state === "review" && area.pendingValue ? `<div class="truth-area-review-callout ${proposal?.conflict ? "conflict" : ""}"><div><small>${proposal?.conflict ? "Potential conflict" : "Proposal waiting"}</small><strong>${escapeHtml(proposal?.label ?? "Needs review")}</strong><p>${escapeHtml(area.pendingValue)}</p></div><button class="button primary review-truth" type="button">Review proposal</button></div>` : ""}

      <div class="truth-conversation">
        <div class="truth-conversation-prompt"><span class="truth-source-badge livariant">L</span><div><small>Livariant</small><p>${escapeHtml(area.state === "open" || area.state === "deferred" ? area.question : "Tell Livariant what changed, what is missing or what should be reconsidered in this area.")}</p></div></div>
        <div class="truth-composer">
          <textarea class="truth-composer-input" aria-label="Tell Livariant about ${escapeHtml(area.title)}" placeholder="Tell Livariant what changed…">${escapeHtml(composerValue)}</textarea>
          <div class="truth-composer-footer"><span>Input stays evidence until review.</span><button class="button primary analyze-truth-input" type="button">Analyze</button></div>
        </div>
      </div>
    </article>`;
};

const renderTruthReviewModal = () => {
  const area = areas.find((candidate) => candidate.id === selectedReviewAreaId);
  if (!area || area.state !== "review") return "";
  const proposal = classifyTruthProposal(area);
  const existing = area.confirmedValue;
  const proposed = area.pendingValue;
  const diff = existing
    ? `<div class="truth-review-diff-line removed"><span>−</span><div><small>Current Project Brain</small><p>${escapeHtml(existing)}</p></div></div><div class="truth-review-diff-line added"><span>+</span><div><small>Proposed Project Brain</small><p>${escapeHtml(proposed)}</p></div></div>`
    : `<div class="truth-review-diff-line added"><span>+</span><div><small>Proposed addition</small><p>${escapeHtml(proposed)}</p></div></div>`;
  return `
    <div class="truth-review-backdrop" data-close-truth-review>
      <section class="truth-review-modal ${proposal.conflict ? "truth-review-modal-conflict" : ""}" role="dialog" aria-modal="true" aria-labelledby="truth-review-title" data-truth-review-modal>
        <button class="truth-review-close" type="button" data-close-truth-review aria-label="Close Project Truth review">×</button>
        <header class="truth-review-header">
          <div><span class="eyebrow">Manual review required</span><h2 id="truth-review-title">Review Project Brain change</h2><p>Livariant may analyze and propose. Canonical project knowledge changes only after your decision.</p></div>
          <span class="truth-impact truth-impact-${proposal.impact}">${escapeHtml(proposal.label)}</span>
        </header>

        ${proposal.conflict ? `<section class="truth-review-alert"><span class="truth-review-alert-icon">!</span><div><small>Potential conflict</small><h3>Confirmed Project Brain knowledge would change.</h3><p>The renderer cannot prove semantic compatibility yet, so Livariant keeps the current truth untouched until you explicitly resolve the proposal.</p></div></section>` : ""}

        <section class="truth-review-summary">
          <div><small>Area</small><strong>${escapeHtml(area.kind)} · ${escapeHtml(area.title)}</strong></div>
          <div><small>Conflict state</small><strong>${proposal.conflict ? "Review required" : "None detected"}</strong></div>
          <div><small>Proposed effect</small><strong>${escapeHtml(proposal.label)}</strong></div>
        </section>

        <section class="truth-review-analysis truth-source-livariant">
          <div class="truth-source-heading"><span class="truth-source-badge livariant">L</span><div><small>Livariant analysis</small><h3>${escapeHtml(proposal.explanation)}</h3></div></div>
          <p>This slice still compares renderer-session evidence with the current area snapshot. Persistent cross-entry semantic analysis and the local mutation coordinator are the next Core layer, not something this UI pretends is already active.</p>
        </section>

        <section class="truth-review-compare">
          <div class="truth-review-source-card source-confirmed">
            <div class="truth-source-heading"><span class="truth-source-badge confirmed">✓</span><div><small>Project Brain</small><h3>Current canonical statement</h3></div></div>
            ${existing ? `<div class="truth-review-source-text">${renderTruthText(existing)}</div>` : '<div class="truth-review-source-empty">No confirmed Project Brain statement is loaded for this area yet.</div>'}
          </div>
          <div class="truth-review-source-card source-user">
            <div class="truth-source-heading"><span class="truth-source-badge user">U</span><div><small>User input</small><h3>Evidence submitted from Desktop</h3></div></div>
            <textarea class="truth-review-proposal" data-review-proposal aria-label="Proposed Project Brain text">${escapeHtml(proposed)}</textarea>
            <button class="text-button edit-review-proposal" type="button">Edit proposal</button>
          </div>
        </section>

        <section class="truth-review-section truth-change-preview">
          <div class="truth-review-section-head"><div><span class="eyebrow">Change preview</span><h3>What this renderer preview would change</h3></div></div>
          <div class="truth-review-diff">${diff}</div>
        </section>

        <section class="truth-review-sources">
          <span>i</span><p><strong>Boundary:</strong> Project Truth Desktop is a view and controlled mutation surface over the existing Project Brain. This renderer slice creates no new canonical file or competing knowledge store.</p>
        </section>

        <footer class="truth-review-actions">
          <div class="truth-decision-copy"><span class="eyebrow">Decision</span><strong>Choose what should become canonical knowledge.</strong></div>
          <div class="truth-decision-buttons"><button class="text-button reject-truth-review" type="button">Reject evidence</button>${existing ? '<button class="button secondary keep-truth-review" type="button">Keep existing</button>' : ""}<button class="button primary accept-truth-review" type="button">Accept into Project Truth</button></div>
        </footer>
      </section>
    </div>`;
};

const renderTruthSourceModal = () => {
  const area = areas.find((candidate) => candidate.id === selectedSourceAreaId);
  if (!area) return "";
  const markdown = sourceMarkdown(area);
  return `
    <div class="truth-source-backdrop" data-close-truth-source>
      <section class="truth-source-modal" role="dialog" aria-modal="true" aria-labelledby="truth-source-title" data-truth-source-modal>
        <button class="truth-review-close" type="button" data-close-truth-source aria-label="Close source view">×</button>
        <header class="truth-source-modal-head"><div><span class="eyebrow">Existing Project Brain</span><h2 id="truth-source-title">${escapeHtml(area.title)} source</h2><p>Project Truth does not own another copy. This view is reserved for the existing canonical Project Brain source that backs this area.</p></div><span class="truth-source-origin">Project Brain</span></header>
        <div class="truth-source-warning"><span>i</span><p><strong>Renderer preview:</strong> the persistent Project Brain read bridge is not connected in PR #124 yet. The content below is a session projection only so the interaction and Markdown presentation can be reviewed without inventing a second source of truth.</p></div>
        <div class="truth-source-meta">${area.sourceHints.map((hint) => `<span>${escapeHtml(hint)}</span>`).join("")}</div>
        <div class="truth-source-tabs" role="group" aria-label="Source display mode"><button class="truth-source-tab ${sourceMode === "rendered" ? "active" : ""}" data-source-mode="rendered" type="button">Rendered</button><button class="truth-source-tab ${sourceMode === "raw" ? "active" : ""}" data-source-mode="raw" type="button">Raw Markdown</button></div>
        ${sourceMode === "raw"
          ? `<pre class="truth-source-raw"><code>${escapeHtml(markdown)}</code></pre>`
          : `<article class="truth-source-rendered"><h1>${escapeHtml(area.title)}</h1>${area.confirmedValue ? renderTruthText(area.confirmedValue) : '<p><em>No canonical Project Brain content is loaded for this area in the renderer preview.</em></p>'}</article>`}
        ${area.history.length ? `<details class="truth-source-history"><summary>Session revision preview · ${area.history.length}</summary>${[...area.history].reverse().map((revision, index) => `<div><small>Previous session revision ${area.history.length - index}</small>${renderTruthText(revision.value)}</div>`).join("")}</details>` : ""}
      </section>
    </div>`;
};

const renderProjectTruthView = () => {
  const needsReview = areas.filter((area) => area.state === "review").length;
  const openQuestions = areas.filter((area) => area.state === "open" || area.state === "deferred").length;
  const confirmed = areas.filter((area) => area.state === "confirmed").length;
  const conflicts = areas.filter((area) => area.state === "review" && classifyTruthProposal(area).conflict).length;
  return `
    <div class="truth-workspace truth-workspace-areas">
      <header class="topbar"><div><span class="eyebrow">Project Brain workspace</span><h1>Project Truth</h1><p>A clear view over Livariant's existing Project Brain: inspect current knowledge, tell Livariant what changed and review every canonical update before it is accepted.</p></div><button class="project-chip" type="button"><span class="project-icon">L</span><span><small>Current project</small><strong>No project selected</strong></span><span class="chevron">⌄</span></button></header>

      <div class="truth-toolbar">
        <label class="truth-search" aria-label="Search Project Truth"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg><input type="search" value="${escapeHtml(truthSearch)}" placeholder="Search Project Brain areas…" data-truth-search /></label>
      </div>

      <section class="truth-summary-grid" aria-label="Project Truth status">
        <div class="truth-summary-card"><div class="truth-summary-icon">✓</div><div><small>Confirmed areas</small><strong>${confirmed}</strong></div></div>
        <div class="truth-summary-card"><div class="truth-summary-icon">R</div><div><small>Needs review</small><strong>${needsReview}</strong></div></div>
        <div class="truth-summary-card"><div class="truth-summary-icon">?</div><div><small>Knowledge gaps</small><strong>${openQuestions}</strong></div></div>
        <div class="truth-summary-card"><div class="truth-summary-icon">!</div><div><small>Potential conflicts</small><strong>${conflicts}</strong></div></div>
      </section>

      <section class="truth-main-card truth-area-workspace">
        <div class="truth-main-head"><div><span class="eyebrow">Curated areas</span><h2>Work with Project Brain without growing an endless list</h2></div><div class="truth-filters" role="group" aria-label="Filter Project Truth">
          <button class="truth-filter ${truthFilter === "all" ? "active" : ""}" type="button" data-truth-filter="all">All</button>
          <button class="truth-filter ${truthFilter === "review" ? "active" : ""}" type="button" data-truth-filter="review">Needs review</button>
          <button class="truth-filter ${truthFilter === "open" ? "active" : ""}" type="button" data-truth-filter="open">Knowledge gaps</button>
          <button class="truth-filter ${truthFilter === "conflicts" ? "active" : ""}" type="button" data-truth-filter="conflicts">Conflicts</button>
        </div></div>
        <div class="truth-area-list">${areas.map(renderAreaCard).join("")}<div class="truth-empty" data-truth-empty hidden><strong>Nothing matches this view</strong><p>Try another search or filter.</p></div></div>
      </section>

      <div class="truth-boundary-card"><span>i</span><p><strong>One canonical brain, multiple input surfaces.</strong> Desktop, Codex, Claude and other providers may submit evidence, but Project Brain remains the durable source of truth. The future local mutation coordinator will serialize accepted writes and reject stale revisions before mutation.</p></div>
      ${renderTruthReviewModal()}
      ${renderTruthSourceModal()}
    </div>`;
};

const updateCopy = () => {
  if (updateState === "checking") return { eyebrow: "Checking update channel", title: "Checking for updates…", detail: "Livariant is asking the fixed host-side updater boundary for update state." };
  if (updateResult?.state === "available") return { eyebrow: "Update available", title: `${updateResult.availableVersion ?? "A newer version"} is available`, detail: updateResult.detail };
  if (updateResult?.state === "current") return { eyebrow: "Up to date", title: `Livariant ${updateResult.currentVersion}`, detail: updateResult.detail };
  if (updateResult?.state === "not-configured") return { eyebrow: "Updater foundation", title: "Update channel not configured yet", detail: updateResult.detail };
  if (updateResult?.state === "invalid-config" || updateResult?.state === "error") return { eyebrow: "Update check needs attention", title: "Update check did not complete", detail: updateResult.detail };
  return { eyebrow: "Secure preview updates", title: "Check before changing anything", detail: "Update checks remain behind the fixed host-side updater boundary." };
};

const renderUpdatesView = () => {
  const copy = updateCopy();
  const checking = updateState === "checking";
  const showCheckButton = updateResult?.state !== "available";
  return `
    <header class="topbar"><div><span class="eyebrow">Desktop lifecycle</span><h1>Updates</h1><p>Update availability is evidence. Livariant will not replace installed code until artifact and update authority are explicitly verified.</p></div></header>
    <section class="progress-panel"><div><span class="eyebrow">${copy.eyebrow}</span><h2>${escapeHtml(copy.title)}</h2><p>${escapeHtml(copy.detail)}</p></div>${showCheckButton ? `<button class="button primary check-updates" type="button" ${checking ? "disabled" : ""}>${checking ? "Checking…" : "Check for updates"}</button>` : ""}</section>
    <section class="steps">
      <article class="step-card state-open"><div class="step-head"><div class="step-number">01</div><div class="step-copy"><div class="step-title-row"><h3>Signed update identity</h3><span class="state-pill">Verified boundary</span></div><p>The renderer cannot supply arbitrary update URLs or executable paths.</p></div></div></article>
      <article class="step-card state-open"><div class="step-head"><div class="step-number">02</div><div class="step-copy"><div class="step-title-row"><h3>Install authority</h3><span class="state-pill">User triggered</span></div><p>A successful availability check alone never authorizes installation or restart.</p></div></div></article>
    </section>`;
};

const renderContent = () => {
  if (currentView === "updates") return renderUpdatesView();
  if (currentView === "connections") return renderConnectionsView();
  if (currentView === "diagnostics") return renderDiagnosticsView();
  return renderProjectTruthView();
};

const renderSettingsContent = () => {
  if (settingsSection === "connections") return renderConnectionsSettingsView();
  if (settingsSection === "system") return `
    <section class="settings-panel">
      <span class="eyebrow">Desktop</span><h2>System</h2>
      <p>Technical version and runtime information will live here instead of occupying normal work pages.</p>
      <div class="settings-card"><div><strong>Foundation preview</strong><span>System information is intentionally consolidated in Settings.</span></div><span class="settings-badge">Preview</span></div>
    </section>`;
  return `
    <section class="settings-panel">
      <span class="eyebrow">Livariant</span><h2>General</h2>
      <p>Global behavior and low-frequency configuration will be collected here as the Desktop surface grows.</p>
      <div class="settings-card"><div><strong>Settings foundation</strong><span>This modal establishes the permanent home for configuration without crowding the main workspace.</span></div><span class="settings-badge">Ready</span></div>
    </section>`;
};

const renderSettingsModal = () => settingsOpen ? `
  <div class="modal-backdrop" data-settings-backdrop>
    <section class="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" data-settings-modal>
      <aside class="settings-nav">
        <div class="settings-heading"><span class="eyebrow">Preferences</span><h2 id="settings-title">Settings</h2></div>
        <button class="settings-nav-item ${settingsSection === "general" ? "active" : ""}" data-settings-section="general" type="button">${icon("settings")}<span>General</span></button>
        <button class="settings-nav-item ${settingsSection === "connections" ? "active" : ""}" data-settings-section="connections" type="button">${icon("diagnostics")}<span>Connections</span></button>
        <button class="settings-nav-item ${settingsSection === "system" ? "active" : ""}" data-settings-section="system" type="button">${icon("updates")}<span>System</span></button>
      </aside>
      <div class="settings-content"><button class="modal-close" data-close-settings type="button" aria-label="Close settings">×</button><div class="settings-content-body">${renderSettingsContent()}</div></div>
    </section>
  </div>` : "";

const renderNotice = () => notice ? `
  <div class="notice notice-${notice.kind}" role="status" aria-live="polite"><span class="notice-dot"></span><div><strong>${escapeHtml(notice.title)}</strong>${notice.detail ? `<p>${escapeHtml(notice.detail)}</p>` : ""}</div><button class="notice-close" type="button" aria-label="Dismiss status">×</button></div>` : "";

const applyTruthFilters = () => {
  if (currentView !== "steps") return;
  const query = truthSearch.trim().toLowerCase();
  let visibleCount = 0;
  document.querySelectorAll<HTMLElement>("[data-truth-item]").forEach((item) => {
    const state = item.dataset.state;
    const conflict = item.dataset.conflict === "true";
    const matchesFilter = truthFilter === "all"
      || (truthFilter === "review" && state === "review")
      || (truthFilter === "open" && (state === "open" || state === "deferred"))
      || (truthFilter === "conflicts" && conflict);
    const matchesSearch = !query || (item.dataset.search ?? "").includes(query);
    const visible = matchesFilter && matchesSearch;
    item.hidden = !visible;
    if (visible) visibleCount += 1;
  });
  const empty = document.querySelector<HTMLElement>("[data-truth-empty]");
  if (empty) empty.hidden = visibleCount > 0;
};

const renderSettingsSectionOnly = () => {
  const body = document.querySelector<HTMLElement>(".settings-content-body");
  if (!body) { render(); return; }
  body.innerHTML = renderSettingsContent();
  document.querySelectorAll<HTMLButtonElement>("[data-settings-section]").forEach((button) => {
    button.classList.toggle("active", button.dataset.settingsSection === settingsSection);
  });
  bindConnectionDiagnosticsEvents(renderSettingsSectionOnly);
};

const archiveCurrentTruth = (area: TruthArea, reason: TruthRevision["reason"]) => {
  const current = area.confirmedValue.trim();
  if (!current) return;
  const latest = area.history.at(-1)?.value ?? "";
  if (normalizeTruth(latest) === normalizeTruth(current)) return;
  area.history.push({ value: current, reason });
};

const closeSettings = () => { settingsOpen = false; render(); };
const closeTruthReview = () => { selectedReviewAreaId = null; render(); };
const closeTruthSource = () => { selectedSourceAreaId = null; render(); };

const render = () => {
  const attentionCount = areas.filter((area) => area.state === "review" || area.state === "open" || area.state === "deferred").length;
  app.innerHTML = `
    <div class="desktop-frame">
      <header class="window-titlebar" data-tauri-drag-region><div class="window-brand" data-tauri-drag-region><img src="${livariantLogo}" alt="" aria-hidden="true"/><span data-tauri-drag-region>Livariant</span></div><div class="window-controls" aria-label="Window controls"><button class="window-control" data-window-action="minimize" type="button" aria-label="Minimize">−</button><button class="window-control" data-window-action="maximize" type="button" aria-label="Maximize">□</button><button class="window-control close" data-window-action="close" type="button" aria-label="Close">×</button></div></header>
      <div class="app-shell"><aside class="sidebar">
        <div class="brand"><div class="brand-mark" style="overflow:hidden;border:0;background:transparent;box-shadow:none;"><img src="${livariantLogo}" alt="Livariant logo" style="width:100%;height:100%;object-fit:contain;display:block;"/></div><div><strong>Livariant</strong><small>Desktop Foundation</small></div></div>
        <nav class="nav" aria-label="Primary navigation">
          <button class="nav-item">${icon("home")}<span>Overview</span></button>
          <button class="nav-item ${currentView === "steps" ? "active" : ""}" data-view="steps">${icon("steps")}<span>Project Truth</span><b>${attentionCount}</b></button>
          <button class="nav-item ${currentView === "diagnostics" ? "active" : ""}" data-view="diagnostics">${icon("diagnostics")}<span>Diagnostics</span></button>
          <button class="nav-item ${currentView === "updates" ? "active" : ""}" data-view="updates">${icon("updates")}<span>Updates</span></button>
        </nav>
        <div class="sidebar-lower">
          <button class="nav-item settings-launcher ${settingsOpen ? "active" : ""}" type="button" data-open-settings>${icon("settings")}<span>Settings</span></button>
          <div class="sidebar-footer"><div class="status-dot"></div><div><strong>Foundation preview</strong><small>Connector + diagnostics integration</small></div></div>
        </div>
      </aside><main class="content">${renderContent()}</main></div>
      ${renderNotice()}
      ${renderSettingsModal()}
    </div>`;
  bindEvents();
  applyTruthFilters();
};

const activateView = async (view: View) => {
  currentView = view;
  settingsOpen = false;
  selectedReviewAreaId = null;
  selectedSourceAreaId = null;
  render();
  if (view === "connections") await refreshConnector();
  if (view === "diagnostics") await refreshDiagnostics();
  if (view === "connections" || view === "diagnostics") render();
};

const bindEvents = () => {
  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.view;
      if (view === "steps" || view === "updates" || view === "connections" || view === "diagnostics") void activateView(view);
    });
  });

  document.querySelector<HTMLButtonElement>("[data-open-settings]")?.addEventListener("click", () => { settingsOpen = true; selectedReviewAreaId = null; selectedSourceAreaId = null; render(); });
  document.querySelector<HTMLButtonElement>("[data-close-settings]")?.addEventListener("click", (event) => { event.stopPropagation(); closeSettings(); });
  document.querySelector<HTMLElement>("[data-settings-backdrop]")?.addEventListener("click", (event) => {
    if (event.target !== event.currentTarget) return;
    closeSettings();
  });

  document.querySelectorAll<HTMLButtonElement>("[data-settings-section]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      const section = button.dataset.settingsSection;
      if (section !== "general" && section !== "connections" && section !== "system") return;
      settingsSection = section;
      renderSettingsSectionOnly();
      if (section === "connections") {
        await refreshConnector();
        renderSettingsSectionOnly();
      }
    });
  });

  document.querySelector<HTMLInputElement>("[data-truth-search]")?.addEventListener("input", (event) => {
    truthSearch = (event.currentTarget as HTMLInputElement).value;
    applyTruthFilters();
  });

  document.querySelectorAll<HTMLButtonElement>("[data-truth-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.truthFilter;
      if (filter !== "all" && filter !== "review" && filter !== "open" && filter !== "conflicts") return;
      truthFilter = filter;
      document.querySelectorAll<HTMLButtonElement>("[data-truth-filter]").forEach((candidate) => candidate.classList.toggle("active", candidate === button));
      applyTruthFilters();
    });
  });

  document.querySelectorAll<HTMLElement>("[data-area]").forEach((card) => {
    const area = areas.find((candidate) => candidate.id === card.dataset.area);
    if (!area) return;
    const composer = card.querySelector<HTMLTextAreaElement>(".truth-composer-input");
    card.querySelector(".analyze-truth-input")?.addEventListener("click", () => {
      const value = composer?.value.trim() ?? "";
      if (!value) return;
      area.pendingValue = value;
      area.state = "review";
      selectedReviewAreaId = area.id;
      notice = null;
      render();
    });
    card.querySelector(".review-truth")?.addEventListener("click", () => { selectedReviewAreaId = area.id; render(); });
    card.querySelector(".view-truth-source")?.addEventListener("click", () => { selectedSourceAreaId = area.id; sourceMode = "rendered"; render(); });
  });

  document.querySelectorAll<HTMLElement>("[data-close-truth-review]").forEach((element) => {
    element.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-truth-review-modal]") && !target.closest(".truth-review-close")) return;
      closeTruthReview();
    });
  });

  document.querySelectorAll<HTMLElement>("[data-close-truth-source]").forEach((element) => {
    element.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-truth-source-modal]") && !target.closest(".truth-review-close")) return;
      closeTruthSource();
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-source-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.sourceMode;
      if (mode !== "rendered" && mode !== "raw") return;
      sourceMode = mode;
      render();
    });
  });

  document.querySelector<HTMLButtonElement>(".edit-review-proposal")?.addEventListener("click", () => {
    document.querySelector<HTMLTextAreaElement>("[data-review-proposal]")?.focus();
  });

  document.querySelector<HTMLButtonElement>(".accept-truth-review")?.addEventListener("click", () => {
    const area = areas.find((candidate) => candidate.id === selectedReviewAreaId);
    const proposal = document.querySelector<HTMLTextAreaElement>("[data-review-proposal]")?.value.trim() ?? "";
    if (!area || !proposal) return;
    if (area.confirmedValue && normalizeTruth(area.confirmedValue) !== normalizeTruth(proposal)) archiveCurrentTruth(area, "accepted");
    area.confirmedValue = proposal;
    area.pendingValue = "";
    area.state = "confirmed";
    selectedReviewAreaId = null;
    notice = { kind: "success", title: "Project Truth updated", detail: `${area.title} was accepted in the renderer preview. Persistent Project Brain mutation is intentionally not claimed by this UI slice.` };
    render();
  });

  document.querySelector<HTMLButtonElement>(".keep-truth-review")?.addEventListener("click", () => {
    const area = areas.find((candidate) => candidate.id === selectedReviewAreaId);
    if (!area) return;
    area.pendingValue = "";
    area.state = area.confirmedValue ? "confirmed" : "open";
    selectedReviewAreaId = null;
    notice = { kind: "info", title: "Existing Project Truth kept", detail: `${area.title} was not changed.` };
    render();
  });

  document.querySelector<HTMLButtonElement>(".reject-truth-review")?.addEventListener("click", () => {
    const area = areas.find((candidate) => candidate.id === selectedReviewAreaId);
    if (!area) return;
    area.pendingValue = "";
    area.state = area.confirmedValue ? "confirmed" : "open";
    selectedReviewAreaId = null;
    notice = { kind: "info", title: "Evidence rejected", detail: `${area.title} was not changed.` };
    render();
  });

  document.querySelector<HTMLButtonElement>(".notice-close")?.addEventListener("click", () => { notice = null; render(); });

  document.querySelector<HTMLButtonElement>(".check-updates")?.addEventListener("click", async () => {
    updateState = "checking";
    notice = { kind: "info", title: "Checking for updates", detail: "Livariant is contacting the verified update boundary." };
    render();
    try {
      updateResult = await invoke<UpdateCheckResult>("check_for_update");
      updateState = updateResult.state;
      if (updateResult.state === "available") notice = { kind: "success", title: "Update available", detail: updateResult.detail };
      else if (updateResult.state === "current") notice = { kind: "success", title: "Livariant is up to date", detail: updateResult.detail };
      else if (updateResult.state === "not-configured") notice = { kind: "warning", title: "Update channel not configured", detail: updateResult.detail };
      else notice = { kind: "error", title: "Update check needs attention", detail: updateResult.detail };
    } catch (error: unknown) {
      updateResult = { state: "error", currentVersion: "unknown", availableVersion: null, detail: `Update host bridge failed without changing the installation: ${String(error)}` };
      updateState = "error";
      notice = { kind: "error", title: "Update check failed", detail: updateResult.detail };
    }
    render();
  });

  bindConnectionDiagnosticsEvents(settingsOpen && settingsSection === "connections" ? renderSettingsSectionOnly : render);

  document.querySelectorAll<HTMLButtonElement>("[data-window-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.windowAction;
      if (action === "minimize") await appWindow.minimize();
      if (action === "maximize") await appWindow.toggleMaximize();
      if (action === "close") await appWindow.close();
    });
  });
  document.querySelector<HTMLElement>(".window-titlebar")?.addEventListener("dblclick", async (event) => {
    if ((event.target as HTMLElement).closest(".window-controls")) return;
    await appWindow.toggleMaximize();
  });
};

render();