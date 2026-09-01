import "./diagnostics-redesign.css";
import { invoke } from "@tauri-apps/api/core";

type DiagnosticsEvidenceSummary = {
  avoided: { eventCount: number; contextTokens: number };
  estimated: { eventCount: number; tokens: number };
};

const formatNumber = (value: number) => new Intl.NumberFormat().format(value);

const hydrateCounterEvidence = async (classGrid: HTMLElement) => {
  const avoidedCard = classGrid.querySelector<HTMLElement>(".diagnostics-class-card.avoided");
  const estimatedCard = classGrid.querySelector<HTMLElement>(".diagnostics-class-card.estimated");
  if (!avoidedCard || !estimatedCard) return;

  try {
    const summary = await invoke<DiagnosticsEvidenceSummary>("codex_diagnostics_summary");

    const avoidedState = avoidedCard.querySelector<HTMLElement>(".diagnostics-class-state");
    const avoidedCopy = avoidedCard.querySelector<HTMLElement>("p");
    if (avoidedState) avoidedState.textContent = `${formatNumber(summary.avoided.eventCount)} events`;
    if (avoidedCopy) {
      avoidedCopy.textContent = `${formatNumber(summary.avoided.contextTokens)} context tokens recorded as avoided by qualified host evidence.`;
    }

    const estimatedState = estimatedCard.querySelector<HTMLElement>(".diagnostics-class-state");
    const estimatedCopy = estimatedCard.querySelector<HTMLElement>("p");
    if (estimatedState) estimatedState.textContent = `${formatNumber(summary.estimated.eventCount)} events`;
    if (estimatedCopy) {
      estimatedCopy.textContent = `${formatNumber(summary.estimated.tokens)} modeled tokens recorded as Estimated, never Observed.`;
    }
  } catch {
    const avoidedState = avoidedCard.querySelector<HTMLElement>(".diagnostics-class-state");
    const estimatedState = estimatedCard.querySelector<HTMLElement>(".diagnostics-class-state");
    if (avoidedState) avoidedState.textContent = "Unknown";
    if (estimatedState) estimatedState.textContent = "Unknown";
  }
};

