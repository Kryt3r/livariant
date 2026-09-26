import "./diagnostics-cockpit.css";
import { invoke } from "@tauri-apps/api/core";
import { getLanguage, onLanguageChange } from "./i18n/runtime.js";
import { onDesktopProjectActivated } from "./desktop-project-registry.js";
import { providerBrandLogo } from "./provider-brand-assets.js";

type DiagnosticPreset = "1d" | "7d" | "30d" | "90d" | "all";
type DiagnosticsTab = "overview" | "sessions" | "usage" | "attribution" | "details";
type ObservedAttributionGroup = {
  value: string;
  eventCount: number;
  totalTokens: number;
  knownTotalTokenEvents: number;
  unknownTotalTokenEvents: number;
};
type ObservedAttributionDimension = {
  attributedEventCount: number;
  unattributedEventCount: number;
  groups: ObservedAttributionGroup[];
};
type DiagnosticsTelemetryProviderState = {
  state: "supported" | "supported-opt-in" | "mcp-session-only" | "provider-capable-not-integrated" | "not-integrated" | "bridge-dependent";
  evidence: string;
  detail: string;
};
type DiagnosticsTelemetryCoverage = {
  evidenceContract: "qualified-provider-owned-usage";
  connectionDoesNotImplyTelemetry: true;
  qualifiedProviders: string[];
  providers: Record<"codex" | "claude" | "gemini" | "custom", DiagnosticsTelemetryProviderState>;
};

type DiagnosticsSummary = {
  preset: DiagnosticPreset;
  range: { start?: string; end?: string };
  scope: {
    kind: "project";
    projectId: string;
    unattributedEventCount: number;
  };
  hasObservedData: boolean;
  storage: string;
  telemetryCoverage: DiagnosticsTelemetryCoverage;
  observed: {
    eventCount: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    reasoningTokens: number;
    totalTokens: number;
    knownFieldCount: number;
    unknownFieldCount: number;
  };
  avoided: { eventCount: number; contextTokens: number };
  estimated: { eventCount: number; tokens: number };
  attribution: {
    provider: ObservedAttributionDimension;
    model: ObservedAttributionDimension;
    projectId: ObservedAttributionDimension;
    sessionId: ObservedAttributionDimension;
    taskId: ObservedAttributionDimension;
  };
};
type ProviderProjectDescriptor = {
  desktopProjectId: string;
  localRoot: string;
  projectId: string | null;
  stableProjectIdentity: string | null;
};
type CodexSessionBinding = {
  threadId: string;
  sessionId: string;
  cwd: string;
  providerProjectId: string | null;
  project: ProviderProjectDescriptor | null;
  attribution: "cwd-exact" | "cwd-descendant" | "unattributed";
};
type CodexReconciliation = {
  schemaVersion: 1;
  state: "ready" | "unavailable";
  provider: "codex";
  observedAt: string;
  detail: string;
  bindings: CodexSessionBinding[];
};
type HookSessionBinding = {
  provider: "claude" | "gemini";
  sessionId: string;
  project: ProviderProjectDescriptor | null;
  attribution: "cwd-consistent" | "mixed-projects" | "unattributed";
  cwdEvidence: string[];
  transcriptPaths: string[];
  latestObservedAt: string;
  eventCount: number;
};
type HookReconciliation = {
  schemaVersion: 1;
  state: "ready";
  observedAt: string;
  bindings: HookSessionBinding[];
};
type ProviderSessionEvidence = {
  codex: CodexReconciliation | null;
  hooks: HookReconciliation | null;
  codexError: string | null;
  hooksError: string | null;
};
type ExportResult = { saved: boolean; fileName?: string | null };

type CockpitState = {
  tab: DiagnosticsTab;
  preset: DiagnosticPreset;
  data: DiagnosticsSummary | null;
  busy: boolean;
  error: string | null;
  notice: string | null;
  sessions: ProviderSessionEvidence;
  openProviders: Set<"codex" | "claude" | "gemini" | "custom">;
};

const state: CockpitState = {
  tab: "overview",
  preset: "30d",
  data: null,
  busy: false,
  error: null,
  notice: null,
  sessions: { codex: null, hooks: null, codexError: null, hooksError: null },
  openProviders: new Set(["codex"]),
};
let projectActivationGeneration = 0;

const lang = <T>(en: T, de: T): T => getLanguage() === "de" ? de : en;
const diagnosticsErrorCopy = (kind: "load" | "export"): string => kind === "export"
  ? lang(
      "The diagnostics export could not be saved. Existing diagnostics were kept; try again.",
      "Der Diagnose-Export konnte nicht gespeichert werden. Bestehende Diagnosedaten wurden beibehalten; versuche es erneut.",
    )
  : lang(
      "Diagnostics could not be loaded. Check the local connection and try again.",
      "Die Diagnose konnte nicht geladen werden. Prüfe die lokale Verbindung und versuche es erneut.",
    );
const number = (value: number) => new Intl.NumberFormat(getLanguage() === "de" ? "de-DE" : "en-US").format(value);
const esc = (value: string) => value.replace(/[&<>'\"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '\"': "&quot;",
})[character] ?? character);
const percentage = (part: number, total: number) => total > 0 ? Math.round((part / total) * 100) : null;
const pct = (value: number | null) => value === null ? "—" : `${value} %`;
const sumUnknownTotals = (dimension: ObservedAttributionDimension) => dimension.groups.reduce((sum, group) => sum + group.unknownTotalTokenEvents, 0);
const presetLabel = (preset: DiagnosticPreset) => ({
  "1d": lang("Last 24 hours", "Letzte 24 Stunden"),
  "7d": lang("Last 7 days", "Letzte 7 Tage"),
  "30d": lang("Last 30 days", "Letzte 30 Tage"),
  "90d": lang("Last 90 days", "Letzte 90 Tage"),
  all: lang("All locally available evidence", "Alle lokal verfügbaren Evidenzen"),
})[preset];

