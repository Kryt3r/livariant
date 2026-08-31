import "./glass.css";
import "./styles.css";
import "./project-truth.css";
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
type StepState = "open" | "deferred" | "review" | "confirmed";
type TruthFilter = "all" | "review" | "open" | "conflicts";
type TruthImpact = "new" | "extends" | "refines" | "replaces" | "unchanged";
type UpdateState = "idle" | "checking" | "not-configured" | "invalid-config" | "available" | "current" | "error";
type FirstStep = {
  id: string;
  title: string;
  prompt: string;
  state: StepState;
  pendingValue: string;
  confirmedValue: string;
  kind: string;
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

const steps: FirstStep[] = [
  { id: "purpose", kind: "Purpose", title: "Project purpose", prompt: "What is this project for? Describe the outcome or problem it exists to address.", state: "open", pendingValue: "", confirmedValue: "" },
  { id: "direction", kind: "Direction", title: "Current direction", prompt: "What is the current product direction or the next useful outcome?", state: "open", pendingValue: "", confirmedValue: "" },
  { id: "rules", kind: "Rule", title: "Project rules", prompt: "Which project rules or constraints must Livariant never violate?", state: "open", pendingValue: "", confirmedValue: "" },
];

let currentView: View = "steps";
let settingsOpen = false;
let settingsSection: SettingsSection = "general";
let truthFilter: TruthFilter = "all";
let truthSearch = "";
let selectedReviewStepId: string | null = null;
let notice: Notice | null = null;
let updateState: UpdateState = "idle";
let updateResult: UpdateCheckResult | null = null;
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Livariant desktop root not found");

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
})[character] ?? character);

const normalizeTruth = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

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

const classifyTruthProposal = (step: FirstStep, proposedValue = step.pendingValue): TruthProposal => {
  const existing = normalizeTruth(step.confirmedValue);
  const proposed = normalizeTruth(proposedValue);
  if (!existing) return { impact: "new", label: "New", explanation: "Adds a new confirmed statement to this Project Truth area.", conflict: false };
  if (existing === proposed) return { impact: "unchanged", label: "No material change", explanation: "The proposed statement matches the currently confirmed truth.", conflict: false };
  if (proposed.includes(existing) && proposed.length > existing.length) return { impact: "extends", label: "Extends", explanation: "Keeps the existing statement and adds additional context.", conflict: false };
  if (existing.includes(proposed) && existing.length > proposed.length) return { impact: "refines", label: "Refines", explanation: "Narrows the existing statement to a more focused version.", conflict: false };
  return { impact: "replaces", label: "Replaces", explanation: "Would replace the currently confirmed statement in this Project Truth area.", conflict: true };
};

const truthState = (step: FirstStep) => {
  if (step.state === "confirmed") return { label: "Confirmed truth", css: "confirmed" };
  if (step.state === "review") {
    const proposal = classifyTruthProposal(step);
    return { label: proposal.conflict ? "Conflict to review" : "Needs review", css: proposal.conflict ? "conflict" : "review" };
  }
  if (step.state === "deferred") return { label: "Deferred", css: "open" };
  return { label: "Open question", css: "open" };
};

const truthTypeCode = (kind: string) => kind === "Purpose" ? "P" : kind === "Direction" ? "D" : "R";

