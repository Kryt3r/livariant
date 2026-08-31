import "./glass.css";
import "./styles.css";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  bindConnectionDiagnosticsEvents,
  refreshConnector,
  refreshDiagnostics,
  renderConnectionsView,
  renderDiagnosticsView,
} from "./connections-diagnostics.js";

const livariantLogo = new URL("./assets/livariant-logo.png", import.meta.url).href;
const appWindow = getCurrentWindow();

type View = "steps" | "updates" | "connections" | "diagnostics";
type SettingsSection = "general" | "connections" | "system";
type NoticeKind = "info" | "success" | "warning" | "error";
type StepState = "open" | "skipped" | "answered";
type UpdateState = "idle" | "checking" | "not-configured" | "invalid-config" | "available" | "current" | "error";
type FirstStep = { id: string; title: string; prompt: string; state: StepState; value: string };
type Notice = { kind: NoticeKind; title: string; detail?: string };
type UpdateCheckResult = {
  state: Exclude<UpdateState, "idle" | "checking">;
  currentVersion: string;
  availableVersion: string | null;
  detail: string;
};

const steps: FirstStep[] = [
  { id: "purpose", title: "Project purpose", prompt: "What is this project for? Describe it in one to three sentences.", state: "open", value: "" },
  { id: "direction", title: "Current direction", prompt: "What is the current product direction or the next useful outcome?", state: "open", value: "" },
  { id: "rules", title: "Project rules", prompt: "Which project rules or constraints must Livariant never violate?", state: "open", value: "" },
];

let currentView: View = "steps";
let settingsOpen = false;
let settingsSection: SettingsSection = "general";
let notice: Notice | null = null;
let updateState: UpdateState = "idle";
let updateResult: UpdateCheckResult | null = null;
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Livariant desktop root not found");

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
})[character] ?? character);

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

const renderStep = (step: FirstStep) => {
  const stateLabel = step.state === "answered" ? "Answered" : step.state === "skipped" ? "Deferred" : "Open";
  return `
    <article class="step-card state-${step.state}" data-step="${step.id}">
      <div class="step-head"><div class="step-number">${String(steps.indexOf(step) + 1).padStart(2, "0")}</div><div class="step-copy">
        <div class="step-title-row"><h3>${step.title}</h3><span class="state-pill">${stateLabel}</span></div><p>${step.prompt}</p>
      </div></div>
      <div class="step-editor"><textarea aria-label="${step.title}" placeholder="Write your answer here…">${escapeHtml(step.value)}</textarea><div class="step-actions editor-actions"><button class="button secondary cancel-answer" type="button">Cancel</button><button class="button primary save-answer" type="button">Save answer</button></div></div>
      <div class="step-summary ${step.state === "answered" ? "visible" : ""}"><p>${step.value ? escapeHtml(step.value) : "No answer entered yet."}</p></div>
      <div class="step-actions default-actions ${step.state === "answered" ? "answered-actions" : ""}">${step.state === "answered" ? '<button class="text-button edit-answer" type="button">Edit answer</button>' : `<button class="text-button skip-step" type="button">${step.state === "skipped" ? "Keep deferred" : "Skip for now"}</button><button class="button primary answer-step" type="button">Answer</button>`}</div>
    </article>`;
};