const providerName = (provider: "codex" | "claude" | "gemini" | "custom") => ({
  codex: "Codex",
  claude: "Claude",
  gemini: "Gemini",
  custom: lang("Custom", "Eigene Verbindung"),
})[provider];

const providerVendor = (provider: "codex" | "claude" | "gemini" | "custom") => ({
  codex: "OpenAI",
  claude: "Anthropic",
  gemini: "Google",
  custom: lang("Custom bridge", "Eigene Bridge"),
})[provider];

const belongsToDiagnosticsProject = (project: ProviderProjectDescriptor | null, projectId: string) =>
  project !== null && (project.projectId === projectId || project.stableProjectIdentity === projectId);

const shortId = (value: string) => value.length > 22 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
const formatObservedAt = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat(getLanguage() === "de" ? "de-DE" : "en-US", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(parsed);
};

async function refreshSessionEvidence(): Promise<void> {
  const [codex, hooks] = await Promise.allSettled([
    invoke<CodexReconciliation>("reconcile_codex_provider_sessions"),
    invoke<HookReconciliation>("reconcile_provider_hook_sessions"),
  ]);
  if (codex.status === "fulfilled") {
    state.sessions.codex = codex.value;
    state.sessions.codexError = null;
  } else {
    state.sessions.codexError = codex.reason instanceof Error ? codex.reason.message : String(codex.reason);
  }
  if (hooks.status === "fulfilled") {
    state.sessions.hooks = hooks.value;
    state.sessions.hooksError = null;
  } else {
    state.sessions.hooksError = hooks.reason instanceof Error ? hooks.reason.message : String(hooks.reason);
  }
}

const telemetryStateLabel = (state: DiagnosticsTelemetryProviderState["state"]) => ({
  supported: lang("Included", "Enthalten"),
  "supported-opt-in": lang("Opt-in available", "Opt-in verfügbar"),
  "mcp-session-only": lang("No usage telemetry", "Keine Usage-Telemetrie"),
  "provider-capable-not-integrated": lang("Provider can expose it · not integrated", "Provider kann sie liefern · nicht integriert"),
  "not-integrated": lang("Not integrated", "Nicht integriert"),
  "bridge-dependent": lang("Bridge-dependent", "Bridge-abhängig"),
})[state];

const renderTelemetryCoverage = (coverage: DiagnosticsTelemetryCoverage) => {
  const rows = (["codex", "claude", "gemini", "custom"] as const).map((provider) => {
    const value = coverage.providers[provider];
    const name = provider === "codex" ? "Codex" : provider === "claude" ? "Claude" : provider === "gemini" ? "Gemini" : "Custom";
    return `<div class="dc-telemetry-provider"><strong>${name}</strong><span>${telemetryStateLabel(value.state)}</span></div>`;
  }).join("");
  return `<section class="dc-telemetry-coverage">
    <div>
      <span>${lang("Telemetry coverage", "Telemetrie-Abdeckung")}</span>
      <strong>${lang("These diagnostics currently include only qualified provider-owned usage evidence.", "Diese Diagnose enthält aktuell nur qualifizierte provider-eigene Usage-Evidence.")}</strong>
      <p>${lang("A provider being connected does not mean its token or usage data is included. Missing provider telemetry stays missing.", "Eine Provider-Verbindung bedeutet nicht, dass deren Token- oder Usage-Daten enthalten sind. Fehlende Provider-Telemetrie bleibt fehlend.")}</p>
    </div>
    <div class="dc-telemetry-provider-grid">${rows}</div>
  </section>`;
};

const rankGroups = (groups: ObservedAttributionGroup[], limit = 5) => {
  const tokenKnown = groups.some((group) => group.knownTotalTokenEvents > 0 && group.totalTokens > 0);
  const sorted = [...groups].sort((a, b) => tokenKnown ? b.totalTokens - a.totalTokens : b.eventCount - a.eventCount);
  const total = sorted.reduce((sum, group) => sum + (tokenKnown ? group.totalTokens : group.eventCount), 0);
  return { tokenKnown, total, groups: sorted.slice(0, limit) };
};

const renderRankedBreakdown = (title: string, subtitle: string, dimension: ObservedAttributionDimension) => {
  const ranked = rankGroups(dimension.groups);
  if (!ranked.groups.length) {
    return `<article class="dc-panel dc-ranking"><div class="dc-panel-head"><div><h3>${title}</h3><p>${subtitle}</p></div></div><div class="dc-empty">${lang("No attribution evidence available.", "Keine Zuordnungs-Evidence verfügbar.")}</div></article>`;
  }
  return `<article class="dc-panel dc-ranking">
    <div class="dc-panel-head"><div><h3>${title}</h3><p>${subtitle}</p></div><span class="dc-mini-pill">${ranked.tokenKnown ? lang("Tokens", "Tokens") : lang("Events", "Ereignisse")}</span></div>
    <div class="dc-rank-list">${ranked.groups.map((group) => {
      const metric = ranked.tokenKnown ? group.totalTokens : group.eventCount;
      const share = percentage(metric, ranked.total) ?? 0;
      return `<div class="dc-rank-row"><div class="dc-rank-copy"><strong>${esc(group.value)}</strong><span>${ranked.tokenKnown ? `${number(group.totalTokens)} Tokens` : `${number(group.eventCount)} ${lang("events", "Ereignisse")}`}</span></div><div class="dc-rank-track"><i style="width:${share}%"></i></div><b>${share}%</b></div>`;
    }).join("")}</div>
  </article>`;
};