const renderTruthItem = (step: FirstStep) => {
  const state = truthState(step);
  const proposal = step.state === "review" ? classifyTruthProposal(step) : null;
  const searchText = `${step.kind} ${step.title} ${step.prompt} ${step.pendingValue} ${step.confirmedValue}`.toLowerCase();
  const editorValue = step.pendingValue || step.confirmedValue;
  return `
    <article class="truth-item" data-truth-item data-state="${step.state}" data-conflict="${proposal?.conflict === true ? "true" : "false"}" data-search="${escapeHtml(searchText)}" data-step="${step.id}">
      <div class="truth-item-type" title="${escapeHtml(step.kind)}">${truthTypeCode(step.kind)}</div>
      <div class="truth-item-copy">
        <div class="truth-item-title-row"><h3>${escapeHtml(step.title)}</h3><span class="truth-state truth-state-${state.css}">${state.label}</span></div>
        <p>${escapeHtml(step.prompt)}</p>
        ${step.confirmedValue ? `<div class="truth-value-block truth-value-confirmed"><small>Confirmed</small><p>${escapeHtml(step.confirmedValue)}</p></div>` : ""}
        ${step.state === "review" && step.pendingValue ? `<div class="truth-value-block truth-value-proposed"><small>Proposed · ${escapeHtml(proposal?.label ?? "Review")}</small><p>${escapeHtml(step.pendingValue)}</p></div>` : ""}
      </div>
      <div class="truth-item-actions">
        ${step.state === "open" || step.state === "deferred" ? '<button class="text-button defer-truth" type="button">Defer</button>' : ""}
        ${step.state === "review"
          ? '<button class="button primary review-truth" type="button">Review proposal</button>'
          : `<button class="button ${step.state === "confirmed" ? "secondary" : "primary"} edit-truth" type="button">${step.state === "confirmed" ? "Propose update" : "Add context"}</button>`}
      </div>
      <div class="truth-editor">
        <textarea aria-label="${escapeHtml(step.title)}" placeholder="Capture context as evidence for review…">${escapeHtml(editorValue)}</textarea>
        <div class="truth-editor-actions"><button class="button secondary cancel-truth" type="button">Cancel</button><button class="button primary save-truth" type="button">Analyze & review</button></div>
      </div>
    </article>`;
};

const renderTruthReviewModal = () => {
  const step = steps.find((candidate) => candidate.id === selectedReviewStepId);
  if (!step || step.state !== "review") return "";
  const proposal = classifyTruthProposal(step);
  const existing = step.confirmedValue;
  const proposed = step.pendingValue;
  const diff = existing
    ? `<div class="truth-review-diff-line removed"><span>−</span><p>${escapeHtml(existing)}</p></div><div class="truth-review-diff-line added"><span>+</span><p>${escapeHtml(proposed)}</p></div>`
    : `<div class="truth-review-diff-line added"><span>+</span><p>${escapeHtml(proposed)}</p></div>`;
  return `
    <div class="truth-review-backdrop" data-close-truth-review>
      <section class="truth-review-modal" role="dialog" aria-modal="true" aria-labelledby="truth-review-title" data-truth-review-modal>
        <button class="truth-review-close" type="button" data-close-truth-review aria-label="Close Project Truth review">×</button>
        <header class="truth-review-header">
          <div><span class="eyebrow">Manual review required</span><h2 id="truth-review-title">Review Project Truth change</h2><p>Livariant analyzed how this evidence would affect the current truth slot. Nothing changes until you approve it.</p></div>
          <span class="truth-impact truth-impact-${proposal.impact}">${escapeHtml(proposal.label)}</span>
        </header>

        <section class="truth-review-summary">
          <div><small>Area</small><strong>${escapeHtml(step.kind)} · ${escapeHtml(step.title)}</strong></div>
          <div><small>Conflicts found</small><strong>${proposal.conflict ? "1 potential conflict" : "None"}</strong></div>
          <div><small>Proposed effect</small><strong>${escapeHtml(proposal.label)}</strong></div>
        </section>

        <section class="truth-review-analysis">
          <span class="eyebrow">What Livariant found</span>
          <h3>${escapeHtml(proposal.explanation)}</h3>
          <p>${proposal.conflict ? "The proposal differs from the existing confirmed statement in the same truth area, so Livariant will not replace it without your decision." : "No replacement conflict was detected in this truth area."}</p>
        </section>

        <section class="truth-review-section">
          <div class="truth-review-section-head"><div><span class="eyebrow">Proposed Project Truth update</span><h3>Review the exact text</h3></div><button class="text-button edit-review-proposal" type="button">Edit proposal</button></div>
          ${existing ? `<div class="truth-review-existing"><small>Existing confirmed truth</small><p>${escapeHtml(existing)}</p></div>` : ""}
          <textarea class="truth-review-proposal" data-review-proposal aria-label="Proposed Project Truth text">${escapeHtml(proposed)}</textarea>
        </section>

        <section class="truth-review-section">
          <span class="eyebrow">Change preview</span>
          <div class="truth-review-diff">${diff}</div>
        </section>

        <section class="truth-review-sources">
          <span>i</span><p><strong>Evidence considered in this preview:</strong> the latest user-entered context and any confirmed statement in this same truth slot. Cross-entry semantic conflict detection and persistent curation are not implemented yet.</p>
        </section>

        <footer class="truth-review-actions">
          <button class="text-button reject-truth-review" type="button">Reject evidence</button>
          ${existing ? '<button class="button secondary keep-truth-review" type="button">Keep existing</button><button class="button secondary merge-truth-review" type="button">Merge both</button>' : ""}
          <button class="button primary accept-truth-review" type="button">Accept into Project Truth</button>
        </footer>
      </section>
    </div>`;
};

