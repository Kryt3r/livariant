import "./brand-depth-v2.css";
import "./diagnostics-polish.js";
import "./readability-polish.css";
import "./i18n-hmr-guard.js";

const STORAGE_KEY = "livariant.project-truth.accordions.v1";
type AccordionState = Record<string, boolean>;

const readState = (): AccordionState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as AccordionState : {};
  } catch { return {}; }
};

const writeState = (state: AccordionState) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { /* UI preference persistence must never block the renderer. */ }
};

const state = readState();
const chevron = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m7 10 5 5 5-5" /></svg>`;

const applyAccordionState = () => {
  const cards = [...document.querySelectorAll<HTMLElement>(".truth-area-card[data-area]")];
  cards.forEach((card, index) => {
    const areaId = card.dataset.area;
    const head = card.querySelector<HTMLElement>(".truth-area-head");
    const actions = card.querySelector<HTMLElement>(".truth-area-head-actions");
    if (!areaId || !head || !actions) return;

    let toggle = actions.querySelector<HTMLButtonElement>(".truth-area-accordion-toggle");
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "truth-area-accordion-toggle";
      toggle.innerHTML = chevron;
      actions.prepend(toggle);
    }

    const collapsed = areaId in state ? state[areaId] : index !== 0;
    const setCollapsed = (nextCollapsed: boolean) => {
      card.classList.toggle("is-collapsed", nextCollapsed);
      toggle?.setAttribute("aria-expanded", String(!nextCollapsed));
      toggle?.setAttribute("aria-label", `${nextCollapsed ? "Expand" : "Collapse"} ${areaId} Project Truth area`);
      state[areaId] = nextCollapsed;
      writeState(state);
    };

    card.classList.toggle("is-collapsed", collapsed);
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", `${collapsed ? "Expand" : "Collapse"} ${areaId} Project Truth area`);

    if (toggle.dataset.bound !== "true") {
      toggle.dataset.bound = "true";
      toggle.addEventListener("click", (event) => {
        event.stopPropagation();
        setCollapsed(!card.classList.contains("is-collapsed"));
      });
    }

    if (head.dataset.accordionBound !== "true") {
      head.dataset.accordionBound = "true";
      head.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest("button, a, input, textarea, select, [role='button']")) return;
        setCollapsed(!card.classList.contains("is-collapsed"));
      });
    }
  });
};

const updatesContent = (): HTMLElement | null => {
  if (!document.querySelector(".nav-item.active[data-view='updates']")) return null;
  return document.querySelector<HTMLElement>(".content");
};

const enhanceUpdates = () => {
  const content = updatesContent();
  if (!content || content.dataset.updatesRedesigned === "true") return;

  const statusPanel = content.querySelector<HTMLElement>(".progress-panel");
  const oldSteps = content.querySelector<HTMLElement>(".steps");
  if (!statusPanel || !oldSteps) return;
  content.dataset.updatesRedesigned = "true";

  const statusCopy = statusPanel.querySelector<HTMLElement>(":scope > div");
  const actions = [...statusPanel.querySelectorAll<HTMLButtonElement>(".check-updates, .install-update")];

  const workspace = document.createElement("section");
  workspace.className = "updates-workspace";
  workspace.dataset.updateSurface = "true";

  const statusCard = document.createElement("section");
  statusCard.className = "updates-status-card";
  if (statusCopy) statusCard.append(statusCopy);
  actions.forEach((action) => statusCard.append(action));
  workspace.append(statusCard);

  const versionStrip = document.createElement("section");
  versionStrip.className = "updates-version-strip";
  versionStrip.setAttribute("aria-label", "Installed component versions");
  versionStrip.innerHTML = `
    <div class="updates-version-badge" data-update-version="desktop"><small>Desktop</small><strong>Loading…</strong></div>
    <div class="updates-version-badge" data-update-version="core"><small>Core</small><strong>Loading…</strong></div>
    <div class="updates-version-badge" data-update-version="runtime"><small>Runtime</small><strong>Loading…</strong></div>`;
  workspace.append(versionStrip);

  const flow = document.createElement("section");
  flow.className = "updates-flow";
  flow.setAttribute("aria-label", "Update lifecycle");
  flow.innerHTML = `
    <article class="update-phase active" data-update-phase="check"><div class="update-phase-head"><span class="update-phase-index">01</span><span class="update-phase-state">Ready</span></div><h3>Check availability</h3><p>Ask the fixed host-side updater boundary whether a newer trusted update exists.</p></article>
    <article class="update-phase" data-update-phase="download"><div class="update-phase-head"><span class="update-phase-index">02</span><span class="update-phase-state">Not exposed yet</span></div><h3>Download & verify</h3><p>Future progress belongs here only when the Desktop contract exposes real artifact download and verification state.</p></article>
    <article class="update-phase" data-update-phase="install"><div class="update-phase-head"><span class="update-phase-index">03</span><span class="update-phase-state">User authorized</span></div><h3>Install & restart</h3><p>Installation remains a separate explicit action. Availability alone never authorizes replacing installed code.</p></article>`;
  workspace.append(flow);

  const details = document.createElement("details");
  details.className = "updates-details";
  details.innerHTML = `
    <summary><span><strong>Update details</strong><small>Trust boundary, authority and release metadata</small></span><span class="updates-details-chevron">⌄</span></summary>
    <div class="updates-details-body">
      <article class="updates-boundary-card"><small>Update identity</small><strong>Fixed trusted boundary</strong><span>The renderer cannot supply arbitrary update URLs or executable paths.</span></article>
      <article class="updates-boundary-card"><small>Install authority</small><strong>Separate user action</strong><span>A successful check does not authorize installation, restart or replacement of installed code.</span></article>
      <article class="updates-boundary-card"><small>Release information</small><strong>Not exposed yet</strong><span>The current Desktop result does not carry structured release notes, so Livariant does not invent them.</span></article>
    </div>`;
  workspace.append(details);

  statusPanel.replaceWith(workspace);
  oldSteps.remove();
};

const apply = () => {
  applyAccordionState();
  enhanceUpdates();
};

// Structural polish is synchronous in the mutation microtask. It never waits for a paint frame
// and never discovers a surface by translated text.
new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true });
apply();
