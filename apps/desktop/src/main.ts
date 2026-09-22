import "./glass.css";
import "./styles.css";
import "./project-truth.css";
import "./project-truth-workspace.css";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getLanguage, onLanguageChange } from "./i18n/runtime.js";
import {
  bindConnectionDiagnosticsEvents,
  refreshConnectionsSettings,
  renderConnectionsSettingsView,
  renderConnectionsView,
} from "./connections-diagnostics.js";
import {
  bindAboutSupportSettingsEvents,
  refreshAboutSupportSettings,
  renderAboutSupportSettingsView,
} from "./about-support-settings.js";
import {
  bindProjectSettingsEvents,
  refreshProjectSettings,
  renderProjectSettingsView,
} from "./project-settings.js";
import {
  acceptProjectKnowledgeIntegrity,
  applyProjectKnowledgeProposal,
  launchProjectKnowledgeProtectionSetup,
  loadProjectKnowledge,
  loadProjectKnowledgeProtectionStatus,
  prepareProjectKnowledgeProposal,
  type ProjectKnowledgePreparedProposal,
  type ProjectKnowledgeProtectionStatus,
  type ProjectKnowledgeSnapshot,
} from "./project-knowledge-bridge.js";
import { onDesktopProjectActivated } from "./desktop-project-registry.js";

const livariantLogo = new URL("./assets/livariant-logo.png", import.meta.url).href;
const appWindow = getCurrentWindow();
const uiText = (en: string, de: string) => getLanguage() === "de" ? de : en;

type View = "steps" | "updates" | "connections" | "diagnostics";
type SettingsSection = "general" | "projects" | "connections" | "updates" | "system" | "about";
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
  activeDecisionId: string | null;
  preparedProposal: ProjectKnowledgePreparedProposal["proposal"] | null;
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
    activeDecisionId: null,
    preparedProposal: null,
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
    activeDecisionId: null,
    preparedProposal: null,
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
    activeDecisionId: null,
    preparedProposal: null,
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
let projectKnowledgeLoading = false;
let projectKnowledgeApplying = false;
let projectKnowledgeProtection: ProjectKnowledgeProtectionStatus | null = null;
let projectKnowledgeError: string | null = null;
let updateState: UpdateState = "idle";
let updateResult: UpdateCheckResult | null = null;
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Livariant desktop root not found");

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
})[character] ?? character);

const normalizeTruth = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
const renderTruthText = (value: string) => value.split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`).join("");

const applyProjectKnowledgeSnapshot = (snapshot: ProjectKnowledgeSnapshot) => {
  for (const area of areas) {
    const canonical = snapshot.areas.find((candidate) => candidate.id === area.id);
    if (!canonical) continue;
    area.confirmedValue = canonical.confirmedValue;
    area.activeDecisionId = canonical.activeDecisionId;
    area.history = canonical.history.map((entry) => ({ value: entry.value, reason: "accepted" as const }));
    area.pendingValue = "";
    area.preparedProposal = null;
    area.state = canonical.state;
  }
};

const clearProjectKnowledgeSnapshot = () => {
  for (const area of areas) {
    area.confirmedValue = "";
    area.activeDecisionId = null;
    area.history = [];
    area.pendingValue = "";
    area.preparedProposal = null;
    area.state = "open";
  }
};

const refreshProjectKnowledge = async (renderAfter = true) => {
  projectKnowledgeLoading = true;
  projectKnowledgeError = null;
  if (renderAfter && currentView === "steps") render();
  try {
    const protection = await loadProjectKnowledgeProtectionStatus();
    projectKnowledgeProtection = protection;
    if (!protection.canonicalReadReady) {
      clearProjectKnowledgeSnapshot();
      return;
    }
    const snapshot = await loadProjectKnowledge();
    applyProjectKnowledgeSnapshot(snapshot);
  } catch (error) {
    clearProjectKnowledgeSnapshot();
    projectKnowledgeError = error instanceof Error ? error.message : String(error);
  } finally {
    projectKnowledgeLoading = false;
    if (renderAfter && currentView === "steps") render();
  }
};


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
  if (!existing) return {
    impact: "new",
    label: uiText("New", "Neu"),
    explanation: uiText("Adds new durable knowledge to this Project Brain area.", "Fügt diesem Project-Brain-Bereich neues dauerhaftes Wissen hinzu."),
    conflict: false,
  };
  if (existing === proposed) return {
    impact: "unchanged",
    label: uiText("No material change", "Keine wesentliche Änderung"),
    explanation: uiText("The proposed statement matches the currently confirmed Project Brain knowledge.", "Die vorgeschlagene Aussage entspricht dem aktuell bestätigten Project-Brain-Wissen."),
    conflict: false,
  };
  if (proposed.includes(existing) && proposed.length > existing.length) {
    return {
      impact: "extends",
      label: uiText("Extends", "Erweitert"),
      explanation: uiText(
        "The proposal contains the existing statement and adds more context. Until semantic Project Brain analysis is connected, Livariant treats any material change to confirmed knowledge as potentially conflicting and requires review.",
        "Der Vorschlag enthält die bestehende Aussage und ergänzt Kontext. Solange die semantische Project-Brain-Analyse noch nicht verbunden ist, behandelt Livariant jede wesentliche Änderung an bestätigtem Wissen als potenziellen Konflikt und verlangt eine Prüfung.",
      ),
      conflict: true,
    };
  }
  if (existing.includes(proposed) && existing.length > proposed.length) {
    return {
      impact: "refines",
      label: uiText("Refines", "Präzisiert"),
      explanation: uiText(
        "The proposal narrows the existing statement. Until semantic Project Brain analysis is connected, this remains a potential conflict that requires review.",
        "Der Vorschlag präzisiert die bestehende Aussage. Solange die semantische Project-Brain-Analyse noch nicht verbunden ist, bleibt dies ein potenzieller Konflikt, der geprüft werden muss.",
      ),
      conflict: true,
    };
  }
  return {
    impact: "replaces",
    label: uiText("Replaces", "Ersetzt"),
    explanation: uiText(
      "The proposal is materially different from the currently confirmed statement and may replace it.",
      "Der Vorschlag unterscheidet sich wesentlich von der aktuell bestätigten Aussage und könnte sie ersetzen.",
    ),
    conflict: true,
  };
};

const areaDisplay = (area: TruthArea) => ({
  purpose: {
    kind: uiText("Purpose", "Zweck"),
    title: uiText("Project purpose", "Projektzweck"),
    description: uiText("Why this project exists and which outcome it is meant to create.", "Warum dieses Projekt existiert und welches Ergebnis es erreichen soll."),
    question: uiText("What is this project for? Describe the outcome or problem it exists to address.", "Wofür ist dieses Projekt da? Beschreibe das gewünschte Ergebnis oder Problem, das es lösen soll."),
  },
  direction: {
    kind: uiText("Direction", "Richtung"),
    title: uiText("Current direction", "Aktuelle Richtung"),
    description: uiText("The active product direction and the next meaningful outcome.", "Die aktuelle Produktrichtung und das nächste sinnvolle Ergebnis."),
    question: uiText("What is the current product direction or the next useful outcome?", "Was ist die aktuelle Produktrichtung oder das nächste sinnvolle Ergebnis?"),
  },
  rules: {
    kind: uiText("Rules", "Regeln"),
    title: uiText("Rules & constraints", "Regeln & Grenzen"),
    description: uiText("Protected properties, boundaries and constraints that current work must preserve.", "Geschützte Eigenschaften, Grenzen und Vorgaben, die aktuelle Arbeit bewahren muss."),
    question: uiText("Which project rules or constraints must Livariant never violate?", "Welche Projektregeln oder Grenzen darf Livariant niemals verletzen?"),
  },
}[area.id] ?? {
  kind: area.kind,
  title: area.title,
  description: area.description,
  question: area.question,
});

const areaState = (area: TruthArea) => {
  if (area.state === "confirmed") return { label: uiText("Confirmed", "Bestätigt"), css: "confirmed" };
  if (area.state === "review") {
    const proposal = classifyTruthProposal(area);
    return { label: proposal.conflict ? uiText("Conflict to review", "Konflikt prüfen") : uiText("Needs review", "Prüfung nötig"), css: proposal.conflict ? "conflict" : "review" };
  }
  if (area.state === "deferred") return { label: uiText("Deferred", "Zurückgestellt"), css: "open" };
  return { label: uiText("Knowledge gap", "Wissenslücke"), css: "open" };
};

const areaTypeCode = (kind: string) => kind === "Purpose" ? "P" : kind === "Direction" ? "D" : "R";

const sourceMarkdown = (area: TruthArea) => {
  const value = area.confirmedValue.trim() || "_No canonical Project Brain content is loaded for this area in the renderer preview._";
  return `# ${area.title}\n\n${value}\n`;
};