const renderComposition = (data: DiagnosticsSummary) => {
  const values = [
    [lang("Input", "Input"), data.observed.inputTokens, "input"],
    [lang("Output", "Output"), data.observed.outputTokens, "output"],
    [lang("Cache read", "Cache Read"), data.observed.cacheReadTokens, "cache-read"],
    [lang("Cache write", "Cache Write"), data.observed.cacheWriteTokens, "cache-write"],
    [lang("Reasoning", "Reasoning"), data.observed.reasoningTokens, "reasoning"],
  ] as const;
  const sum = values.reduce((total, [, value]) => total + value, 0);
  return `<article class="dc-panel dc-composition"><div class="dc-panel-head"><div><h3>${lang("Token composition", "Token-Zusammensetzung")}</h3><p>${lang("How observed token evidence is composed.", "Woraus sich die beobachtete Token-Evidence zusammensetzt.")}</p></div><strong>${number(data.observed.totalTokens)}</strong></div>
    <div class="dc-composition-track" aria-label="${lang("Observed token composition", "Zusammensetzung der beobachteten Tokens")}">${values.map(([, value, tone]) => `<span class="${tone}" style="width:${sum > 0 ? (value / sum) * 100 : 0}%"></span>`).join("")}</div>
    <div class="dc-composition-list">${values.map(([label, value, tone]) => `<div><span class="dc-dot ${tone}"></span><strong>${label}</strong><b>${number(value)}</b><small>${sum > 0 ? `${Math.round((value / sum) * 100)} %` : "—"}</small></div>`).join("")}</div>
  </article>`;
};

const renderQuality = (data: DiagnosticsSummary) => {
  const known = data.observed.knownFieldCount;
  const unknown = data.observed.unknownFieldCount;
  const total = known + unknown;
  const knownPct = percentage(known, total);
  const task = data.attribution.taskId;
  const taskTotal = task.attributedEventCount + task.unattributedEventCount;
  const taskPct = percentage(task.attributedEventCount, taskTotal);
  return `<div class="dc-quality-grid">
    <article class="dc-panel dc-quality"><div class="dc-panel-head"><div><h3>${lang("Measurement quality", "Messqualität")}</h3><p>${lang("How complete are the reported measurement fields?", "Wie vollständig sind die gemeldeten Messfelder?")}</p></div><strong>${pct(knownPct)}</strong></div><div class="dc-quality-track"><i class="known" style="width:${knownPct ?? 0}%"></i><i class="unknown" style="width:${unknown > 0 && total > 0 ? (unknown / total) * 100 : 0}%"></i></div><div class="dc-quality-legend"><span><i class="known"></i>${number(known)} ${lang("known", "bekannt")}</span><span><i class="unknown"></i>${number(unknown)} ${lang("unknown", "unbekannt")}</span></div></article>
    <article class="dc-panel dc-quality"><div class="dc-panel-head"><div><h3>${lang("Task attribution", "Task-Zuordnung")}</h3><p>${lang("How many observed events can be assigned to a task?", "Wie viele beobachtete Ereignisse lassen sich einem Task zuordnen?")}</p></div><strong>${pct(taskPct)}</strong></div><div class="dc-quality-track"><i class="assigned" style="width:${taskPct ?? 0}%"></i><i class="unassigned" style="width:${task.unattributedEventCount > 0 && taskTotal > 0 ? (task.unattributedEventCount / taskTotal) * 100 : 0}%"></i></div><div class="dc-quality-legend"><span><i class="assigned"></i>${number(task.attributedEventCount)} ${lang("assigned", "zugeordnet")}</span><span><i class="unassigned"></i>${number(task.unattributedEventCount)} ${lang("without task", "ohne Task")}</span></div></article>
  </div>`;
};

const renderFindings = (data: DiagnosticsSummary) => {
  const findings: { tone: string; text: string }[] = [];
  const projectUnattributed = data.scope.unattributedEventCount;
  const taskMissing = data.attribution.taskId.unattributedEventCount;
  const modelMissing = data.attribution.model.unattributedEventCount;
  const providerUnknown = sumUnknownTotals(data.attribution.provider);
  if (projectUnattributed > 0) findings.push({
    tone: "info",
    text: lang(
      `${number(projectUnattributed)} diagnostic events in this period have no project attribution and are excluded from this project view.`,
      `${number(projectUnattributed)} Diagnose-Ereignisse in diesem Zeitraum besitzen keine Projektzuordnung und werden in dieser Projektansicht nicht eingerechnet.`,
    ),
  });
  if (taskMissing > 0) findings.push({ tone: "warning", text: lang(`${number(taskMissing)} observed events have no task attribution.`, `${number(taskMissing)} beobachtete Ereignisse besitzen keine Task-Zuordnung.`) });
  if (modelMissing > 0) findings.push({ tone: "info", text: lang(`${number(modelMissing)} observed events have no model attribution.`, `${number(modelMissing)} beobachtete Ereignisse besitzen keine Modell-Zuordnung.`) });
  if (providerUnknown > 0) findings.push({ tone: "info", text: lang(`${number(providerUnknown)} provider-attributed events have no explicit total-token value.`, `${number(providerUnknown)} dem Provider zugeordnete Ereignisse besitzen keinen expliziten Gesamt-Tokenwert.`) });
  const projects = rankGroups(data.attribution.projectId.groups, 1);
  if (projects.tokenKnown && projects.total > 0 && projects.groups[0]) {
    const top = projects.groups[0];
    const share = percentage(top.totalTokens, projects.total);
    if (share !== null) findings.push({ tone: "brand", text: lang(`Project “${top.value}” accounts for ${share}% of attributed measured token usage.`, `Projekt „${top.value}“ steht für ${share} % der zugeordneten gemessenen Token-Nutzung.`) });
  }
  if (!findings.length) findings.push({ tone: "neutral", text: lang("No deterministic findings can be derived from the current evidence.", "Aus der aktuellen Evidence lassen sich keine zusätzlichen deterministischen Hinweise ableiten.") });
  return `<article class="dc-panel dc-findings"><div class="dc-panel-head"><div><h3>${lang("Important findings", "Wichtige Erkenntnisse")}</h3><p>${lang("Only statements directly supported by retained evidence.", "Nur Aussagen, die direkt durch gespeicherte Evidence gestützt werden.")}</p></div></div><div class="dc-findings-list">${findings.map((finding) => `<div class="${finding.tone}"><span></span><p>${esc(finding.text)}</p></div>`).join("")}</div></article>`;
};

