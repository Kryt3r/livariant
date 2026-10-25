import { getLanguage } from "./i18n/runtime.js";
import { loadProjectKnowledgeExplorer, type KnowledgeExplorerRecord, type ProjectKnowledgeExplorer } from "./project-knowledge-bridge.js";

type Category = "all" | KnowledgeExplorerRecord["recordType"];
const CATEGORIES: readonly Category[] = [
  "all", "decision", "fact", "goal", "project-identity",
  "observation", "open-question", "unclassified-knowledge",
];
const PAGE_SIZE = 60;
let snapshot: ProjectKnowledgeExplorer | null = null;
let loading = false;
let failure: string | null = null;
let generation = 0;
let category: Category = "all";
let query = "";
let limit = PAGE_SIZE;

const t = (en: string, de: string): string => getLanguage() === "de" ? de : en;
const html = (value: string): string => value.replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
})[character] ?? character);

function categoryName(value: Category): string {
  switch (value) {
    case "all": return t("All", "Alle");
    case "decision": return t("Decisions", "Entscheidungen");
    case "fact": return t("Knowledge", "Wissen");
    case "goal": return t("Goals", "Ziele");
    case "project-identity": return t("Project identity", "Projektidentität");
    case "observation": return t("Observations", "Beobachtungen");
    case "open-question": return t("Open questions", "Offene Fragen");
    case "unclassified-knowledge": return t("Not classified", "Nicht klassifiziert");
  }
}
function lifecycleName(value: KnowledgeExplorerRecord["lifecycle"]): string {
  switch (value) {
    case "active": return t("Canonical record", "Kanonischer Eintrag");
    case "superseded": return t("Superseded", "Ersetzt");
    case "observed": return t("Observation, not verified truth", "Beobachtung, keine verifizierte Wahrheit");
    case "unresolved": return t("Unresolved", "Ungeklärt");
  }
}

export function invalidateKnowledgeExplorer(): void {
  generation++;
  snapshot = null;
  loading = false;
  failure = null;
  category = "all";
  query = "";
  limit = PAGE_SIZE;
}
function matching(): KnowledgeExplorerRecord[] {
  if (!snapshot) return [];
  const needle = query.trim().toLocaleLowerCase();
  return snapshot.records.filter((entry) =>
    (category === "all" || entry.recordType === category)
    && (!needle || [
      entry.statement, entry.recordType, entry.source.document,
      entry.source.sourceSection ?? "", entry.source.sourceRecordId ?? "",
    ].join(" ").toLocaleLowerCase().includes(needle)));
}

function entryHtml(entry: KnowledgeExplorerRecord): string {
  const relationship = snapshot?.relationships.find((link) => link.type === "supersedes" && link.toRecordId === entry.recordId);
  const replacement = relationship ? snapshot?.records.find((record) => record.recordId === relationship.fromRecordId) : null;
  return `<details class="knowledge-explorer-entry">
    <summary><span class="knowledge-explorer-statement">${html(entry.statement)}</span>
      <span class="knowledge-explorer-tags"><span>${html(categoryName(entry.recordType))}</span>
        <span class="knowledge-explorer-state ${entry.lifecycle}">${html(lifecycleName(entry.lifecycle))}</span>
      </span></summary>
    <div class="knowledge-explorer-detail">
      <p>${html(t("Read-only Project Brain evidence. No changes or approvals are performed here.", "Schreibgeschützte Project-Brain-Evidence. Hier werden keine Änderungen oder Freigaben vorgenommen."))}</p>
      <dl>
        <div><dt>${html(t("Source document", "Quelldokument"))}</dt><dd>${html(entry.source.document)}</dd></div>
        ${entry.source.sourceSection ? `<div><dt>${html(t("Source section", "Quellabschnitt"))}</dt><dd>${html(entry.source.sourceSection)}</dd></div>` : ""}
        ${entry.source.sourceRecordId ? `<div><dt>${html(t("Decision ID", "Entscheidungs-ID"))}</dt><dd><code>${html(entry.source.sourceRecordId)}</code></dd></div>` : ""}
        <div><dt>${html(t("Scope", "Geltungsbereich"))}</dt><dd>${html(t("Not classified or specified", "Nicht klassifiziert oder festgelegt"))}</dd></div>
        <div><dt>${html(t("Independent verification", "Unabhängige Verifikation"))}</dt><dd>${html(t("Not assessed", "Nicht geprüft"))}</dd></div>
        <div><dt>${html(t("Source revision", "Quellrevision"))}</dt><dd><code>${html(entry.revisionDigest)}</code></dd></div>
        ${entry.supersededBy ? `<div><dt>${html(t("Superseded by", "Ersetzt durch"))}</dt><dd><code>${html(entry.supersededBy)}</code></dd></div>` : ""}
        ${replacement ? `<div><dt>${html(t("Newer decision", "Nachfolgeentscheidung"))}</dt><dd>${html(replacement.statement)}</dd></div>` : ""}
      </dl>
    </div>
  </details>`;
}