const renderAreaCard = (area: TruthArea) => {
  const state = areaState(area);
  const display = areaDisplay(area);
  const proposal = area.state === "review" ? classifyTruthProposal(area) : null;
  const searchText = `${area.kind} ${area.title} ${area.description} ${area.question} ${area.pendingValue} ${area.confirmedValue} ${display.kind} ${display.title} ${display.description}`.toLowerCase();
  const composerValue = area.pendingValue;
  const prompt = area.state === "open" || area.state === "deferred"
    ? display.question
    : uiText("Tell Livariant what changed, what is missing or what should be reconsidered in this area.", "Sag Livariant, was sich geändert hat, fehlt oder in diesem Bereich neu bewertet werden sollte.");
  return `
    <article class="truth-area-card truth-area-card-redesign" data-truth-item data-state="${area.state}" data-conflict="${proposal?.conflict === true ? "true" : "false"}" data-search="${escapeHtml(searchText)}" data-area="${area.id}">
      <div class="truth-area-head">
        <div class="truth-area-identity"><span class="truth-item-type" title="${escapeHtml(display.kind)}">${areaTypeCode(area.kind)}</span><div><span class="eyebrow">${escapeHtml(display.kind)}</span><h3>${escapeHtml(display.title)}</h3><p>${escapeHtml(display.description)}</p></div></div>
        <div class="truth-area-head-actions"><span class="truth-state truth-state-${state.css}">${state.label}</span><button class="text-button view-truth-source" type="button">${uiText("View source", "Quelle ansehen")}</button></div>
      </div>

      <div class="truth-area-body-grid">
        <section class="truth-area-current ${area.confirmedValue ? "has-value" : "empty"}">
          <div class="truth-area-current-head"><div><small>${uiText("Canonical Project Brain", "Kanonischer Project Brain")}</small><strong>${area.confirmedValue ? uiText("Current knowledge", "Aktuelles Wissen") : uiText("No canonical knowledge loaded", "Noch kein kanonisches Wissen geladen")}</strong></div><span class="truth-source-origin">Project Brain</span></div>
          ${area.confirmedValue
            ? `<div class="truth-formatted-value">${renderTruthText(area.confirmedValue)}</div>`
            : `<p class="truth-area-empty-copy">${uiText("No canonical content is available for this area yet. Livariant keeps that absence explicit instead of inventing project truth.", "Für diesen Bereich ist noch kein kanonischer Inhalt verfügbar. Livariant hält diese Lücke ausdrücklich fest, statt Projektwissen zu erfinden.")}</p>`}
        </section>

        <section class="truth-conversation truth-conversation-redesign">
          <div class="truth-conversation-prompt"><span class="truth-source-badge livariant">L</span><div><small>Livariant</small><p>${escapeHtml(prompt)}</p></div></div>
          <div class="truth-composer">
            <textarea class="truth-composer-input" aria-label="${uiText("Tell Livariant about", "Livariant informieren über")} ${escapeHtml(display.title)}" placeholder="${uiText("Tell Livariant what changed…", "Sag Livariant, was sich geändert hat…")}">${escapeHtml(composerValue)}</textarea>
            <div class="truth-composer-footer"><span>${uiText("Input remains evidence until review.", "Eingaben bleiben bis zur Prüfung Evidence.")}</span><button class="button primary analyze-truth-input" type="button">${uiText("Analyze", "Analysieren")}</button></div>
          </div>
        </section>
      </div>

      ${area.state === "review" && area.pendingValue ? `<div class="truth-area-review-callout ${proposal?.conflict ? "conflict" : ""}"><div><small>${proposal?.conflict ? uiText("Potential conflict", "Möglicher Konflikt") : uiText("Proposal waiting", "Vorschlag wartet")}</small><strong>${escapeHtml(proposal?.label ?? uiText("Needs review", "Prüfung nötig"))}</strong><p>${escapeHtml(area.pendingValue)}</p></div><button class="button primary review-truth" type="button">${uiText("Review proposal", "Vorschlag prüfen")}</button></div>` : ""}
    </article>`;
};