const renderEvidenceClasses = (data: DiagnosticsSummary) => `<div class="dc-evidence-grid">
  <article class="dc-evidence observed"><span>${lang("Observed", "Observed")}</span><strong>${number(data.observed.totalTokens)} Tokens</strong><p>${lang("Direct provider/runtime evidence.", "Direkte Provider-/Runtime-Evidence.")}</p></article>
  <article class="dc-evidence avoided"><span>${lang("Avoided", "Avoided")}</span><strong>${number(data.avoided.contextTokens)} Tokens</strong><p>${lang("Context recorded as avoided by qualified evidence.", "Kontext, der durch qualifizierte Evidence als vermieden erfasst wurde.")}</p></article>
  <article class="dc-evidence estimated"><span>${lang("Estimated", "Estimated")}</span><strong>${number(data.estimated.tokens)} Tokens</strong><p>${lang("Modeled values; never merged into Observed.", "Modellierte Werte; niemals mit Observed vermischt.")}</p></article>
</div>`;

const renderAttributionDimension = (title: string, dimension: ObservedAttributionDimension) => {
  const total = dimension.attributedEventCount + dimension.unattributedEventCount;
  const coverage = percentage(dimension.attributedEventCount, total);
  const ranked = rankGroups(dimension.groups, 8);
  return `<article class="dc-panel dc-attribution-card"><div class="dc-panel-head"><div><h3>${title}</h3><p>${number(dimension.attributedEventCount)} ${lang("assigned", "zugeordnet")} · ${number(dimension.unattributedEventCount)} ${lang("unassigned", "nicht zugeordnet")}</p></div><strong>${pct(coverage)}</strong></div><div class="dc-quality-track"><i class="assigned" style="width:${coverage ?? 0}%"></i><i class="unassigned" style="width:${coverage === null ? 0 : 100 - coverage}%"></i></div>${ranked.groups.length ? `<div class="dc-compact-groups">${ranked.groups.map((group) => `<div><strong>${esc(group.value)}</strong><span>${number(group.eventCount)} ${lang("events", "Ereignisse")}</span><b>${group.knownTotalTokenEvents > 0 ? `${number(group.totalTokens)} Tokens` : lang("Token total unknown", "Token-Summe unbekannt")}</b></div>`).join("")}</div>` : `<div class="dc-empty">${lang("No grouped attribution available.", "Keine gruppierte Zuordnung verfügbar.")}</div>`}</article>`;
};

const renderOverview = (data: DiagnosticsSummary) => {
  if (!data.hasObservedData) {
    return `<section class="dc-view dc-overview">
      <div class="dc-hero empty"><div class="dc-hero-icon">–</div><div class="dc-hero-copy"><span>${lang("No observed diagnostic evidence", "Keine beobachteten Diagnosedaten")}</span><h2>${lang("No observed activities in the selected period", "Keine beobachteten Aktivitäten im gewählten Zeitraum")}</h2><p>${lang("Livariant has no qualified observed usage data for this project and period. This does not mean connected providers had zero usage; provider telemetry that Livariant cannot ingest remains unknown.", "Für dieses Projekt und diesen Zeitraum liegen keine qualifizierten beobachteten Nutzungsdaten vor. Das bedeutet nicht, dass verbundene Provider keine Nutzung hatten; nicht ingestierbare Provider-Telemetrie bleibt unbekannt.")}</p></div><div class="dc-hero-facts"><div><small>${lang("Known measurement data", "Bekannte Messdaten")}</small><strong>—</strong></div><div><small>${lang("Linked to a task", "Einer Aufgabe zugeordnet")}</small><strong>—</strong></div></div></div>
    </section>`;
  }
  const fieldTotal = data.observed.knownFieldCount + data.observed.unknownFieldCount;
  const measurementCoverage = percentage(data.observed.knownFieldCount, fieldTotal);
  const taskTotal = data.attribution.taskId.attributedEventCount + data.attribution.taskId.unattributedEventCount;
  const taskCoverage = percentage(data.attribution.taskId.attributedEventCount, taskTotal);
  return `<section class="dc-view dc-overview">
    <div class="dc-hero"><div class="dc-hero-icon">✓</div><div class="dc-hero-copy"><span>${lang("What Livariant actually observed", "Was Livariant tatsächlich beobachtet hat")}</span><h2>${number(data.observed.eventCount)} ${lang("recorded AI events in the selected period", "erfasste KI-Ereignisse im gewählten Zeitraum")}</h2><p>${lang("This page shows only what Livariant could really measure or attribute. Missing information stays unknown instead of being turned into a false success or zero.", "Diese Seite zeigt nur, was Livariant wirklich messen oder zuordnen konnte. Fehlende Informationen bleiben unbekannt, statt zu einem falschen Erfolg oder einer künstlichen Null zu werden.")}</p></div><div class="dc-hero-facts"><div><small>${lang("Known measurement data", "Bekannte Messdaten")}</small><strong>${pct(measurementCoverage)}</strong></div><div><small>${lang("Linked to a task", "Einer Aufgabe zugeordnet")}</small><strong>${pct(taskCoverage)}</strong></div></div></div>
    <div class="dc-metrics"><article><span>⌁</span><small>${lang("Recorded events", "Erfasste Ereignisse")}</small><strong>${number(data.observed.eventCount)}</strong></article><article><span>◇</span><small>${lang("Total tokens", "Gesamttokens")}</small><strong>${number(data.observed.totalTokens)}</strong></article><article><span>◎</span><small>${lang("Known data fields", "Bekannte Datenfelder")}</small><strong>${pct(measurementCoverage)}</strong></article><article><span>ↄ</span><small>${lang("Without task attribution", "Ohne Task-Zuordnung")}</small><strong>${number(data.attribution.taskId.unattributedEventCount)}</strong></article></div>
    <div class="dc-grid-main">${renderComposition(data)}<article class="dc-panel dc-evidence-summary"><div class="dc-panel-head"><div><h3>${lang("What kind of information is this?", "Welche Art von Information ist das?")}</h3><p>${lang("Measured, avoided and estimated values stay separate so you can see what is fact and what is only a modelled value.", "Gemessene, vermiedene und geschätzte Werte bleiben getrennt, damit erkennbar bleibt, was beobachtet wurde und was nur modelliert ist.")}</p></div></div>${renderEvidenceClasses(data)}</article></div>
    <div class="dc-grid-2">${renderRankedBreakdown(lang("Usage by provider", "Nutzung nach Provider"), lang("Only providers present in retained evidence.", "Nur Provider aus den gespeicherten Nachweisen."), data.attribution.provider)}${renderRankedBreakdown(lang("Usage by project", "Nutzung nach Projekt"), lang("Top projects by measured attributed usage.", "Top-Projekte nach gemessener zugeordneter Nutzung."), data.attribution.projectId)}</div>
    ${renderQuality(data)}
    ${renderFindings(data)}
  </section>`;
};

