import "./diagnostics-redesign.css";

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
    <div class="diagnostics-range-copy">
      <small>Time range</small>
      <strong>Current locally available evidence</strong>
    </div>
    <div class="diagnostics-range-options" role="group" aria-label="Diagnostics time range">
      <button class="diagnostics-range-option active" type="button">Current</button>
      <button class="diagnostics-range-option" type="button" disabled title="Historical persistence is not available in this renderer slice">24h</button>
      <button class="diagnostics-range-option" type="button" disabled title="Historical persistence is not available in this renderer slice">7d</button>
      <button class="diagnostics-range-option" type="button" disabled title="Historical persistence is not available in this renderer slice">30d</button>
      <button class="diagnostics-range-option" type="button" disabled title="Historical persistence is not available in this renderer slice">All</button>
    </div>`;
  topbar.insertAdjacentElement("afterend", rangeBar);

  const classHead = document.createElement("div");
  classHead.className = "diagnostics-section-head";
  classHead.innerHTML = `
    <div>
      <span class="eyebrow">Evidence classes</span>
      <h2>What kind of number are you looking at?</h2>
      <p>Livariant keeps measured facts, justified counterfactuals and modeled estimates separate so confidence is visible before interpretation.</p>
    </div>`;
  rangeBar.insertAdjacentElement("afterend", classHead);

  const hasObservedData = [...healthStrip.querySelectorAll("strong")].some((value) => (value.textContent ?? "").trim() !== "—");
  const classGrid = document.createElement("section");
  classGrid.className = "diagnostics-class-grid";
  classGrid.innerHTML = `
    <article class="diagnostics-class-card observed">
      <div class="diagnostics-class-top"><span class="diagnostics-class-label"><i></i>Observed</span><span class="diagnostics-class-state">${hasObservedData ? "Measured" : "Unknown"}</span></div>
      <h3>Direct runtime evidence</h3>
      <p>Values reported by the provider/runtime and recorded by Livariant. No counterfactual claim is required.</p>
      <div class="diagnostics-class-foot">The token counters below belong to this class.</div>
    </article>
    <article class="diagnostics-class-card avoided">
      <div class="diagnostics-class-top"><span class="diagnostics-class-label"><i></i>Avoided</span><span class="diagnostics-class-state">Not surfaced</span></div>
      <h3>Prevented work with concrete evidence</h3>
      <p>Only work or usage Livariant can justify as prevented by a specific intervention belongs here.</p>
      <div class="diagnostics-class-foot">The current Desktop view does not yet expose the host's Avoided counters.</div>
    </article>
    <article class="diagnostics-class-card estimated">
      <div class="diagnostics-class-top"><span class="diagnostics-class-label"><i></i>Estimated</span><span class="diagnostics-class-state">Not surfaced</span></div>
      <h3>Modeled or calibrated values</h3>
      <p>Any number derived from a model rather than direct observation must remain explicitly marked as an estimate.</p>
      <div class="diagnostics-class-foot">The current Desktop view does not yet expose the host's Estimated counters.</div>
    </article>`;
  classHead.insertAdjacentElement("afterend", classGrid);

  const observedHead = document.createElement("div");
  observedHead.className = "diagnostics-section-head";
  observedHead.innerHTML = `
    <div>
      <span class="eyebrow">Observed evidence</span>
      <h2>Measured usage</h2>
      <p>Raw values only. Unknown fields remain unknown rather than being converted into synthetic zeroes.</p>
    </div>`;
  healthStrip.insertAdjacentElement("beforebegin", observedHead);

  const contextHead = document.createElement("div");
  contextHead.className = "diagnostics-section-head";
  contextHead.innerHTML = `
    <div>
      <span class="eyebrow">Evidence context</span>
      <h2>Where these measurements come from</h2>
      <p>Provider and model attribution should only appear when the diagnostics contract actually supplies that evidence.</p>
    </div>`;
  observedPanel.insertAdjacentElement("afterend", contextHead);

  const contextGrid = document.createElement("section");
  contextGrid.className = "diagnostics-context-grid";
  contextGrid.innerHTML = `
    <article class="diagnostics-context-card"><small>Provider</small><strong>Codex</strong><span>This Diagnostics surface currently reads the qualified Codex App Server measurement contract.</span></article>
    <article class="diagnostics-context-card"><small>Model</small><strong>Not exposed</strong><span>The current diagnostics summary does not carry a model identifier, so Livariant does not guess one.</span></article>`;
  contextHead.insertAdjacentElement("afterend", contextGrid);

  const definitionHead = document.createElement("div");
  definitionHead.className = "diagnostics-section-head";
  definitionHead.innerHTML = `
    <div>
      <span class="eyebrow">Definitions</span>
      <h2>How to read the token counters</h2>
      <p>Short definitions keep raw telemetry useful without pretending every provider exposes identical fields.</p>
    </div>`;
  contextGrid.insertAdjacentElement("afterend", definitionHead);

  const definitions = document.createElement("section");
  definitions.className = "diagnostics-definitions";
  definitions.innerHTML = `
    <div class="diagnostics-definition"><strong>Total tokens</strong><span>The total token value reported through the current runtime evidence contract.</span></div>
    <div class="diagnostics-definition"><strong>Input</strong><span>Tokens attributed to provider input where the runtime reports that field.</span></div>
    <div class="diagnostics-definition"><strong>Output</strong><span>Tokens attributed to provider output where the runtime reports that field.</span></div>
    <div class="diagnostics-definition"><strong>Cached input</strong><span>Input tokens reported as cache reads. This is not automatically equivalent to money or time saved.</span></div>
    <div class="diagnostics-definition"><strong>Reasoning</strong><span>Reasoning-token evidence where the provider/runtime reports it. Unknown remains unknown.</span></div>`;
  definitionHead.insertAdjacentElement("afterend", definitions);

  const testHead = document.createElement("div");
  testHead.className = "diagnostics-section-head";
  testHead.innerHTML = `
    <div>
      <span class="eyebrow">Measurement test</span>
      <h2>Create a fresh observation</h2>
      <p>The existing fixed Core test remains unchanged; this redesign only makes its purpose and evidence boundary easier to understand.</p>
    </div>`;
  actionCard.insertAdjacentElement("beforebegin", testHead);

  if (boundaryNote) {
    boundaryNote.querySelector("p")!.innerHTML = `<strong>Privacy & interpretation boundary:</strong> Diagnostics does not capture raw prompt/project content by default. Observed ≠ Avoided ≠ Estimated, and no single combined “saved” number is claimed.`;
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
