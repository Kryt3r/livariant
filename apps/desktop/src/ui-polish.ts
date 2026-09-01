import "./brand-depth-v2.css";
import "./diagnostics-polish.js";

const STORAGE_KEY = "livariant.project-truth.accordions.v1";

type AccordionState = Record<string, boolean>;

const readState = (): AccordionState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as AccordionState : {};
  } catch {
    return {};
  }
};

const writeState = (state: AccordionState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // UI preference persistence must never block the renderer.
  }
};

const state = readState();

const chevron = `
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="m7 10 5 5 5-5" />
  </svg>`;

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
    card.classList.toggle("is-collapsed", collapsed);
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", `${collapsed ? "Expand" : "Collapse"} ${areaId} Project Truth area`);

    const setCollapsed = (nextCollapsed: boolean) => {
      card.classList.toggle("is-collapsed", nextCollapsed);
      toggle?.setAttribute("aria-expanded", String(!nextCollapsed));
      toggle?.setAttribute("aria-label", `${nextCollapsed ? "Expand" : "Collapse"} ${areaId} Project Truth area`);
      state[areaId] = nextCollapsed;
      writeState(state);
    };

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

const enhanceUpdates = () => {
  const headings = [...document.querySelectorAll<HTMLElement>(".topbar h1")];
  const updatesHeading = headings.find((heading) => heading.textContent?.trim() === "Updates");
  if (!updatesHeading) return;

  const content = updatesHeading.closest<HTMLElement>(".content");
  if (!content || content.dataset.updatesRedesigned === "true") return;

  const statusPanel = content.querySelector<HTMLElement>(".progress-panel");
  const oldSteps = content.querySelector<HTMLElement>(".steps");
  if (!statusPanel || !oldSteps) return;

  content.dataset.updatesRedesigned = "true";

  const statusCopy = statusPanel.querySelector<HTMLElement>(":scope > div");
  const action = statusPanel.querySelector<HTMLButtonElement>(".check-updates");
  const eyebrowText = statusCopy?.querySelector<HTMLElement>(".eyebrow")?.textContent?.trim().toLowerCase() ?? "";
  const isChecking = eyebrowText.includes("checking");
  const checkCompleted = eyebrowText.includes("up to date") || eyebrowText.includes("update available");

  const workspace = document.createElement("section");
  workspace.className = "updates-workspace";

  const statusCard = document.createElement("section");
  statusCard.className = "updates-status-card";
  if (statusCopy) statusCard.append(statusCopy);
  if (action) statusCard.append(action);
  workspace.append(statusCard);

  const flow = document.createElement("section");
  flow.className = "updates-flow";
  flow.setAttribute("aria-label", "Update lifecycle");
  flow.innerHTML = `
    <article class="update-phase active">
      <div class="update-phase-head"><span class="update-phase-index">01</span><span class="update-phase-state">${isChecking ? "Checking" : checkCompleted ? "Checked" : "Ready"}</span></div>
      <h3>Check availability</h3>
      <p>Ask the fixed host-side updater boundary whether a newer trusted update exists.</p>
    </article>
    <article class="update-phase">
      <div class="update-phase-head"><span class="update-phase-index">02</span><span class="update-phase-state">Not exposed yet</span></div>
      <h3>Download & verify</h3>
      <p>Future progress belongs here only when the Desktop contract exposes real artifact download and verification state.</p>
    </article>
    <article class="update-phase">
      <div class="update-phase-head"><span class="update-phase-index">03</span><span class="update-phase-state">User authorized</span></div>
      <h3>Install & restart</h3>
      <p>Installation remains a separate explicit action. Availability alone never authorizes replacing installed code.</p>
    </article>`;
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

let scheduled = false;
const scheduleApply = () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    applyAccordionState();
    enhanceUpdates();
  });
};

const observer = new MutationObserver(scheduleApply);
observer.observe(document.documentElement, { childList: true, subtree: true });

scheduleApply();