const renderTruthReviewModal = () => {
  const area = areas.find((candidate) => candidate.id === selectedReviewAreaId);
  if (!area || area.state !== "review") return "";
  const proposal = classifyTruthProposal(area);
  const existing = area.confirmedValue;
  const proposed = area.pendingValue;
  const diff = existing
    ? `<div class="truth-review-diff-line removed"><span>−</span><div><small>${uiText("Current Project Brain", "Aktueller Project Brain")}</small><p>${escapeHtml(existing)}</p></div></div><div class="truth-review-diff-line added"><span>+</span><div><small>${uiText("Proposed Project Brain", "Vorgeschlagener Project Brain")}</small><p>${escapeHtml(proposed)}</p></div></div>`
    : `<div class="truth-review-diff-line added"><span>+</span><div><small>${uiText("Proposed addition", "Vorgeschlagene Ergänzung")}</small><p>${escapeHtml(proposed)}</p></div></div>`;
  return `
    <div class="truth-review-backdrop" data-close-truth-review>
      <section class="truth-review-modal ${proposal.conflict ? "truth-review-modal-conflict" : ""}" role="dialog" aria-modal="true" aria-labelledby="truth-review-title" data-truth-review-modal>
        <button class="truth-review-close" type="button" data-close-truth-review aria-label="${uiText("Close Project Brain review", "Project-Brain-Prüfung schließen")}">×</button>
        <header class="truth-review-header">
          <div><span class="eyebrow">${uiText("Manual review required", "Manuelle Prüfung erforderlich")}</span><h2 id="truth-review-title">${uiText("Review Project Brain change", "Project-Brain-Änderung prüfen")}</h2><p>${uiText("Livariant may analyze and propose. Canonical project knowledge changes only after your decision.", "Livariant darf analysieren und vorschlagen. Kanonisches Projektwissen ändert sich erst nach deiner Entscheidung.")}</p></div>
          <span class="truth-impact truth-impact-${proposal.impact}">${escapeHtml(proposal.label)}</span>
        </header>

        ${proposal.conflict ? `<section class="truth-review-alert"><span class="truth-review-alert-icon">!</span><div><small>${uiText("Potential conflict", "Möglicher Konflikt")}</small><h3>${uiText("Confirmed Project Brain knowledge would change.", "Bestätigtes Project-Brain-Wissen würde verändert.")}</h3><p>${uiText("The renderer cannot prove semantic compatibility yet, so Livariant keeps the current truth untouched until you explicitly resolve the proposal.", "Der Renderer kann semantische Kompatibilität noch nicht beweisen. Deshalb bleibt das aktuelle Wissen unverändert, bis du den Vorschlag ausdrücklich entscheidest.")}</p></div></section>` : ""}

        <section class="truth-review-summary">
          <div><small>${uiText("Area", "Bereich")}</small><strong>${escapeHtml(areaDisplay(area).kind)} · ${escapeHtml(areaDisplay(area).title)}</strong></div>
          <div><small>${uiText("Conflict state", "Konfliktstatus")}</small><strong>${proposal.conflict ? uiText("Review required", "Prüfung erforderlich") : uiText("None detected", "Keiner erkannt")}</strong></div>
          <div><small>${uiText("Proposed effect", "Vorgeschlagene Wirkung")}</small><strong>${escapeHtml(proposal.label)}</strong></div>
        </section>

        <section class="truth-review-analysis truth-source-livariant">
          <div class="truth-source-heading"><span class="truth-source-badge livariant">L</span><div><small>${uiText("Livariant analysis", "Livariant-Analyse")}</small><h3>${escapeHtml(proposal.explanation)}</h3></div></div>
          <p>${uiText("This slice still compares renderer-session evidence with the current area snapshot. Persistent cross-entry semantic analysis and the local mutation coordinator are the next Core layer, not something this UI pretends is already active.", "Diese Oberfläche vergleicht weiterhin Renderer-Session-Evidence mit dem aktuellen Bereichs-Snapshot. Persistente semantische Analyse über Einträge hinweg und der lokale Mutation Coordinator gehören zur nächsten Core-Schicht und werden hier nicht als bereits aktiv dargestellt.")}</p>
        </section>

        <section class="truth-review-compare">
          <div class="truth-review-source-card source-confirmed">
            <div class="truth-source-heading"><span class="truth-source-badge confirmed">✓</span><div><small>Project Brain</small><h3>${uiText("Current canonical statement", "Aktuelle kanonische Aussage")}</h3></div></div>
            ${existing ? `<div class="truth-review-source-text">${renderTruthText(existing)}</div>` : `<div class="truth-review-source-empty">${uiText("No confirmed Project Brain statement is loaded for this area yet.", "Für diesen Bereich ist noch keine bestätigte Project-Brain-Aussage geladen.")}</div>`}
          </div>
          <div class="truth-review-source-card source-user">
            <div class="truth-source-heading"><span class="truth-source-badge user">U</span><div><small>${uiText("User input", "Nutzereingabe")}</small><h3>${uiText("Evidence submitted from Desktop", "Vom Desktop eingereichte Evidence")}</h3></div></div>
            <textarea class="truth-review-proposal" data-review-proposal aria-label="Proposed Project Brain text">${escapeHtml(proposed)}</textarea>
            <button class="text-button edit-review-proposal" type="button">${uiText("Edit proposal", "Vorschlag bearbeiten")}</button>
          </div>
        </section>

        <section class="truth-review-section truth-change-preview">
          <div class="truth-review-section-head"><div><span class="eyebrow">${uiText("Change preview", "Änderungsvorschau")}</span><h3>${uiText("What this renderer preview would change", "Was diese Änderung aktualisieren würde")}</h3></div></div>
          <div class="truth-review-diff">${diff}</div>
        </section>

        <section class="truth-review-sources">
          <span>i</span><p><strong>${uiText("Boundary:", "Grenze:")}</strong> ${uiText("Project Truth Desktop is a view and controlled mutation surface over the existing Project Brain. This renderer slice creates no new canonical file or competing knowledge store.", "Project Truth Desktop ist eine Ansicht und kontrollierte Änderungsoberfläche über dem bestehenden Project Brain. Diese Renderer-Oberfläche erzeugt weder eine neue kanonische Datei noch einen konkurrierenden Wissensspeicher.")}</p>
        </section>

        <footer class="truth-review-actions">
          <div class="truth-decision-copy"><span class="eyebrow">${uiText("Decision", "Entscheidung")}</span><strong>${uiText("Choose what should become canonical knowledge.", "Entscheide, was kanonisches Wissen werden soll.")}</strong></div>
          <div class="truth-decision-buttons"><button class="text-button reject-truth-review" type="button">${uiText("Reject evidence", "Evidence ablehnen")}</button>${existing ? `<button class="button secondary keep-truth-review" type="button">${uiText("Keep existing", "Bestehendes behalten")}</button>` : ""}<button class="button primary accept-truth-review" type="button" ${projectKnowledgeApplying ? "disabled" : ""}>${projectKnowledgeApplying ? uiText("Applying…", "Wird übernommen…") : uiText("Accept into Project Truth", "In Project Brain übernehmen")}</button></div>
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
        <div class="truth-source-warning"><span>i</span><p><strong>${uiText("Canonical source:", "Kanonische Quelle:")}</strong> ${uiText("This content was read from the active project's Project Brain. The Desktop keeps no separate confirmed copy.", "Dieser Inhalt wurde aus dem Project Brain des aktiven Projekts gelesen. Der Desktop hält keine separate bestätigte Kopie.")}</p></div>
        <div class="truth-source-meta">${area.sourceHints.map((hint) => `<span>${escapeHtml(hint)}</span>`).join("")}</div>
        <div class="truth-source-tabs" role="group" aria-label="Source display mode"><button class="truth-source-tab ${sourceMode === "rendered" ? "active" : ""}" data-source-mode="rendered" type="button">Rendered</button><button class="truth-source-tab ${sourceMode === "raw" ? "active" : ""}" data-source-mode="raw" type="button">Raw Markdown</button></div>
        ${sourceMode === "raw"
          ? `<pre class="truth-source-raw"><code>${escapeHtml(markdown)}</code></pre>`
          : `<article class="truth-source-rendered"><h1>${escapeHtml(area.title)}</h1>${area.confirmedValue ? renderTruthText(area.confirmedValue) : '<p><em>No canonical Project Brain content is loaded for this area in the renderer preview.</em></p>'}</article>`}
        ${area.history.length ? `<details class="truth-source-history"><summary>${uiText("Project Brain history", "Project-Brain-Verlauf")} · ${area.history.length}</summary>${[...area.history].reverse().map((revision, index) => `<div><small>${uiText("Previous canonical revision", "Vorherige kanonische Revision")} ${area.history.length - index}</small>${renderTruthText(revision.value)}</div>`).join("")}</details>` : ""}
      </section>
    </div>`;
};