const renderUsage = (data: DiagnosticsSummary) => `<section class="dc-view"><div class="dc-section-intro"><div><span>${lang("Usage", "Nutzung")}</span><h2>${lang("What the recorded AI usage consists of", "Woraus die erfasste KI-Nutzung besteht")}</h2><p>${lang("These numbers describe recorded usage, not project progress, quality or money saved.", "Diese Zahlen beschreiben erfasste Nutzung – nicht Projektfortschritt, Qualität oder eingespartes Geld.")}</p></div></div><div class="dc-grid-main">${renderComposition(data)}<article class="dc-panel dc-evidence-summary"><div class="dc-panel-head"><div><h3>${lang("Observed / Avoided / Estimated", "Observed / Avoided / Estimated")}</h3></div></div>${renderEvidenceClasses(data)}</article></div><div class="dc-grid-2">${renderRankedBreakdown(lang("Provider", "Provider"), lang("Measured attribution by provider.", "Gemessene Zuordnung nach Provider."), data.attribution.provider)}${renderRankedBreakdown(lang("Projects", "Projekte"), lang("Measured attribution by project.", "Gemessene Zuordnung nach Projekt."), data.attribution.projectId)}</div>${renderRankedBreakdown(lang("Models", "Modelle"), lang("Model names appear only when reported by evidence.", "Modellnamen erscheinen nur, wenn sie durch Evidence gemeldet werden."), data.attribution.model)}</section>`;

const renderSessionRows = (provider: "codex" | "claude" | "gemini", data: DiagnosticsSummary) => {
  if (provider === "codex") {
    const reconciliation = state.sessions.codex;
    if (!reconciliation) {
      return `<div class="dc-session-empty">${esc(state.sessions.codexError ?? lang("Session evidence has not been loaded yet.", "Session-Evidence wurde noch nicht geladen."))}</div>`;
    }
    if (reconciliation.state !== "ready") {
      return `<div class="dc-session-empty">${esc(reconciliation.detail || lang("Codex session evidence is unavailable.", "Codex-Session-Evidence ist nicht verfügbar."))}</div>`;
    }
    const renderCodexRows = (rows: CodexSessionBinding[]) => `<div class="dc-session-list">${rows.map((binding) => `<article class="dc-session-row">
      <div><small>${lang("Thread", "Thread")}</small><strong title="${esc(binding.threadId)}">${esc(shortId(binding.threadId))}</strong></div>
      <div><small>${lang("Session", "Sitzung")}</small><strong title="${esc(binding.sessionId)}">${esc(shortId(binding.sessionId))}</strong></div>
      <div><small>cwd</small><strong title="${esc(binding.cwd)}">${esc(binding.cwd)}</strong></div>
      <span class="dc-session-state ${binding.attribution === "unattributed" ? "warn" : "ok"}">${binding.attribution === "cwd-exact" ? lang("Exact project", "Exaktes Projekt") : binding.attribution === "cwd-descendant" ? lang("Project subtree", "Projekt-Unterordner") : lang("Unattributed", "Nicht zugeordnet")}</span>
    </article>`).join("")}</div>`;
    const current = reconciliation.bindings.filter((binding) => belongsToDiagnosticsProject(binding.project, data.scope.projectId));
    const other = reconciliation.bindings.filter((binding) => binding.project !== null && !belongsToDiagnosticsProject(binding.project, data.scope.projectId));
    const unattributed = reconciliation.bindings.filter((binding) => binding.project === null);
    const currentBody = current.length
      ? renderCodexRows(current)
      : `<div class="dc-session-empty">${lang("No Codex sessions are currently attributable to this project.", "Aktuell lassen sich diesem Projekt keine Codex-Sessions zuordnen.")}</div>`;
    const diagnosticsGroups = [
      other.length ? `<details class="dc-session-diagnostic-group"><summary><span>${lang("Other registered projects", "Andere registrierte Projekte")}</span><strong>${other.length}</strong><i>⌄</i></summary><div>${renderCodexRows(other)}</div></details>` : "",
      unattributed.length ? `<details class="dc-session-diagnostic-group warning"><summary><span>${lang("Unattributed provider threads", "Nicht zugeordnete Provider-Threads")}</span><strong>${unattributed.length}</strong><i>⌄</i></summary><div>${renderCodexRows(unattributed)}</div></details>` : "",
    ].join("");
    const catalogSummary = `<div class="dc-session-catalog-summary"><span>${lang("Provider catalog", "Provider-Katalog")}</span><strong>${reconciliation.bindings.length} ${lang("threads", "Threads")}</strong><small>${current.length} ${lang("this project", "dieses Projekt")} · ${other.length} ${lang("other projects", "andere Projekte")} · ${unattributed.length} ${lang("unattributed", "nicht zugeordnet")}</small></div>`;
    return `${catalogSummary}${currentBody}${diagnosticsGroups}`;
  }

  const reconciliation = state.sessions.hooks;
  if (!reconciliation) {
    return `<div class="dc-session-empty">${esc(state.sessions.hooksError ?? lang("No hook reconciliation evidence has been loaded yet.", "Es wurde noch keine Hook-Reconciliation-Evidence geladen."))}</div>`;
  }
  const rows = reconciliation.bindings.filter((binding) => binding.provider === provider && belongsToDiagnosticsProject(binding.project, data.scope.projectId));
  if (!rows.length) {
    return `<div class="dc-session-empty">${provider === "claude"
      ? lang("No Claude hook sessions are currently attributable to this project. Live MCP isolation can still work without hook evidence.", "Aktuell lassen sich diesem Projekt keine Claude-Hook-Sessions zuordnen. Die Live-MCP-Trennung kann trotzdem ohne Hook-Evidence funktionieren.")
      : lang("No Gemini hook sessions are currently attributable to this project. Hook evidence appears only after the provider hook is configured and emits it.", "Aktuell lassen sich diesem Projekt keine Gemini-Hook-Sessions zuordnen. Hook-Evidence erscheint erst, wenn der Provider-Hook eingerichtet ist und Daten liefert.")}</div>`;
  }
  return `<div class="dc-session-list">${rows.map((binding) => `<article class="dc-session-row">
    <div><small>${lang("Session", "Sitzung")}</small><strong title="${esc(binding.sessionId)}">${esc(shortId(binding.sessionId))}</strong></div>
    <div><small>cwd</small><strong title="${esc(binding.cwdEvidence.join(" · "))}">${esc(binding.cwdEvidence[0] ?? "—")}</strong></div>
    <div><small>${lang("Last evidence", "Letzte Evidence")}</small><strong>${esc(formatObservedAt(binding.latestObservedAt))}</strong></div>
    <span class="dc-session-state ${binding.attribution === "cwd-consistent" ? "ok" : "warn"}">${binding.attribution === "cwd-consistent" ? lang("Project matched", "Projekt zugeordnet") : binding.attribution === "mixed-projects" ? lang("Mixed projects", "Gemischte Projekte") : lang("Unattributed", "Nicht zugeordnet")}</span>
    ${binding.transcriptPaths.length ? `<div class="dc-session-transcript"><small>Transcript</small><span title="${esc(binding.transcriptPaths.join(" · "))}">${esc(binding.transcriptPaths[0]!)}</span></div>` : ""}
  </article>`).join("")}</div>`;
};

