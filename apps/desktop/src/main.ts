import "./styles.css";

type StepState = "open" | "skipped" | "answered";

type FirstStep = {
  id: string;
  title: string;
  prompt: string;
  state: StepState;
  value: string;
};

const steps: FirstStep[] = [
  {
    id: "purpose",
    title: "Project purpose",
    prompt: "What is this project for? Describe it in one to three sentences.",
    state: "open",
    value: "",
  },
  {
    id: "direction",
    title: "Current direction",
    prompt: "What is the current product direction or the next useful outcome?",
    state: "open",
    value: "",
  },
  {
    id: "rules",
    title: "Project rules",
    prompt: "Which project rules or constraints must Livariant never violate?",
    state: "open",
    value: "",
  },
];

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Livariant desktop root not found");
}

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

const render = () => {
  const completed = steps.filter((step) => step.state === "answered").length;
  const deferred = steps.filter((step) => step.state === "skipped").length;

  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark"><span></span><span></span></div>
          <div>
            <strong>Livariant</strong>
            <small>Desktop Foundation</small>
          </div>
        </div>

        <nav class="nav" aria-label="Primary navigation">
          <button class="nav-item">${icon("home")}<span>Overview</span></button>
          <button class="nav-item active">${icon("steps")}<span>First Steps</span><b>${completed}/${steps.length}</b></button>
          <button class="nav-item">${icon("updates")}<span>Updates</span></button>
          <button class="nav-item">${icon("settings")}<span>Settings</span></button>
          <button class="nav-item">${icon("diagnostics")}<span>Diagnostics</span></button>
        </nav>

        <div class="sidebar-footer">
          <div class="status-dot"></div>
          <div>
            <strong>Foundation preview</strong>
            <small>Live runtime wiring comes next</small>
          </div>
        </div>
      </aside>

      <main class="content">
        <header class="topbar">
          <div>
            <span class="eyebrow">Project setup</span>
            <h1>First Steps</h1>
            <p>Build Livariant's understanding at your pace. Nothing here becomes Authority just because it was entered.</p>
          </div>
          <button class="project-chip" type="button">
            <span class="project-icon">L</span>
            <span><small>Current project</small><strong>No project selected</strong></span>
            <span class="chevron">⌄</span>
          </button>
        </header>

        <section class="health-strip" aria-label="System readiness preview">
          <div class="health-card muted">
            <span class="health-icon">○</span>
            <div><small>Installation</small><strong>Not connected</strong></div>
          </div>
          <div class="health-card muted">
            <span class="health-icon">○</span>
            <div><small>Protected components</small><strong>Not connected</strong></div>
          </div>
          <div class="health-card muted">
            <span class="health-icon">○</span>
            <div><small>Guardian</small><strong>Not connected</strong></div>
          </div>
        </section>

        <section class="progress-panel">
          <div>
            <span class="eyebrow">Your setup, not a gate</span>
            <h2>${completed} of ${steps.length} answered</h2>
            <p>${deferred > 0 ? `${deferred} deferred. ` : ""}You can skip anything that is not needed yet and return later.</p>
          </div>
          <div class="progress-ring" style="--progress:${Math.round((completed / steps.length) * 100)}%">
            <span>${Math.round((completed / steps.length) * 100)}%</span>
          </div>
        </section>

        <section class="steps" aria-label="First Steps questions">
          ${steps.map(renderStep).join("")}
        </section>

        <footer class="truth-note">
          <span class="truth-icon">i</span>
          <p><strong>Truth boundary:</strong> answers in this preview are UI state only. Future persistence must preserve Livariant's Evidence → Review → Project Truth rules and must never grant mutation, runtime, lifecycle or release Authority.</p>
        </footer>
      </main>
    </div>
  `;

  bindEvents();
};

const renderStep = (step: FirstStep) => {
  const stateLabel = step.state === "answered" ? "Answered" : step.state === "skipped" ? "Deferred" : "Open";
  const stateClass = `state-${step.state}`;

  return `
    <article class="step-card ${stateClass}" data-step="${step.id}">
      <div class="step-head">
        <div class="step-number">${String(steps.indexOf(step) + 1).padStart(2, "0")}</div>
        <div class="step-copy">
          <div class="step-title-row"><h3>${step.title}</h3><span class="state-pill">${stateLabel}</span></div>
          <p>${step.prompt}</p>
        </div>
      </div>
      <div class="step-editor ${step.state === "answered" ? "visible" : ""}">
        <textarea aria-label="${step.title}" placeholder="Write your answer here…">${escapeHtml(step.value)}</textarea>
        <div class="step-actions editor-actions">
          <button class="button secondary cancel-answer" type="button">Cancel</button>
          <button class="button primary save-answer" type="button">Save answer</button>
        </div>
      </div>
      <div class="step-summary ${step.state === "answered" ? "visible" : ""}">
        <p>${step.value ? escapeHtml(step.value) : "No answer entered yet."}</p>
      </div>
      <div class="step-actions default-actions ${step.state === "answered" ? "answered-actions" : ""}">
        ${step.state === "answered"
          ? '<button class="text-button edit-answer" type="button">Edit answer</button>'
          : `<button class="text-button skip-step" type="button">${step.state === "skipped" ? "Keep deferred" : "Skip for now"}</button><button class="button primary answer-step" type="button">Answer</button>`}
      </div>
    </article>
  `;
};

const bindEvents = () => {
  document.querySelectorAll<HTMLElement>("[data-step]").forEach((card) => {
    const id = card.dataset.step;
    const step = steps.find((candidate) => candidate.id === id);
    if (!step) return;

    const editor = card.querySelector<HTMLElement>(".step-editor");
    const summary = card.querySelector<HTMLElement>(".step-summary");
    const textarea = card.querySelector<HTMLTextAreaElement>("textarea");

    card.querySelector(".answer-step")?.addEventListener("click", () => {
      editor?.classList.add("visible");
      textarea?.focus();
    });

    card.querySelector(".edit-answer")?.addEventListener("click", () => {
      summary?.classList.remove("visible");
      editor?.classList.add("visible");
      textarea?.focus();
    });

    card.querySelector(".cancel-answer")?.addEventListener("click", () => render());

    card.querySelector(".skip-step")?.addEventListener("click", () => {
      step.state = "skipped";
      render();
    });

    card.querySelector(".save-answer")?.addEventListener("click", () => {
      const value = textarea?.value.trim() ?? "";
      if (!value) return;
      step.value = value;
      step.state = "answered";
      render();
    });
  });
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);

render();