const renderProjectKnowledgeProtection = () => {
  const protection = projectKnowledgeProtection;
  if (!protection || protection.state === "ready") return "";

  if (protection.state === "guardian-bootstrap-required") {
    return `<div class="truth-boundary-card truth-boundary-card-redesign truth-protection-card"><span>🛡</span><p><strong>${uiText("Protected Project Brain setup required", "Geschütztes Project-Brain-Setup erforderlich")}</strong> ${uiText("Stage A is installed. Complete the one-time Guardian bootstrap before Livariant reads or changes canonical Project Knowledge.", "Stage A ist installiert. Schließe den einmaligen Guardian-Bootstrap ab, bevor Livariant kanonisches Projektwissen liest oder ändert.")}</p><button class="button secondary" type="button" data-project-knowledge-protection-setup>${uiText("Set up protection", "Schutz einrichten")}</button><button class="text-button" type="button" data-project-knowledge-protection-refresh>${uiText("Check again", "Erneut prüfen")}</button></div>`;
  }

  if (protection.state === "integrity-acceptance-required" && protection.integrity.digest) {
    return `<div class="truth-boundary-card truth-boundary-card-redesign truth-protection-card"><span>🛡</span><p><strong>${uiText("Confirm the current Project Brain", "Aktuellen Project Brain bestätigen")}</strong> ${uiText("Guardian is ready, but the exact current managed Project Brain state has not yet been accepted as canonical. Review the project state, then explicitly protect this exact digest.", "Guardian ist bereit, aber der exakte aktuelle verwaltete Project-Brain-Stand wurde noch nicht als kanonisch bestätigt. Prüfe den Projektstand und schütze anschließend ausdrücklich genau diesen Digest.")}</p><code>${escapeHtml(protection.integrity.digest)}</code><button class="button secondary" type="button" data-project-knowledge-integrity-accept>${uiText("Protect current Project Brain", "Aktuellen Project Brain schützen")}</button><button class="text-button" type="button" data-project-knowledge-protection-refresh>${uiText("Check again", "Erneut prüfen")}</button></div>`;
  }

  if (protection.state === "integrity-recovery-required") {
    return `<div class="truth-boundary-card truth-boundary-card-redesign truth-protection-card"><span>!</span><p><strong>${uiText("Project Brain integrity needs recovery", "Project-Brain-Integrität muss wiederhergestellt werden")}</strong> ${escapeHtml(protection.integrity.reason ?? uiText("The current managed Project Brain state cannot be safely accepted from this screen.", "Der aktuelle verwaltete Project-Brain-Stand kann in dieser Ansicht nicht sicher bestätigt werden."))}</p><button class="text-button" type="button" data-project-knowledge-protection-refresh>${uiText("Check again", "Erneut prüfen")}</button></div>`;
  }

  const reason = protection.guardian.protectedSource.reason || protection.guardian.guardian.reason;
  return `<div class="truth-boundary-card truth-boundary-card-redesign truth-protection-card"><span>!</span><p><strong>${uiText("Protected Project Brain is not ready", "Geschützter Project Brain ist nicht bereit")}</strong> ${escapeHtml(reason)}</p><button class="text-button" type="button" data-project-knowledge-protection-refresh>${uiText("Check again", "Erneut prüfen")}</button></div>`;
};