const renderProjectTruthView = () => {
  const needsReview = steps.filter((step) => step.state === "review").length;
  const openQuestions = steps.filter((step) => step.state === "open" || step.state === "deferred").length;
  const confirmed = steps.filter((step) => step.state === "confirmed").length;
  const conflicts = steps.filter((step) => step.state === "review" && classifyTruthProposal(step).conflict).length;
  return `
    <div class="truth-workspace">
      <header class="topbar"><div><span class="eyebrow">Project knowledge</span><h1>Project Truth</h1><p>Understand what is known, what still needs review and where the project has unresolved questions.</p></div><button class="project-chip" type="button"><span class="project-icon">L</span><span><small>Current project</small><strong>No project selected</strong></span><span class="chevron">⌄</span></button></header>

      <div class="truth-toolbar">
        <label class="truth-search" aria-label="Search Project Truth"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg><input type="search" value="${escapeHtml(truthSearch)}" placeholder="Search knowledge, questions, rules…" data-truth-search /></label>
      </div>

      <section class="truth-summary-grid" aria-label="Project Truth status">
        <div class="truth-summary-card"><div class="truth-summary-icon">✓</div><div><small>Confirmed truth</small><strong>${confirmed}</strong></div></div>
        <div class="truth-summary-card"><div class="truth-summary-icon">R</div><div><small>Needs review</small><strong>${needsReview}</strong></div></div>
        <div class="truth-summary-card"><div class="truth-summary-icon">?</div><div><small>Open questions</small><strong>${openQuestions}</strong></div></div>
        <div class="truth-summary-card"><div class="truth-summary-icon">!</div><div><small>Conflicts</small><strong>${conflicts}</strong></div></div>
      </section>

      <section class="truth-main-card">
        <div class="truth-main-head"><div><span class="eyebrow">Knowledge workspace</span><h2>What Livariant knows and still needs</h2></div><div class="truth-filters" role="group" aria-label="Filter Project Truth">
          <button class="truth-filter ${truthFilter === "all" ? "active" : ""}" type="button" data-truth-filter="all">All</button>
          <button class="truth-filter ${truthFilter === "review" ? "active" : ""}" type="button" data-truth-filter="review">Needs review</button>
          <button class="truth-filter ${truthFilter === "open" ? "active" : ""}" type="button" data-truth-filter="open">Open questions</button>
          <button class="truth-filter ${truthFilter === "conflicts" ? "active" : ""}" type="button" data-truth-filter="conflicts">Conflicts</button>
        </div></div>
        <div class="truth-items">${steps.map(renderTruthItem).join("")}<div class="truth-empty" data-truth-empty hidden><strong>Nothing matches this view</strong><p>${truthFilter === "conflicts" ? "No conflicts are known in this preview. Livariant will only show conflicts here when there is actual evidence for one." : "Try another search or filter."}</p></div></div>
      </section>

      <div class="truth-boundary-card"><span>i</span><p><strong>Evidence is not automatically truth.</strong> New context is analyzed, shown as a proposed change and requires manual review before it becomes confirmed Project Truth.</p></div>
      ${renderTruthReviewModal()}
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

const closeSettings = () => {
  settingsOpen = false;
  render();
};

const closeTruthReview = () => {
  selectedReviewStepId = null;
  render();
};

const render = () => {
  const attentionCount = steps.filter((step) => step.state === "review" || step.state === "open" || step.state === "deferred").length;
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
  selectedReviewStepId = null;
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

  document.querySelector<HTMLButtonElement>("[data-open-settings]")?.addEventListener("click", () => { settingsOpen = true; selectedReviewStepId = null; render(); });
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

  document.querySelectorAll<HTMLElement>("[data-step]").forEach((card) => {
    const step = steps.find((candidate) => candidate.id === card.dataset.step);
    if (!step) return;
    const editor = card.querySelector<HTMLElement>(".truth-editor");
    const textarea = card.querySelector<HTMLTextAreaElement>(".truth-editor textarea");
    card.querySelector(".edit-truth")?.addEventListener("click", () => { editor?.classList.add("visible"); textarea?.focus(); });
    card.querySelector(".cancel-truth")?.addEventListener("click", () => { editor?.classList.remove("visible"); if (textarea) textarea.value = step.pendingValue || step.confirmedValue; });
    card.querySelector(".defer-truth")?.addEventListener("click", () => { step.state = "deferred"; notice = { kind: "info", title: "Question deferred", detail: `${step.title} stays open and can be revisited later.` }; render(); });
    card.querySelector(".save-truth")?.addEventListener("click", () => {
      const value = textarea?.value.trim() ?? "";
      if (!value) return;
      step.pendingValue = value;
      step.state = "review";
      selectedReviewStepId = step.id;
      notice = null;
      render();
    });
    card.querySelector(".review-truth")?.addEventListener("click", () => { selectedReviewStepId = step.id; render(); });
  });

  document.querySelectorAll<HTMLElement>("[data-close-truth-review]").forEach((element) => {
    element.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-truth-review-modal]") && !target.closest(".truth-review-close")) return;
      closeTruthReview();
    });
  });

  document.querySelector<HTMLButtonElement>(".edit-review-proposal")?.addEventListener("click", () => {
    document.querySelector<HTMLTextAreaElement>("[data-review-proposal]")?.focus();
  });

  document.querySelector<HTMLButtonElement>(".accept-truth-review")?.addEventListener("click", () => {
    const step = steps.find((candidate) => candidate.id === selectedReviewStepId);
    const proposal = document.querySelector<HTMLTextAreaElement>("[data-review-proposal]")?.value.trim() ?? "";
    if (!step || !proposal) return;
    step.pendingValue = proposal;
    step.confirmedValue = proposal;
    step.pendingValue = "";
    step.state = "confirmed";
    selectedReviewStepId = null;
    notice = { kind: "success", title: "Project Truth updated", detail: `${step.title} was confirmed after manual review.` };
    render();
  });

  document.querySelector<HTMLButtonElement>(".keep-truth-review")?.addEventListener("click", () => {
    const step = steps.find((candidate) => candidate.id === selectedReviewStepId);
    if (!step) return;
    step.pendingValue = "";
    step.state = step.confirmedValue ? "confirmed" : "open";
    selectedReviewStepId = null;
    notice = { kind: "info", title: "Existing Project Truth kept", detail: `${step.title} was not changed.` };
    render();
  });

  document.querySelector<HTMLButtonElement>(".merge-truth-review")?.addEventListener("click", () => {
    const step = steps.find((candidate) => candidate.id === selectedReviewStepId);
    const proposal = document.querySelector<HTMLTextAreaElement>("[data-review-proposal]")?.value.trim() ?? "";
    if (!step || !step.confirmedValue || !proposal) return;
    const existing = step.confirmedValue.trim();
    const merged = normalizeTruth(existing) === normalizeTruth(proposal) ? existing : `${existing}\n\n${proposal}`;
    step.confirmedValue = merged;
    step.pendingValue = "";
    step.state = "confirmed";
    selectedReviewStepId = null;
    notice = { kind: "success", title: "Project Truth merged", detail: `${step.title} now preserves both approved statements.` };
    render();
  });

  document.querySelector<HTMLButtonElement>(".reject-truth-review")?.addEventListener("click", () => {
    const step = steps.find((candidate) => candidate.id === selectedReviewStepId);
    if (!step) return;
    step.pendingValue = "";
    step.state = step.confirmedValue ? "confirmed" : "open";
    selectedReviewStepId = null;
    notice = { kind: "info", title: "Evidence rejected", detail: `${step.title} was not changed.` };
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