const renderProjectTruthView = () => {
  const completed = steps.filter((step) => step.state === "answered").length;
  const deferred = steps.filter((step) => step.state === "skipped").length;
  return `
    <header class="topbar"><div><span class="eyebrow">Project knowledge</span><h1>Project Truth</h1><p>Build Livariant's understanding of this project without turning unreviewed input into Authority.</p></div><button class="project-chip" type="button"><span class="project-icon">L</span><span><small>Current project</small><strong>No project selected</strong></span><span class="chevron">⌄</span></button></header>
    <section class="progress-panel"><div><span class="eyebrow">Knowledge intake</span><h2>${completed} of ${steps.length} foundations captured</h2><p>${deferred > 0 ? `${deferred} deferred. ` : ""}This is an interim shell. Search, conflicts, review queues and structured truth curation follow in the dedicated Project Truth redesign.</p></div><div class="progress-ring" style="--progress:${Math.round((completed / steps.length) * 100)}%"><span>${Math.round((completed / steps.length) * 100)}%</span></div></section>
    <section class="steps" aria-label="Project Truth intake questions">${steps.map(renderStep).join("")}</section>
    <footer class="truth-note"><span class="truth-icon">i</span><p><strong>Truth boundary:</strong> answers in this preview are UI state only. Future persistence must preserve Livariant's Evidence → Review → Project Truth rules and must never grant mutation, runtime, lifecycle or release Authority.</p></footer>`;
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
  if (settingsSection === "connections") return `
    <section class="settings-panel">
      <span class="eyebrow">LLMs & agents</span><h2>Connections</h2>
      <p>Connection management belongs here rather than in permanent primary navigation. The provider overview and one-click connection redesign will replace the current technical page in the next slice.</p>
      <div class="settings-card"><div><strong>Current connection manager</strong><span>Open the existing manager while the provider-card redesign is being built.</span></div><button class="button secondary open-connections" type="button">Open connections</button></div>
    </section>`;
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
  <div class="modal-backdrop" data-close-settings>
    <section class="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" data-settings-modal>
      <aside class="settings-nav">
        <div class="settings-heading"><span class="eyebrow">Preferences</span><h2 id="settings-title">Settings</h2></div>
        <button class="settings-nav-item ${settingsSection === "general" ? "active" : ""}" data-settings-section="general" type="button">${icon("settings")}<span>General</span></button>
        <button class="settings-nav-item ${settingsSection === "connections" ? "active" : ""}" data-settings-section="connections" type="button">${icon("diagnostics")}<span>Connections</span></button>
        <button class="settings-nav-item ${settingsSection === "system" ? "active" : ""}" data-settings-section="system" type="button">${icon("updates")}<span>System</span></button>
      </aside>
      <div class="settings-content"><button class="modal-close" data-close-settings type="button" aria-label="Close settings">×</button>${renderSettingsContent()}</div>
    </section>
  </div>` : "";

const renderNotice = () => notice ? `
  <div class="notice notice-${notice.kind}" role="status" aria-live="polite"><span class="notice-dot"></span><div><strong>${escapeHtml(notice.title)}</strong>${notice.detail ? `<p>${escapeHtml(notice.detail)}</p>` : ""}</div><button class="notice-close" type="button" aria-label="Dismiss status">×</button></div>` : "";

const render = () => {
  const completed = steps.filter((step) => step.state === "answered").length;
  app.innerHTML = `
    <div class="desktop-frame">
      <header class="window-titlebar" data-tauri-drag-region><div class="window-brand" data-tauri-drag-region><img src="${livariantLogo}" alt="" aria-hidden="true"/><span data-tauri-drag-region>Livariant</span></div><div class="window-controls" aria-label="Window controls"><button class="window-control" data-window-action="minimize" type="button" aria-label="Minimize">−</button><button class="window-control" data-window-action="maximize" type="button" aria-label="Maximize">□</button><button class="window-control close" data-window-action="close" type="button" aria-label="Close">×</button></div></header>
      <div class="app-shell"><aside class="sidebar">
        <div class="brand"><div class="brand-mark" style="overflow:hidden;border:0;background:transparent;box-shadow:none;"><img src="${livariantLogo}" alt="Livariant logo" style="width:100%;height:100%;object-fit:contain;display:block;"/></div><div><strong>Livariant</strong><small>Desktop Foundation</small></div></div>
        <nav class="nav" aria-label="Primary navigation">
          <button class="nav-item">${icon("home")}<span>Overview</span></button>
          <button class="nav-item ${currentView === "steps" ? "active" : ""}" data-view="steps">${icon("steps")}<span>Project Truth</span><b>${completed}/${steps.length}</b></button>
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
};

const activateView = async (view: View) => {
  currentView = view;
  settingsOpen = false;
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

  document.querySelector<HTMLButtonElement>("[data-open-settings]")?.addEventListener("click", () => { settingsOpen = true; render(); });
  document.querySelectorAll<HTMLElement>("[data-close-settings]").forEach((element) => {
    element.addEventListener("click", (event) => {
      if ((event.target as HTMLElement).closest("[data-settings-modal]") && !(event.target as HTMLElement).closest(".modal-close")) return;
      settingsOpen = false; render();
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-settings-section]").forEach((button) => {
    button.addEventListener("click", () => {
      const section = button.dataset.settingsSection;
      if (section === "general" || section === "connections" || section === "system") { settingsSection = section; render(); }
    });
  });
  document.querySelector<HTMLButtonElement>(".open-connections")?.addEventListener("click", () => void activateView("connections"));
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

  document.querySelectorAll<HTMLElement>("[data-step]").forEach((card) => {
    const step = steps.find((candidate) => candidate.id === card.dataset.step);
    if (!step) return;
    const editor = card.querySelector<HTMLElement>(".step-editor");
    const summary = card.querySelector<HTMLElement>(".step-summary");
    const textarea = card.querySelector<HTMLTextAreaElement>("textarea");
    const defaultActions = card.querySelector<HTMLElement>(".default-actions");
    const openEditor = () => {
      summary?.classList.remove("visible");
      editor?.classList.add("visible");
      if (defaultActions) { defaultActions.style.display = "none"; defaultActions.setAttribute("aria-hidden", "true"); }
      textarea?.focus();
    };
    card.querySelector(".answer-step")?.addEventListener("click", openEditor);
    card.querySelector(".edit-answer")?.addEventListener("click", openEditor);
    card.querySelector(".cancel-answer")?.addEventListener("click", () => render());
    card.querySelector(".skip-step")?.addEventListener("click", () => { step.state = "skipped"; render(); });
    card.querySelector(".save-answer")?.addEventListener("click", () => {
      const value = textarea?.value.trim() ?? "";
      if (!value) return;
      step.value = value; step.state = "answered"; notice = { kind: "success", title: "Project knowledge saved", detail: `${step.title} was captured for this preview session.` }; render();
    });
  });

  bindConnectionDiagnosticsEvents(render);

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