const renderProviderAccordion = (provider: "codex" | "claude" | "gemini" | "custom", data: DiagnosticsSummary) => {
  const open = state.openProviders.has(provider);
  const status = provider === "codex"
    ? (state.sessions.codex?.state === "ready" ? lang("Provider threads", "Provider-Threads") : lang("Unavailable / loading", "Nicht verfügbar / lädt"))
    : provider === "custom"
      ? lang("Bridge-dependent", "Bridge-abhängig")
      : lang("Hook + MCP evidence", "Hook- + MCP-Evidence");
  const body = provider === "custom"
    ? `<div class="dc-session-empty">${lang("Custom connections expose session evidence only when their bridge declares and implements it. Livariant does not invent missing session history.", "Eigene Verbindungen liefern Session-Evidence nur, wenn ihre Bridge diese Fähigkeit deklariert und implementiert. Livariant erfindet keine fehlende Session-Historie.")}</div>`
    : renderSessionRows(provider, data);
  return `<details class="dc-provider-accordion" data-dc-provider="${provider}" ${open ? "open" : ""}>
    <summary>
      <span class="dc-provider-brand">${providerBrandLogo(provider)}<span><small>${providerVendor(provider)}</small><strong>${providerName(provider)}</strong></span></span>
      <span class="dc-provider-accordion-meta"><span>${status}</span><i>⌄</i></span>
    </summary>
    <div class="dc-provider-accordion-body">${body}</div>
  </details>`;
};

const renderSessions = (data: DiagnosticsSummary) => `<section class="dc-view dc-sessions-view">
  <div class="dc-section-intro"><div><span>${lang("Live provider evidence", "Live-Provider-Evidence")}</span><h2>${lang("Which real provider sessions belong to this project?", "Welche echten Provider-Sessions gehören zu diesem Projekt?")}</h2><p>${lang("This view uses provider/session evidence, not the temporary diagnostics measurement thread. Desktop project selection only filters the view; it does not define provider routing.", "Diese Ansicht nutzt Provider-/Session-Evidence und nicht den temporären Diagnose-Mess-Thread. Die Desktop-Projektauswahl filtert nur die Ansicht; sie definiert nicht das Provider-Routing.")}</p></div><span class="dc-live-pill"><i></i>${lang("Live reconciliation", "Live-Reconciliation")}</span></div>
  <div class="dc-provider-accordions">${(["codex","claude","gemini","custom"] as const).map((provider) => renderProviderAccordion(provider, data)).join("")}</div>
  <div class="dc-session-footnote">${lang("Codex can be reconstructed from provider-owned persisted thread metadata. Claude/Gemini retrospective evidence depends on configured provider hooks. Unknown history remains unknown.", "Codex kann aus provider-eigenen gespeicherten Thread-Metadaten rekonstruiert werden. Nachträgliche Claude-/Gemini-Evidence hängt von eingerichteten Provider-Hooks ab. Unbekannte Historie bleibt unbekannt.")}</div>
</section>`;