function resultHtml(): string {
  if (!snapshot) return "";
  const records = matching();
  const shown = records.slice(0, limit);
  return `<div class="knowledge-explorer-results-summary" aria-live="polite">
    ${html(t("Matching records", "Passende Einträge"))}: <strong>${records.length}</strong>
    ${shown.length < records.length ? ` · ${shown.length} ${html(t("shown", "angezeigt"))}` : ""}
  </div>
  ${shown.length
    ? `<div class="knowledge-explorer-entries">${shown.map(entryHtml).join("")}</div>`
    : `<p class="knowledge-explorer-empty">${html(t("No records match.", "Keine passenden Einträge."))}</p>`}
  ${shown.length < records.length
    ? `<button class="knowledge-explorer-more" type="button" data-explorer-more>${html(t("Show more", "Weitere anzeigen"))}</button>` : ""}`;
}
function bodyHtml(): string {
  if (loading) return `<p class="knowledge-explorer-message" role="status">${html(t("Reading protected Project Brain…", "Geschützter Project Brain wird gelesen …"))}</p>`;
  if (failure) return `<p class="knowledge-explorer-error" role="alert">${html(t(
    "Protected knowledge cannot be displayed. No untrusted entries will be shown.",
    "Geschütztes Wissen kann nicht angezeigt werden. Ungeprüfte Einträge werden nicht dargestellt.",
  ))}<span>${html(failure)}</span></p>`;
  if (!snapshot) return `<p class="knowledge-explorer-message">${html(t(
    "Available after protected project knowledge is loaded.",
    "Verfügbar, sobald das geschützte Projektwissen geladen wurde.",
  ))}</p>`;
  return `<p class="knowledge-explorer-boundary">${html(t(
    "Observations, open questions and unclassified notes are not binding project rules.",
    "Beobachtungen, offene Fragen und unklassifizierte Notizen sind keine verbindlichen Projektregeln.",
  ))}</p>
    <div class="knowledge-explorer-toolbar">
      <div class="knowledge-explorer-categories" role="group" aria-label="${html(t("Knowledge categories", "Wissenskategorien"))}">
        ${CATEGORIES.map((entry) => `<button type="button" data-explorer-category="${entry}" aria-pressed="${category === entry}" class="${category === entry ? "active" : ""}">${html(categoryName(entry))}<span>${entry === "all" ? snapshot!.records.length : snapshot!.records.filter((record) => record.recordType === entry).length}</span></button>`).join("")}
      </div>
      <label class="knowledge-explorer-search"><span>${html(t("Search knowledge", "Wissen durchsuchen"))}</span>
        <input type="search" data-explorer-search value="${html(query)}" placeholder="${html(t("Search entries or sources…", "Einträge oder Quellen suchen …"))}"/>
      </label>
    </div>
    <div data-explorer-results>${resultHtml()}</div>`;
}
export function renderKnowledgeExplorer(): string {
  return `<section class="knowledge-explorer" data-knowledge-explorer aria-labelledby="knowledge-explorer-heading">
    <header class="knowledge-explorer-heading"><div>
      <span class="eyebrow">${html(t("Project Brain library", "Project-Brain-Bibliothek"))}</span>
      <h2 id="knowledge-explorer-heading">${html(t("Knowledge Explorer", "Wissens-Explorer"))}</h2>
      <p>${html(t("Browse decisions, knowledge, observations and open questions in the active project.", "Durchsuche Entscheidungen, Wissen, Beobachtungen und offene Fragen des aktiven Projekts."))}</p>
    </div><button type="button" class="knowledge-explorer-refresh" data-explorer-refresh ${loading ? "disabled" : ""}>${html(t("Refresh", "Aktualisieren"))}</button></header>
    <div data-explorer-body>${bodyHtml()}</div>
  </section>`;
}
function repaint(): void {
  const root = document.querySelector<HTMLElement>("[data-knowledge-explorer]");
  if (!root) return;
  // Only replace the renderer's display, never canonical Project Brain.
  const body = root.querySelector<HTMLElement>("[data-explorer-body]");
  if (body) body.innerHTML = bodyHtml();
  const refresh = root.querySelector<HTMLButtonElement>("[data-explorer-refresh]");
  if (refresh) refresh.disabled = loading;
}
export function bindKnowledgeExplorerEvents(): void {
  const root = document.querySelector<HTMLElement>("[data-knowledge-explorer]");
  if (!root) return;
  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const categoryButton = target.closest<HTMLButtonElement>("[data-explorer-category]");
    if (categoryButton) {
      const newCategory = categoryButton.dataset.explorerCategory as Category;
      if (!CATEGORIES.includes(newCategory)) return;
      category = newCategory;
      limit = PAGE_SIZE;
      repaint();
      return;
    }
    if (target.closest("[data-explorer-more]")) {
      limit += PAGE_SIZE;
      const results = root.querySelector<HTMLElement>("[data-explorer-results]");
      if (results) results.innerHTML = resultHtml();
      return;
    }
    if (target.closest("[data-explorer-refresh]")) void refreshKnowledgeExplorer();
  });
  root.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.matches("[data-explorer-search]")) return;
    query = target.value;
    limit = PAGE_SIZE;
    const results = root.querySelector<HTMLElement>("[data-explorer-results]");
    if (results) results.innerHTML = resultHtml();
  });
}
export async function refreshKnowledgeExplorer(): Promise<void> {
  const request = ++generation;
  snapshot = null;
  failure = null;
  loading = true;
  repaint();
  try {
    const result = await loadProjectKnowledgeExplorer();
    if (request !== generation) return;
    if (result.state !== "ready" || result.boundaries.grantsAuthority !== false
      || result.boundaries.mutationSupported !== false || !result.stableProjectIdentity) {
      throw new Error("Knowledge Explorer returned an invalid protection state.");
    }
    snapshot = result;
  } catch (error) {
    if (request !== generation) return;
    snapshot = null;
    failure = error instanceof Error ? error.message : t("Protected read failed.", "Geschütztes Lesen fehlgeschlagen.");
  } finally {
    if (request === generation) {
      loading = false;
      repaint();
    }
  }
}