const enhanceDiagnostics = () => {
  const headings = [...document.querySelectorAll<HTMLElement>(".topbar h1")];
  const diagnosticsHeading = headings.find((heading) => heading.textContent?.trim() === "Diagnostics");
  if (!diagnosticsHeading) return;

  const content = diagnosticsHeading.closest<HTMLElement>(".content");
  if (!content || content.dataset.diagnosticsRedesigned === "true") return;
  content.dataset.diagnosticsRedesigned = "true";

  const topbar = diagnosticsHeading.closest<HTMLElement>(".topbar");
  const healthStrip = content.querySelector<HTMLElement>(".health-strip");
  const observedPanel = content.querySelector<HTMLElement>(".progress-panel");
  const actionCard = content.querySelector<HTMLElement>(".diagnostics-action-card");
  const boundaryNote = content.querySelector<HTMLElement>(".truth-note");
  if (!topbar || !healthStrip || !observedPanel || !actionCard) return;

  const rangeBar = document.createElement("section");
  rangeBar.className = "diagnostics-range-bar";
  rangeBar.innerHTML = `
    <div class="diagnostics-range-copy"><small>Time range</small><strong>Current locally available evidence</strong></div>
    <div class="diagnostics-range-options" role="group" aria-label="Diagnostics time range">
      <button class="diagnostics-range-option active" type="button">Current</button>
      <button class="diagnostics-range-option" type="button" disabled title="Historical persistence is not available yet">24h</button>
      <button class="diagnostics-range-option" type="button" disabled title="Historical persistence is not available yet">7d</button>
      <button class="diagnostics-range-option" type="button" disabled title="Historical persistence is not available yet">30d</button>
      <button class="diagnostics-range-option" type="button" disabled title="Historical persistence is not available yet">All</button>
    </div>`;
  topbar.insertAdjacentElement("afterend", rangeBar);

  const hasObservedData = [...healthStrip.querySelectorAll("strong")].some((value) => (value.textContent ?? "").trim() !== "—");

  const classGrid = document.createElement("section");
  classGrid.className = "diagnostics-class-grid diagnostics-class-grid-compact";
  classGrid.innerHTML = `
    <article class="diagnostics-class-card observed">
      <div class="diagnostics-class-top"><span class="diagnostics-class-label"><i></i>Observed</span><span class="diagnostics-class-state">${hasObservedData ? "Measured" : "Unknown"}</span></div>
      <h3>Measured facts</h3><p>Direct provider/runtime evidence.</p>
    </article>
    <article class="diagnostics-class-card avoided">
      <div class="diagnostics-class-top"><span class="diagnostics-class-label"><i></i>Avoided</span><span class="diagnostics-class-state">Loading…</span></div>
      <h3>Prevented work</h3><p>Loading qualified Avoided evidence…</p>
    </article>
    <article class="diagnostics-class-card estimated">
      <div class="diagnostics-class-top"><span class="diagnostics-class-label"><i></i>Estimated</span><span class="diagnostics-class-state">Loading…</span></div>
      <h3>Modeled values</h3><p>Loading explicitly modeled evidence…</p>
    </article>`;
  rangeBar.insertAdjacentElement("afterend", classGrid);
  void hydrateCounterEvidence(classGrid);

  const observedHead = document.createElement("div");
  observedHead.className = "diagnostics-section-head diagnostics-section-head-compact";
  observedHead.innerHTML = `<div><span class="eyebrow">Observed evidence</span><h2>Measured usage</h2><p>Only raw values reported through the current runtime contract.</p></div>`;
  healthStrip.insertAdjacentElement("beforebegin", observedHead);

  observedPanel.classList.add("diagnostics-observed-status");
  actionCard.classList.add("diagnostics-measure-compact");

  const details = document.createElement("details");
  details.className = "diagnostics-details";
  details.innerHTML = `
    <summary><span><strong>Measurement details</strong><small>Provider, model availability and counter definitions</small></span><span class="diagnostics-details-chevron">⌄</span></summary>
    <div class="diagnostics-details-body">
      <div class="diagnostics-context-grid">
        <article class="diagnostics-context-card"><small>Provider</small><strong>Codex</strong><span>This surface currently reads the qualified Codex App Server measurement contract.</span></article>
        <article class="diagnostics-context-card"><small>Model</small><strong>Not exposed</strong><span>The current summary carries no model identifier, so Livariant does not guess one.</span></article>
      </div>
      <div class="diagnostics-definitions">
        <div class="diagnostics-definition"><strong>Total tokens</strong><span>Total token value reported by the runtime.</span></div>
        <div class="diagnostics-definition"><strong>Input</strong><span>Provider input tokens where that field is reported.</span></div>
        <div class="diagnostics-definition"><strong>Output</strong><span>Provider output tokens where that field is reported.</span></div>
        <div class="diagnostics-definition"><strong>Cached input</strong><span>Cache-read input tokens; not automatically equivalent to money or time saved.</span></div>
        <div class="diagnostics-definition"><strong>Reasoning</strong><span>Reasoning-token evidence where available. Unknown remains unknown.</span></div>
        <div class="diagnostics-definition"><strong>Avoided context</strong><span>Context tokens recorded by qualified host evidence as avoided by a concrete Livariant intervention. This is not automatically money or time saved.</span></div>
        <div class="diagnostics-definition"><strong>Estimated tokens</strong><span>Modeled token values. They remain Estimated and are never merged into Observed totals.</span></div>
      </div>
    </div>`;
  actionCard.insertAdjacentElement("afterend", details);

  if (boundaryNote) {
    boundaryNote.querySelector("p")!.innerHTML = `<strong>Privacy & interpretation:</strong> No raw prompt/project capture by default. Observed ≠ Avoided ≠ Estimated.`;
  }
};

let queued = false;
const scheduleDiagnosticsEnhancement = () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    enhanceDiagnostics();
  });
};

const observer = new MutationObserver(scheduleDiagnosticsEnhancement);
observer.observe(document.documentElement, { childList: true, subtree: true });
scheduleDiagnosticsEnhancement();