const renderAttribution = (data: DiagnosticsSummary) => `<section class="dc-view"><div class="dc-section-intro"><div><span>${lang("Where the data belongs", "Wozu die Daten gehören")}</span><h2>${lang("Can Livariant connect recorded usage to the right project, session and task?", "Kann Livariant die erfasste Nutzung dem richtigen Projekt, der richtigen Sitzung und Aufgabe zuordnen?")}</h2><p>${lang("Anything Livariant cannot assign remains visibly unassigned instead of disappearing from the picture.", "Was Livariant nicht zuordnen kann, bleibt sichtbar unzugeordnet, statt aus dem Bild zu verschwinden.")}</p></div></div><div class="dc-attribution-grid">${renderAttributionDimension("Provider", data.attribution.provider)}${renderAttributionDimension(lang("Model", "Modell"), data.attribution.model)}${renderAttributionDimension(lang("Project", "Projekt"), data.attribution.projectId)}${renderAttributionDimension(lang("Session", "Sitzung"), data.attribution.sessionId)}${renderAttributionDimension(lang("Task", "Aufgabe"), data.attribution.taskId)}</div></section>`;

const renderDetails = (data: DiagnosticsSummary) => `<section class="dc-view"><div class="dc-section-intro"><div><span>${lang("Details", "Details")}</span><h2>${lang("How to interpret these measurements", "Wie diese Messwerte zu verstehen sind")}</h2></div></div><div class="dc-details-grid"><article class="dc-panel"><h3>${lang("Evidence boundary", "Evidence-Grenze")}</h3><dl><div><dt>Observed</dt><dd>${lang("Direct provider/runtime-owned observations.", "Direkte provider-/runtime-eigene Beobachtungen.")}</dd></div><div><dt>Avoided</dt><dd>${lang("Context that qualified host evidence records as not needed.", "Kontext, den qualifizierte Host-Evidence als nicht benötigt erfasst.")}</dd></div><div><dt>Estimated</dt><dd>${lang("Modeled values; not direct measurement.", "Modellierte Werte; keine direkte Messung.")}</dd></div><div><dt>${lang("Unknown", "Unbekannt")}</dt><dd>${lang("Missing evidence stays unknown and is never replaced by synthetic zero.", "Fehlende Evidence bleibt unbekannt und wird nie durch eine künstliche Null ersetzt.")}</dd></div></dl></article><article class="dc-panel"><h3>${lang("Current measurement", "Aktuelle Messung")}</h3><dl><div><dt>${lang("Period", "Zeitraum")}</dt><dd>${presetLabel(state.preset)}</dd></div><div><dt>${lang("Storage", "Speicher")}</dt><dd>${esc(data.storage || lang("Not exposed", "Nicht verfügbar"))}</dd></div><div><dt>${lang("Raw prompt capture", "Rohprompt-Erfassung")}</dt><dd>${lang("Not captured by default.", "Standardmäßig nicht erfasst.")}</dd></div><div><dt>${lang("Time series", "Zeitverlauf")}</dt><dd>${lang("Not exposed by the current aggregate contract.", "Vom aktuellen aggregierten Vertrag nicht bereitgestellt.")}</dd></div></dl></article></div><article class="dc-panel dc-definition-panel"><h3>${lang("Token field definitions", "Definitionen der Token-Felder")}</h3><div class="dc-definitions"><div><strong>Input</strong><span>${lang("Provider input tokens where reported.", "Vom Provider gemeldete Input-Tokens, sofern verfügbar.")}</span></div><div><strong>Output</strong><span>${lang("Provider output tokens where reported.", "Vom Provider gemeldete Output-Tokens, sofern verfügbar.")}</span></div><div><strong>Cache Read</strong><span>${lang("Cache-read input evidence; not automatically money or time saved.", "Cache-Read-Evidence; nicht automatisch eingespartes Geld oder Zeit.")}</span></div><div><strong>Cache Write</strong><span>${lang("Cache-write token evidence where reported.", "Cache-Write-Token-Evidence, sofern gemeldet.")}</span></div><div><strong>Reasoning</strong><span>${lang("Reasoning-token evidence where available; missing remains unknown.", "Reasoning-Token-Evidence, sofern verfügbar; fehlende Werte bleiben unbekannt.")}</span></div></div></article></section>`;

const renderTabs = () => ([
  ["overview", lang("Overview", "Übersicht")],
  ["sessions", lang("Live sessions", "Live-Sessions")],
  ["usage", lang("Usage", "Nutzung")],
  ["attribution", lang("Attribution", "Zuordnung")],
  ["details", lang("Details", "Details")],
] as const).map(([tab, label]) => `<button type="button" class="dc-tab ${state.tab === tab ? "active" : ""}" data-dc-tab="${tab}">${label}</button>`).join("");

const renderBody = (data: DiagnosticsSummary) => state.tab === "sessions" ? renderSessions(data) : state.tab === "usage" ? renderUsage(data) : state.tab === "attribution" ? renderAttribution(data) : state.tab === "details" ? renderDetails(data) : renderOverview(data);

const renderCockpit = (surface: HTMLElement) => {
  if (!state.data) return;
  surface.innerHTML = `<div class="dc-shell"><header class="dc-header"><div><span class="dc-kicker">${lang("Measured evidence", "Gemessene Evidence")}</span><h1>${lang("Diagnostics", "Diagnose")}</h1><p>${lang("Understand how Livariant worked, what was observed and where evidence is incomplete.", "Verstehe, wie Livariant gearbeitet hat, was beobachtet wurde und wo Evidence unvollständig ist.")}</p></div><div class="dc-header-actions"><select class="dc-preset" aria-label="${lang("Diagnostics period", "Diagnosezeitraum")}" ${state.busy ? "disabled" : ""}>${(["1d","7d","30d","90d","all"] as DiagnosticPreset[]).map((preset) => `<option value="${preset}" ${state.preset === preset ? "selected" : ""}>${presetLabel(preset)}</option>`).join("")}</select><button type="button" class="button secondary dc-export" ${state.busy ? "disabled" : ""}>${lang("Export", "Exportieren")}</button><button type="button" class="button secondary dc-refresh" ${state.busy ? "disabled" : ""}>${state.busy ? lang("Refreshing…", "Aktualisiere…") : lang("Refresh", "Aktualisieren")}</button></div></header>${renderTelemetryCoverage(state.data.telemetryCoverage)}<nav class="dc-tabs" aria-label="${lang("Diagnostics sections", "Diagnosebereiche")}">${renderTabs()}</nav>${state.notice ? `<div class="dc-notice">${esc(state.notice)}</div>` : ""}${state.error ? `<div class="dc-error">${esc(state.error)}</div>` : ""}${renderBody(state.data)}<footer class="dc-footer">${lang("Observed ≠ Avoided ≠ Estimated. Unknown remains unknown.", "Observed ≠ Avoided ≠ Estimated. Unbekannt bleibt unbekannt.")}</footer></div>`;
  bind(surface);
};