const renderProjectTruthView = () => {
  const needsReview = areas.filter((area) => area.state === "review").length;
  const openQuestions = areas.filter((area) => area.state === "open" || area.state === "deferred").length;
  const confirmed = areas.filter((area) => area.state === "confirmed").length;
  const conflicts = areas.filter((area) => area.state === "review" && classifyTruthProposal(area).conflict).length;
  return `
    <div class="truth-workspace truth-workspace-areas truth-workspace-redesign">
      <header class="topbar truth-topbar-redesign"><div><span class="eyebrow">${uiText("Understand your project", "Dein Projekt verstehen")}</span><h1>${uiText("Project knowledge", "Projektwissen")}</h1><p>${uiText("This is where you review the purpose, direction and rules Livariant should use when it helps with your project. Missing or proposed information stays separate until you decide what is valid.", "Hier prüfst du Zweck, Richtung und Regeln, die Livariant bei der Arbeit mit deinem Projekt berücksichtigen soll. Fehlende oder vorgeschlagene Informationen bleiben getrennt, bis du entscheidest, was gilt.")}</p></div></header>

      <section class="truth-control-band">
        <div class="truth-control-status">
          <div><small>${uiText("Confirmed", "Bestätigt")}</small><strong>${confirmed}</strong></div>
          <div><small>${uiText("Review", "Prüfung")}</small><strong>${needsReview}</strong></div>
          <div><small>${uiText("Gaps", "Lücken")}</small><strong>${openQuestions}</strong></div>
          <div class="${conflicts > 0 ? "has-conflict" : ""}"><small>${uiText("Conflicts", "Konflikte")}</small><strong>${conflicts}</strong></div>
        </div>
        <label class="truth-search" aria-label="${uiText("Search Project Brain", "Project Brain durchsuchen")}"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg><input type="search" value="${escapeHtml(truthSearch)}" placeholder="${uiText("Search project knowledge…", "Projektwissen durchsuchen…")}" data-truth-search /></label>
      </section>

      <section class="truth-main-card truth-area-workspace">
        <div class="truth-main-head truth-main-head-redesign">
          <div><span class="eyebrow">${uiText("What Livariant needs to understand", "Was Livariant verstehen muss")}</span><h2>${uiText("The few project facts that guide everything else", "Die wenigen Projektinformationen, an denen sich alles Weitere orientiert")}</h2></div>
          <div class="truth-filters" role="group" aria-label="${uiText("Filter project knowledge", "Projektwissen filtern")}">
            <button class="truth-filter ${truthFilter === "all" ? "active" : ""}" type="button" data-truth-filter="all">${uiText("All", "Alle")}</button>
            <button class="truth-filter ${truthFilter === "review" ? "active" : ""}" type="button" data-truth-filter="review">${uiText("Review", "Prüfung")}</button>
            <button class="truth-filter ${truthFilter === "open" ? "active" : ""}" type="button" data-truth-filter="open">${uiText("Gaps", "Lücken")}</button>
            <button class="truth-filter ${truthFilter === "conflicts" ? "active" : ""}" type="button" data-truth-filter="conflicts">${uiText("Conflicts", "Konflikte")}</button>
          </div>
        </div>
        <div class="truth-area-list">${areas.map(renderAreaCard).join("")}<div class="truth-empty" data-truth-empty hidden><strong>${uiText("Nothing matches this view", "Keine Treffer in dieser Ansicht")}</strong><p>${uiText("Try another search or filter.", "Versuche eine andere Suche oder einen anderen Filter.")}</p></div></div>
      </section>

      ${projectKnowledgeLoading ? `<div class="truth-boundary-card truth-boundary-card-redesign"><span>…</span><p><strong>${uiText("Loading Project Brain", "Project Brain wird geladen")}</strong> ${uiText("Livariant is reading the active project's canonical Project Brain before showing confirmed knowledge.", "Livariant liest zuerst den kanonischen Project Brain des aktiven Projekts, bevor bestätigtes Wissen angezeigt wird.")}</p></div>` : ""}
      ${renderProjectKnowledgeProtection()}
      ${projectKnowledgeError ? `<div class="truth-boundary-card truth-boundary-card-redesign"><span>!</span><p><strong>${uiText("Project Brain is not available", "Project Brain ist nicht verfügbar")}</strong> ${escapeHtml(projectKnowledgeError)}</p></div>` : `<div class="truth-boundary-card truth-boundary-card-redesign"><span>i</span><p><strong>${uiText("Suggestions are not automatically project truth.", "Vorschläge werden nicht automatisch zur Projektwahrheit.")}</strong> ${uiText("Confirmed values on this page now come from the active project's canonical Project Brain. A proposal remains non-canonical until the protected authorization and apply path completes.", "Bestätigte Werte auf dieser Seite stammen jetzt aus dem kanonischen Project Brain des aktiven Projekts. Ein Vorschlag bleibt nicht-kanonisch, bis der geschützte Autorisierungs- und Apply-Pfad abgeschlossen ist.")}</p></div>`}
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
  if (currentView === "diagnostics") return `<div class="diagnostics-surface" data-surface="diagnostics" data-diagnostics-preset="30d"></div>`;
  return renderProjectTruthView();
};

const renderUpdatesSettingsView = () => {
  const copy = updateCopy();
  const checking = updateState === "checking";
  const showCheckButton = updateResult?.state !== "available";
  return `
    <section class="settings-panel settings-updates" data-settings-surface="updates">
      <span class="eyebrow">${uiText("Desktop lifecycle", "Desktop-Lebenszyklus")}</span><h2>Updates</h2>
      <p>${uiText(
        "Update checks stay inside Livariant's fixed host-side boundary. Availability never authorizes installation or restart.",
        "Update-Prüfungen bleiben innerhalb der festen hostseitigen Livariant-Grenze. Verfügbarkeit autorisiert niemals Installation oder Neustart.",
      )}</p>
      <div class="settings-status-hero">
        <div><small>${escapeHtml(copy.eyebrow)}</small><strong>${escapeHtml(copy.title)}</strong><span>${escapeHtml(copy.detail)}</span></div>
        ${showCheckButton ? `<button class="button primary check-updates" type="button" ${checking ? "disabled" : ""}>${checking ? uiText("Checking…", "Prüfe…") : uiText("Check for updates", "Nach Updates suchen")}</button>` : ""}
      </div>
      <div class="settings-safety-grid">
        <article><span>01</span><div><strong>${uiText("Signed update identity", "Signierte Update-Identität")}</strong><p>${uiText("The renderer cannot provide arbitrary update URLs or executable paths.", "Der Renderer kann keine beliebigen Update-URLs oder ausführbaren Pfade vorgeben.")}</p></div></article>
        <article><span>02</span><div><strong>${uiText("Install authority", "Installationsfreigabe")}</strong><p>${uiText("An available update remains evidence only until the user explicitly starts the qualified install path.", "Ein verfügbares Update bleibt zunächst nur Evidence, bis der Nutzer den qualifizierten Installationspfad ausdrücklich startet.")}</p></div></article>
      </div>
    </section>`;
};

const renderSettingsContent = () => {
  if (settingsSection === "projects") return renderProjectSettingsView();
  if (settingsSection === "connections") return renderConnectionsSettingsView();
  if (settingsSection === "updates") return renderUpdatesSettingsView();
  if (settingsSection === "about") return renderAboutSupportSettingsView();
  if (settingsSection === "system") return `
    <section class="settings-panel">
      <span class="eyebrow">Desktop</span><h2>System</h2>
      <p>${uiText("Technical version and runtime information lives here instead of occupying normal work pages.", "Technische Versions- und Runtime-Informationen liegen hier, statt normale Arbeitsbereiche zu belegen.")}</p>
      <div class="settings-card"><div><strong>${uiText("Desktop preview", "Desktop-Vorschau")}</strong><span>${uiText("Runtime and version information stays consolidated in Settings.", "Runtime- und Versionsinformationen bleiben zentral in den Einstellungen gebündelt.")}</span></div><span class="settings-badge">${uiText("Preview", "Vorschau")}</span></div>
    </section>`;
  return `
    <section class="settings-panel">
      <span class="eyebrow">Livariant</span><h2>${uiText("General", "Allgemein")}</h2>
      <p>${uiText("General app preferences and help for finding your way around Livariant.", "Allgemeine App-Einstellungen und Hilfe, um dich in Livariant zurechtzufinden.")}</p>
      <div class="settings-card"><div><strong>${uiText("App settings", "App-Einstellungen")}</strong><span>${uiText("Livariant keeps general preferences separate from project-specific state.", "Livariant hält allgemeine Einstellungen getrennt vom projektspezifischen Zustand.")}</span></div><span class="settings-badge">${uiText("App-wide", "App-weit")}</span></div>
      <div class="settings-card settings-card-action"><div><strong>${uiText("Quick product tour", "Kurze Produkttour")}</strong><span>${uiText("Review what Overview, Project knowledge, Sources, Diagnostics and Settings are for.", "Sieh dir noch einmal an, wofür Übersicht, Projektwissen, Quellen, Diagnose und Einstellungen da sind.")}</span></div><button class="button secondary" type="button" data-start-product-tour>${uiText("Start tour", "Tour starten")}</button></div>
    </section>`;
};

const renderSettingsModal = () => settingsOpen ? `
  <div class="modal-backdrop" data-settings-backdrop>
    <section class="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" data-settings-modal>
      <aside class="settings-nav">
        <div class="settings-heading"><span class="eyebrow">${uiText("Settings", "Einstellungen")}</span><h2 id="settings-title">${uiText("Settings", "Einstellungen")}</h2><p>${uiText("Livariant, connections and desktop lifecycle.", "Livariant, Verbindungen und Desktop-Lebenszyklus.")}</p></div>
        <div class="settings-nav-group"><small>${uiText("Workspace", "Arbeitsbereich")}</small>
          <button class="settings-nav-item ${settingsSection === "general" ? "active" : ""}" data-settings-section="general" type="button">${icon("settings")}<span>${uiText("General", "Allgemein")}</span></button>
          <button class="settings-nav-item ${settingsSection === "projects" ? "active" : ""}" data-settings-section="projects" type="button">${icon("home")}<span>${uiText("Projects", "Projekte")}</span></button>
        </div>
        <div class="settings-nav-group"><small>${uiText("Integrations", "Integrationen")}</small>
          <button class="settings-nav-item ${settingsSection === "connections" ? "active" : ""}" data-settings-section="connections" type="button">${icon("diagnostics")}<span>${uiText("Connections", "Verbindungen")}</span></button>
        </div>
        <div class="settings-nav-group"><small>Desktop</small>
          <button class="settings-nav-item ${settingsSection === "updates" ? "active" : ""}" data-settings-section="updates" type="button">${icon("updates")}<span>Updates</span></button>
          <button class="settings-nav-item ${settingsSection === "system" ? "active" : ""}" data-settings-section="system" type="button">${icon("settings")}<span>System</span></button>
        </div>
        <div class="settings-nav-group"><small>${uiText("Information", "Information")}</small>
          <button class="settings-nav-item ${settingsSection === "about" ? "active" : ""}" data-settings-section="about" type="button">${icon("home")}<span>${uiText("About & support", "Über Livariant & Hilfe")}</span></button>
        </div>
      </aside>
      <div class="settings-content"><button class="modal-close" data-close-settings type="button" aria-label="${uiText("Close settings", "Einstellungen schließen")}">×</button><div class="settings-content-body">${renderSettingsContent()}</div></div>
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

const updateHostFailureCopy = () => uiText(
  "The update check could not be completed. The existing installation was not changed. Check your connection and try again.",
  "Die Update-Prüfung konnte nicht abgeschlossen werden. Die bestehende Installation wurde nicht verändert. Prüfe deine Verbindung und versuche es erneut.",
);

const bindUpdateCheckEvent = () => {
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
    } catch {
      updateResult = { state: "error", currentVersion: "unknown", availableVersion: null, detail: updateHostFailureCopy() };
      updateState = "error";
      notice = { kind: "error", title: "Update check failed", detail: updateResult.detail };
    }
    render();
  });
};