const load = async (surface: HTMLElement) => {
  const generation = projectActivationGeneration;
  state.busy = true;
  state.error = null;
  state.notice = null;

  // Initial mount may show a bounded loading state. Subsequent refreshes keep the
  // existing cockpit visible so refreshing data never blanks or swaps the UI.
  if (state.data) renderCockpit(surface);
  else surface.innerHTML = `<div class="dc-loading"><span></span><strong>${lang("Loading diagnostic evidence…", "Lade Diagnose-Evidence…")}</strong></div>`;

  try {
    const [next] = await Promise.all([
      invoke<DiagnosticsSummary>("codex_diagnostics_summary", { preset: state.preset }),
      refreshSessionEvidence(),
    ]);
    if (generation !== projectActivationGeneration) return;
    state.data = next;
  } catch (cause) {
    if (generation !== projectActivationGeneration) return;
    const errorCopy = diagnosticsErrorCopy("load");
    state.error = errorCopy;
    if (!state.data) {
      surface.innerHTML = `<div class="dc-error dc-error-standalone"><strong>${lang("Diagnostics could not be loaded.", "Diagnose konnte nicht geladen werden.")}</strong><p>${esc(errorCopy)}</p></div>`;
    }
  } finally {
    if (generation !== projectActivationGeneration) return;
    state.busy = false;
    if (state.data) renderCockpit(surface);
  }
};

const bind = (surface: HTMLElement) => {
  surface.querySelectorAll<HTMLButtonElement>("[data-dc-tab]").forEach((button) => button.addEventListener("click", () => {
    const tab = button.dataset.dcTab as DiagnosticsTab;
    if (!tab || tab === state.tab) return;
    state.tab = tab;
    renderCockpit(surface);
  }));
  surface.querySelectorAll<HTMLDetailsElement>("[data-dc-provider]").forEach((details) => details.addEventListener("toggle", () => {
    const provider = details.dataset.dcProvider as "codex" | "claude" | "gemini" | "custom" | undefined;
    if (!provider) return;
    if (details.open) state.openProviders.add(provider);
    else state.openProviders.delete(provider);
  }));
  surface.querySelector<HTMLSelectElement>(".dc-preset")?.addEventListener("change", (event) => {
    const next = (event.currentTarget as HTMLSelectElement).value as DiagnosticPreset;
    if (!(["1d","7d","30d","90d","all"] as string[]).includes(next)) return;
    state.preset = next;
    void load(surface);
  });
  surface.querySelector<HTMLButtonElement>(".dc-refresh")?.addEventListener("click", () => void load(surface));
  surface.querySelector<HTMLButtonElement>(".dc-export")?.addEventListener("click", async () => {
    if (state.busy) return;
    const generation = projectActivationGeneration;
    state.busy = true;
    state.notice = null;
    renderCockpit(surface);
    try {
      const result = await invoke<ExportResult>("save_codex_diagnostics_export", { preset: state.preset });
      if (generation !== projectActivationGeneration) return;
      if (result.saved) state.notice = lang(`Export saved${result.fileName ? ` as ${result.fileName}` : ""}.`, `Export gespeichert${result.fileName ? ` als ${result.fileName}` : ""}.`);
    } catch (cause) {
      if (generation !== projectActivationGeneration) return;
      state.error = diagnosticsErrorCopy("export");
    } finally {
      if (generation !== projectActivationGeneration) return;
      state.busy = false;
      renderCockpit(surface);
    }
  });
};

const mount = () => {
  const surface = document.querySelector<HTMLElement>("[data-surface='diagnostics']");
  if (!surface || surface.dataset.diagnosticsCockpit === "mounted") return;
  surface.dataset.diagnosticsCockpit = "mounted";
  const preset = surface.dataset.diagnosticsPreset as DiagnosticPreset | undefined;
  if (preset && (["1d","7d","30d","90d","all"] as string[]).includes(preset)) state.preset = preset;
  void load(surface);
};

const observer = new MutationObserver(() => mount());
observer.observe(document.documentElement, { childList: true, subtree: true });
mount();


onDesktopProjectActivated(() => {
  projectActivationGeneration += 1;
  state.data = null;
  state.busy = false;
  state.error = null;
  state.notice = null;
  state.sessions = { codex: null, hooks: null, codexError: null, hooksError: null };
  const surface = document.querySelector<HTMLElement>("[data-surface='diagnostics']");
  if (surface?.dataset.diagnosticsCockpit === "mounted") return load(surface);
});
onLanguageChange(() => {
  const surface = document.querySelector<HTMLElement>("[data-surface='diagnostics']");
  if (surface?.dataset.diagnosticsCockpit === "mounted" && state.data) renderCockpit(surface);
});


const LIVE_SESSION_REFRESH_MS = 15_000;
window.setInterval(() => {
  const surface = document.querySelector<HTMLElement>("[data-surface='diagnostics']");
  if (!surface || surface.dataset.diagnosticsCockpit !== "mounted" || !state.data) return;
  const generation = projectActivationGeneration;
  void refreshSessionEvidence().then(() => {
    if (generation !== projectActivationGeneration) return;
    if (state.tab === "sessions") renderCockpit(surface);
  });
}, LIVE_SESSION_REFRESH_MS);