const renderSettingsSectionOnly = () => {
  const body = document.querySelector<HTMLElement>(".settings-content-body");
  if (!body) { render(); return; }
  body.innerHTML = renderSettingsContent();
  document.querySelectorAll<HTMLButtonElement>("[data-settings-section]").forEach((button) => {
    button.classList.toggle("active", button.dataset.settingsSection === settingsSection);
  });
  bindUpdateCheckEvent();
  bindConnectionDiagnosticsEvents(renderSettingsSectionOnly);
  bindAboutSupportSettingsEvents(renderSettingsSectionOnly);
  bindProjectSettingsEvents(renderSettingsSectionOnly, closeSettings);
  document.querySelector<HTMLButtonElement>("[data-start-product-tour]")?.addEventListener("click", () => {
    settingsOpen = false;
    render();
    document.dispatchEvent(new Event("livariant:start-product-tour"));
  });
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
        <div class="brand"><div class="brand-mark" style="overflow:hidden;border:0;background:transparent;box-shadow:none;"><img src="${livariantLogo}" alt="Livariant logo" style="width:100%;height:100%;object-fit:contain;display:block;"/></div><div><strong>Livariant</strong><small>${uiText("Project context", "Projektkontext")}</small></div></div>
        <nav class="nav" aria-label="Primary navigation">
          <button class="nav-item">${icon("home")}<span>Overview</span></button>
          <button class="nav-item ${currentView === "steps" ? "active" : ""}" data-view="steps">${icon("steps")}<span>${uiText("Project knowledge", "Projektwissen")}</span><b>${attentionCount}</b></button>
          <button class="nav-item ${currentView === "diagnostics" ? "active" : ""}" data-view="diagnostics">${icon("diagnostics")}<span>Diagnostics</span></button>
          <button class="nav-item ${currentView === "updates" ? "active" : ""}" data-view="updates">${icon("updates")}<span>Updates</span></button>
        </nav>
        <div class="sidebar-lower">
          <button class="nav-item settings-launcher ${settingsOpen ? "active" : ""}" type="button" data-open-settings>${icon("settings")}<span>Settings</span></button>
          <div class="sidebar-footer"><div class="status-dot"></div><div><strong>Livariant Desktop</strong><small>${uiText("Project context under your control", "Projektkontext unter deiner Kontrolle")}</small></div></div>
        </div>
      </aside><main class="content">${renderContent()}</main></div>
      ${renderNotice()}
      ${renderSettingsModal()}
    </div>`;
  // The redesign enhancer normally also observes #app mutations. Dispatching this event here
  // lets an already-loaded enhancer recompose the shell synchronously in the same render task,
  // so navigation never paints an intermediate legacy header/sidebar frame.
  document.dispatchEvent(new Event("livariant:shell-rendered"));
  bindEvents();
  applyTruthFilters();
};

const activateView = async (view: View) => {
  // Re-clicking the visibly active route must not tear down and rebuild the whole Desktop tree.
  // Do not rely on currentView alone: extension surfaces such as Sources & Review manage their
  // own active navigation state and can leave currentView intentionally unchanged.
  const routeButton = document.querySelector<HTMLButtonElement>(`nav.nav [data-view="${view}"]`);
  const routeIsVisiblyActive = routeButton?.classList.contains("active") === true;
  if (routeIsVisiblyActive && !settingsOpen && selectedReviewAreaId === null && selectedSourceAreaId === null) return;

  currentView = view;
  settingsOpen = false;
  selectedReviewAreaId = null;
  selectedSourceAreaId = null;

  // Diagnostics is enhanced by diagnostics-cockpit.ts, which owns its own qualified summary load.
  // A second connector/diagnostics refresh here used to trigger another full app render and remount
  // the cockpit, producing the visible double reload/twitch reported by the maintainer.
  if (view === "connections") await refreshConnectionsSettings();
  if (view === "steps") {
    await refreshProjectKnowledge(false);
  }
  render();
};

const bindEvents = () => {
  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.view;
      if (view === "steps" || view === "updates" || view === "connections" || view === "diagnostics") void activateView(view);
    });
  });

  document.querySelector<HTMLButtonElement>("[data-open-settings]")?.addEventListener("click", () => { settingsOpen = true; selectedReviewAreaId = null; selectedSourceAreaId = null; render(); });
  document.querySelector<HTMLButtonElement>("[data-start-product-tour]")?.addEventListener("click", () => {
    settingsOpen = false;
    render();
    document.dispatchEvent(new Event("livariant:start-product-tour"));
  });
  document.querySelector<HTMLButtonElement>("[data-close-settings]")?.addEventListener("click", (event) => { event.stopPropagation(); closeSettings(); });
  document.querySelector<HTMLElement>("[data-settings-backdrop]")?.addEventListener("click", (event) => {
    if (event.target !== event.currentTarget) return;
    closeSettings();
  });

  document.querySelectorAll<HTMLButtonElement>("[data-settings-section]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      const section = button.dataset.settingsSection;
      if (section !== "general" && section !== "projects" && section !== "connections" && section !== "updates" && section !== "system" && section !== "about") return;
      settingsSection = section;
      renderSettingsSectionOnly();
      if (section === "projects") {
        await refreshProjectSettings();
        renderSettingsSectionOnly();
      }
      if (section === "connections") {
        await refreshConnectionsSettings();
        renderSettingsSectionOnly();
      }
      if (section === "about") {
        await refreshAboutSupportSettings();
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
    card.querySelector(".analyze-truth-input")?.addEventListener("click", async () => {
      const value = composer?.value.trim() ?? "";
      if (!value) return;
      notice = null;
      try {
        const prepared = await prepareProjectKnowledgeProposal(area.id as "purpose" | "direction" | "rules", value);
        area.pendingValue = prepared.displayValue;
        area.preparedProposal = prepared.proposal;
        area.state = "review";
        selectedReviewAreaId = area.id;
      } catch (error) {
        notice = {
          kind: "error",
          title: uiText("Proposal could not be prepared", "Vorschlag konnte nicht vorbereitet werden"),
          detail: error instanceof Error ? error.message : String(error),
        };
      }
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
    const area = areas.find((candidate) => candidate.id === selectedReviewAreaId);
    if (!area) return;
    selectedReviewAreaId = null;
    area.preparedProposal = null;
    area.state = area.confirmedValue ? "confirmed" : "open";
    render();
    const card = document.querySelector<HTMLElement>(`[data-truth-area="${area.id}"]`);
    const composer = card?.querySelector<HTMLTextAreaElement>(".truth-composer-input");
    if (composer) {
      composer.value = area.pendingValue;
      composer.focus();
    }
  });

  document.querySelector<HTMLButtonElement>(".accept-truth-review")?.addEventListener("click", async () => {
    const area = areas.find((candidate) => candidate.id === selectedReviewAreaId);
    if (!area?.preparedProposal || projectKnowledgeApplying) return;
    projectKnowledgeApplying = true;
    notice = null;
    render();
    try {
      const applied = await applyProjectKnowledgeProposal(area.id as "purpose" | "direction" | "rules", area.preparedProposal);
      applyProjectKnowledgeSnapshot(applied.snapshot);
      selectedReviewAreaId = null;
      notice = {
        kind: "success",
        title: uiText("Project Brain updated", "Project Brain aktualisiert"),
        detail: uiText(
          "The exact reviewed proposal was authorized, applied, verified and re-read from the canonical Project Brain.",
          "Der exakt geprüfte Vorschlag wurde autorisiert, angewendet, verifiziert und erneut aus dem kanonischen Project Brain gelesen.",
        ),
      };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await refreshProjectKnowledge(false);
      notice = {
        kind: "error",
        title: uiText("Project Brain apply needs attention", "Project-Brain-Übernahme benötigt Aufmerksamkeit"),
        detail: uiText(
          `Livariant could not prove the complete protected apply-and-re-read sequence. Current canonical state was checked again. Detail: ${detail}`,
          `Livariant konnte die vollständige geschützte Übernahme mit erneuter Prüfung nicht nachweisen. Der aktuelle kanonische Stand wurde erneut geprüft. Detail: ${detail}`,
        ),
      };
    } finally {
      projectKnowledgeApplying = false;
      render();
    }
  });

  document.querySelector<HTMLButtonElement>(".keep-truth-review")?.addEventListener("click", () => {
    const area = areas.find((candidate) => candidate.id === selectedReviewAreaId);
    if (!area) return;
    area.pendingValue = "";
    area.preparedProposal = null;
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

  document.querySelector<HTMLButtonElement>("[data-project-knowledge-protection-setup]")?.addEventListener("click", async () => {
    try {
      const launched = await launchProjectKnowledgeProtectionSetup();
      notice = { kind: "info", title: uiText("Protected setup opened", "Geschütztes Setup geöffnet"), detail: launched.detail };
    } catch (error) {
      notice = { kind: "error", title: uiText("Protected setup could not start", "Geschütztes Setup konnte nicht gestartet werden"), detail: error instanceof Error ? error.message : String(error) };
    }
    render();
  });
  document.querySelector<HTMLButtonElement>("[data-project-knowledge-protection-refresh]")?.addEventListener("click", async () => {
    await refreshProjectKnowledge();
  });

  document.querySelector<HTMLButtonElement>("[data-project-knowledge-integrity-accept]")?.addEventListener("click", async () => {
    const digest = projectKnowledgeProtection?.integrity.digest;
    if (!digest || projectKnowledgeProtection?.state !== "integrity-acceptance-required") return;
    projectKnowledgeLoading = true;
    render();
    try {
      projectKnowledgeProtection = await acceptProjectKnowledgeIntegrity(digest);
      notice = {
        kind: "success",
        title: uiText("Project Brain protected", "Project Brain geschützt"),
        detail: uiText("The exact reviewed managed state is now protected by Guardian accepted-state Authority.", "Der exakt geprüfte verwaltete Stand ist jetzt durch Guardian Accepted-State Authority geschützt."),
      };
      await refreshProjectKnowledge(false);
    } catch (error) {
      notice = {
        kind: "error",
        title: uiText("Project Brain protection was not completed", "Project-Brain-Schutz wurde nicht abgeschlossen"),
        detail: error instanceof Error ? error.message : String(error),
      };
      await refreshProjectKnowledge(false);
    } finally {
      projectKnowledgeLoading = false;
      render();
    }
  });

  document.querySelector<HTMLButtonElement>(".notice-close")?.addEventListener("click", () => { notice = null; render(); });

  bindUpdateCheckEvent();

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

document.addEventListener("livariant:open-project-settings", () => {
  settingsOpen = true;
  settingsSection = "projects";
  selectedReviewAreaId = null;
  selectedSourceAreaId = null;
  render();
  void refreshProjectSettings().then(() => renderSettingsSectionOnly()).catch(() => renderSettingsSectionOnly());
});

onDesktopProjectActivated(async () => {
  for (const area of areas) {
    area.confirmedValue = "";
    area.pendingValue = "";
    area.activeDecisionId = null;
    area.preparedProposal = null;
    area.history = [];
    area.state = "open";
  }
  projectKnowledgeError = null;
  projectKnowledgeProtection = null;
  if (currentView === "steps") await refreshProjectKnowledge();
});

onLanguageChange(() => {
  if (document.querySelector(".truth-workspace") || settingsOpen) render();
});

render();