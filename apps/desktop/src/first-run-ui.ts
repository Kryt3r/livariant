import "./first-run-ui.css";
import "./first-run-ux-polish.css";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getLanguage } from "./i18n/runtime.js";
import { presentFirstRunQuestion, suggestProjectIdFromPath } from "./first-run-presentation.js";
import {
  loadFirstRunLifecycle,
  transitionFirstRunLifecycle,
  type FirstRunLifecycleAction,
  type FirstRunLifecycleSnapshot,
} from "./first-run-lifecycle.js";

type Step = "welcome" | "project" | "understanding" | "sources" | "providers" | "health" | "complete";
type Question = { id: string; topic: string; prompt: string; reason: string; state: "open" | "answered" | "skipped"; response?: string };
type RepoIdentity = { provider: "github" | "git"; repositoryId: string; displayName: string; remoteUrl?: string };
type Repo = { identity: RepoIdentity; local?: { localPath: string }; description?: string };
type FirstRunState = {
  schemaVersion: 1;
  currentStep: Step;
  completed: boolean;
  project: { projectId?: string; localRoot?: string; sourceRegistry?: { projectId: string; primary: Repo; additional: Repo[] } };
  understanding: { projectRoot: string; questions: Question[] };
  providers: { configuredProviderIds: string[]; deferred: boolean };
  health: {
    reviewed: boolean;
    readyForMainUi: boolean;
    openQuestionCount: number;
    skippedQuestionCount: number;
    hasProjectSelection: boolean;
    hasSourceRegistry: boolean;
  };
  boundaries: { onboardingEvidenceIsProjectTruth: false; grantsAuthority: false; mutationAuthorized: false; changesProjectOwnedFiles: false };
};
type CodexStatus = {
  installationState: "available" | "not-found" | "unusable";
  connected: boolean;
  version: string | null;
  detail: string;
  connectionMode?: "auto" | "manual";
};
type RepositoryInspection = {
  isRepository: boolean;
  localPath: string;
  displayName: string;
  provider: "github" | "git" | null;
  repositoryId: string | null;
  remoteUrl: string | null;
};
type RenderContext = { scrollTop: number; focusKey: string | null };

const appWindow = getCurrentWindow();
const esc = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character] ?? character);
const text = <T>(en: T, de: T): T => getLanguage() === "de" ? de : en;
const STEPS: Step[] = ["welcome", "project", "understanding", "sources", "providers", "health"];
const STEP_LABELS: Record<Step, readonly [string, string]> = {
  welcome: ["Welcome", "Willkommen"], project: ["Project", "Projekt"], understanding: ["Understanding", "Verstehen"],
  sources: ["Sources", "Quellen"], providers: ["Providers", "Anbieter"], health: ["Health check", "Abschlusscheck"], complete: ["Complete", "Fertig"],
};

function stateFrom(snapshot: FirstRunLifecycleSnapshot): FirstRunState {
  const value = snapshot.onboardingState;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(text("First-run state is unavailable.", "First-Run-Zustand ist nicht verfügbar."));
  const state = value as Partial<FirstRunState>;
  if (state.schemaVersion !== 1 || !state.project || !state.understanding || !Array.isArray(state.understanding.questions) || !state.providers || !state.health || !state.boundaries) {
    throw new Error(text("First-run state does not match the supported presentation schema.", "First-Run-Zustand entspricht nicht dem unterstützten Darstellungs-Schema."));
  }
  if (state.boundaries.onboardingEvidenceIsProjectTruth !== false || state.boundaries.grantsAuthority !== false || state.boundaries.mutationAuthorized !== false || state.boundaries.changesProjectOwnedFiles !== false) {
    throw new Error(text("First-run state attempted to weaken a protected boundary.", "First-Run-Zustand versucht eine geschützte Grenze abzuschwächen."));
  }
  return state as FirstRunState;
}

function progress(step: Step): string {
  const current = Math.max(0, STEPS.indexOf(step));
  return STEPS.map((candidate, index) => {
    const [en, de] = STEP_LABELS[candidate];
    return `<li class="${candidate === step ? "active" : index < current ? "done" : ""}"><span>${index + 1}</span><small>${text(en, de)}</small></li>`;
  }).join("");
}

function windowBar(logoUrl: string): string {
  return `<header class="window-titlebar first-run-titlebar" data-tauri-drag-region><div class="window-brand" data-tauri-drag-region><img src="${logoUrl}" alt=""/><span data-tauri-drag-region>Livariant</span></div><div class="window-controls"><button class="window-control" data-fr-window="minimize" type="button" aria-label="Minimize">−</button><button class="window-control" data-fr-window="maximize" type="button" aria-label="Maximize">□</button><button class="window-control close" data-fr-window="close" type="button" aria-label="Close">×</button></div></header>`;
}

function welcome(): string {
  return `<section class="fr-stage fr-welcome"><span class="fr-kicker">${text("First run", "Erster Start")}</span><h1>${text("Set up Livariant around your project", "Richte Livariant für dein Projekt ein")}</h1>
    <p>${text("Livariant first learns how your project is structured. It does not change project files automatically, and connected AI tools do not receive change permission just by being connected.", "Livariant lernt zuerst, wie dein Projekt aufgebaut ist. Projektdateien werden dabei nicht automatisch verändert, und verbundene KI-Werkzeuge erhalten durch die Verbindung keine Änderungsrechte.")}</p>
    <div class="fr-principles"><div><strong>${text("Unclear stays unclear", "Unklares bleibt unklar")}</strong><span>${text("If Livariant cannot determine something safely, it asks instead of guessing.", "Wenn Livariant etwas nicht sicher bestimmen kann, fragt es nach, statt zu raten.")}</span></div><div><strong>${text("You stay in control", "Du behältst die Kontrolle")}</strong><span>${text("Connections never replace the normal approval rules for changes.", "Verbindungen ersetzen niemals die normalen Freigaberegeln für Änderungen.")}</span></div><div><strong>${text("Resume later", "Später fortsetzen")}</strong><span>${text("You can leave setup incomplete and continue later.", "Du kannst die Einrichtung unvollständig lassen und später fortsetzen.")}</span></div></div>
    <div class="fr-actions"><button class="button primary" data-fr-move="project" type="button">${text("Start setup", "Einrichtung starten")}</button><button class="button secondary" data-fr-skip-all type="button">${text("Continue without full setup", "Ohne vollständige Einrichtung fortfahren")}</button></div>
    <small class="fr-footnote">${text("Missing information stays explicitly unknown until you provide or review it.", "Fehlende Informationen bleiben ausdrücklich unbekannt, bis du sie angibst oder prüfst.")}</small></section>`;
}

function project(state: FirstRunState): string {
  return `<section class="fr-stage"><span class="fr-kicker">${text("Project", "Projekt")}</span><h1>${text("Which project should Livariant understand?", "Welches Projekt soll Livariant verstehen?")}</h1>
    <p>${text("Choose an existing project folder. Livariant reads it first and does not change its files.", "Wähle einen bestehenden Projektordner. Livariant liest ihn zunächst nur aus und verändert keine Dateien.")}</p>
    <form class="fr-form" data-fr-project>
      <label><span>${text("Project ID", "Projekt-ID")}</span><input name="projectId" required value="${esc(state.project.projectId ?? "")}" placeholder="livariant"/><small>${text("Livariant suggests a stable ID from the selected folder. You can change it before saving.", "Livariant schlägt aus dem gewählten Ordner eine stabile ID vor. Du kannst sie vor dem Speichern ändern.")}</small></label>
      <label><span>${text("Local project folder", "Lokaler Projektordner")}</span><div class="fr-path-row"><input name="localRoot" required value="${esc(state.project.localRoot ?? "")}" placeholder="C:\\Projects\\my-project"/><button class="button secondary" data-fr-pick-project type="button">${text("Choose folder…", "Ordner auswählen…")}</button></div><small>${text("Livariant inspects this folder read-only and asks only where the files do not provide a clear answer.", "Livariant untersucht diesen Ordner nur lesend und fragt nur dort nach, wo die Dateien keine eindeutige Antwort liefern.")}</small></label>
      <div class="fr-actions"><button class="button secondary" data-fr-move="welcome" type="button">${text("Back", "Zurück")}</button><button class="button primary" type="submit">${text("Inspect project", "Projekt untersuchen")}</button></div>
    </form></section>`;
}

function understanding(state: FirstRunState): string {
  const cards = state.understanding.questions.map((question) => {
    const presented = presentFirstRunQuestion(question);
    return `<article class="fr-question ${question.state}" data-fr-question-card="${esc(question.id)}"><div class="fr-question-head"><div><small>${esc(presented.topic)}</small><strong>${esc(presented.prompt)}</strong></div><span>${question.state === "answered" ? text("Answered", "Beantwortet") : question.state === "skipped" ? text("Unknown / skipped", "Unbekannt / übersprungen") : text("Open", "Offen")}</span></div>
      <p>${esc(presented.reason)}</p><textarea data-fr-focus="question:${esc(question.id)}" data-fr-question-value="${esc(question.id)}" placeholder="${text("Your answer…", "Deine Antwort…")}">${esc(question.response ?? "")}</textarea>
      <div class="fr-question-actions"><button class="button secondary" data-fr-question-skip="${esc(question.id)}" type="button">${text("Skip / keep unknown", "Überspringen / unbekannt lassen")}</button><button class="button primary" data-fr-question-answer="${esc(question.id)}" type="button">${text("Save answer", "Antwort speichern")}</button></div></article>`;
  }).join("");
  return `<section class="fr-stage"><span class="fr-kicker">${text("Project understanding", "Projektverständnis")}</span><h1>${text("Clarify only what the files cannot answer", "Kläre nur, was die Dateien nicht beantworten können")}</h1>
    <p>${text("Livariant asks only where the project files do not provide a clear answer. You can skip any question; skipped information stays unknown instead of being guessed.", "Livariant fragt nur dort nach, wo die Projektdateien keine eindeutige Antwort liefern. Du kannst jede Frage überspringen; übersprungene Informationen bleiben unbekannt, statt geraten zu werden.")}</p>
    ${cards ? `<div class="fr-question-list">${cards}</div>` : `<div class="fr-empty"><strong>${text("No clarification questions are currently open.", "Aktuell sind keine Klärungsfragen offen.")}</strong><span>${text("You may continue without claiming the project is fully understood.", "Du kannst fortfahren, ohne zu behaupten, dass das Projekt vollständig verstanden ist.")}</span></div>`}
    <div class="fr-actions"><button class="button secondary" data-fr-move="project" type="button">${text("Back", "Zurück")}</button><button class="button primary" data-fr-move="sources" type="button">${text("Continue to sources", "Weiter zu Quellen")}</button></div></section>`;
}

function sourceCard(repo: Repo, primary: boolean): string {
  return `<article class="fr-repo-card"><div><small>${primary ? text("Primary repository", "Hauptrepository") : text("Additional repository", "Zusätzliches Repository")}</small><strong>${esc(repo.identity.displayName)}</strong><span>${esc(repo.identity.provider)} · ${esc(repo.identity.repositoryId)}</span>${repo.description ? `<p>${esc(repo.description)}</p>` : ""}</div><em>${repo.local?.localPath ? esc(repo.local.localPath) : text("No local binding", "Keine lokale Bindung")}</em></article>`;
}

function sources(state: FirstRunState, inspection: RepositoryInspection | null): string {
  const registry = state.project.sourceRegistry;
  const configured = registry ? `<div class="fr-repos">${sourceCard(registry.primary, true)}${registry.additional.map((repo) => sourceCard(repo, false)).join("")}</div>` : "";
  const detected = !registry && inspection?.isRepository ? `<div class="fr-detected"><strong>${text("Repository detected", "Repository erkannt")}</strong><span>${text("Livariant filled the observed Git information below. Review it and confirm the primary repository explicitly.", "Livariant hat die erkannten Git-Informationen unten vorausgefüllt. Prüfe sie und bestätige das Hauptrepository ausdrücklich.")}</span></div>` : "";
  const provider = inspection?.provider ?? "github";
  const primary = !registry ? `<form class="fr-form fr-source-form" data-fr-primary>${detected}<div class="fr-grid"><label><span>${text("Provider", "Provider")}</span><select name="provider"><option value="github" ${provider === "github" ? "selected" : ""}>GitHub</option><option value="git" ${provider === "git" ? "selected" : ""}>Git</option></select></label><label><span>${text("Repository ID", "Repository-ID")}</span><input name="repositoryId" required value="${esc(inspection?.repositoryId ?? "")}" placeholder="Kryt3r/livariant"/></label><label><span>${text("Display name", "Anzeigename")}</span><input name="displayName" required value="${esc(inspection?.displayName ?? "")}" placeholder="livariant"/></label><label><span>${text("Remote URL (optional)", "Remote-URL (optional)")}</span><input name="remoteUrl" value="${esc(inspection?.remoteUrl ?? "")}" placeholder="https://github.com/..."/></label></div>
    <label><span>${text("Local repository folder", "Lokaler Repository-Ordner")}</span><div class="fr-path-row"><input name="localPath" required value="${esc(inspection?.localPath ?? state.project.localRoot ?? "")}"/><button class="button secondary" data-fr-pick-repo="primary" type="button">${text("Choose folder…", "Ordner auswählen…")}</button></div><small>${text("The local folder and repository identity remain separate until you confirm this form.", "Lokaler Ordner und Repository-Identität bleiben getrennt, bis du dieses Formular bestätigst.")}</small></label>
    <button class="button primary" type="submit">${text("Confirm primary repository", "Hauptrepository bestätigen")}</button></form>` : "";
  const additional = registry ? `<form class="fr-form fr-source-form" data-fr-additional><h3>${text("Add another project source", "Weitere Projektquelle hinzufügen")}</h3><div class="fr-grid"><label><span>${text("Provider", "Provider")}</span><select name="provider"><option value="github">GitHub</option><option value="git">Git</option></select></label><label><span>${text("Repository ID", "Repository-ID")}</span><input name="repositoryId" required/></label><label><span>${text("Display name", "Anzeigename")}</span><input name="displayName" required/></label><label><span>${text("Local folder (optional)", "Lokaler Ordner (optional)")}</span><div class="fr-path-row"><input name="localPath"/><button class="button secondary" data-fr-pick-repo="additional" type="button">${text("Choose…", "Auswählen…")}</button></div></label></div><label><span>${text("Purpose in this project", "Zweck in diesem Projekt")}</span><textarea name="description" required></textarea><small>${text("This description explains why the source belongs to the project. It does not give the repository special trust or permissions.", "Diese Beschreibung erklärt, warum die Quelle zum Projekt gehört. Sie gibt dem Repository kein besonderes Vertrauen und keine zusätzlichen Rechte.")}</small></label><button class="button secondary" type="submit">${text("Add repository", "Repository hinzufügen")}</button></form>` : "";
  return `<section class="fr-stage"><span class="fr-kicker">${text("Project sources", "Projektquellen")}</span><h1>${text("Confirm the repositories that belong to this project", "Bestätige die Repositories dieses Projekts")}</h1><p>${text("Livariant keeps the project folder and repository identity separate so that detected data is never accepted silently. One primary repository is required; additional repositories are optional.", "Livariant hält Projektordner und Repository-Identität getrennt, damit erkannte Daten niemals stillschweigend übernommen werden. Ein Hauptrepository ist erforderlich; weitere Repositories sind optional.")}</p>${configured}${primary}${additional}<div class="fr-actions"><button class="button secondary" data-fr-move="understanding" type="button">${text("Back", "Zurück")}</button><button class="button primary" data-fr-move="providers" type="button" ${registry ? "" : "disabled"}>${text("Continue", "Weiter")}</button></div></section>`;
}

function providers(state: FirstRunState, codex: CodexStatus | null): string {
  const connected = codex?.connected === true; const available = codex?.installationState === "available";
  const stateLabel = connected ? text("Connected", "Verbunden") : available ? text("Ready", "Bereit") : text("Not ready", "Nicht bereit");
  return `<section class="fr-stage"><span class="fr-kicker">${text("LLM connections", "LLM-Verbindungen")}</span><h1>${text("Connect a provider, or set it up later", "Verbinde einen Anbieter oder richte ihn später ein")}</h1><p>${text("A connection lets Livariant use the provider. It does not grant permission to change project files, merge code or publish releases.", "Eine Verbindung erlaubt Livariant, den Anbieter zu nutzen. Sie erteilt keine Berechtigung, Projektdateien zu ändern, Code zu mergen oder Releases zu veröffentlichen.")}</p>
    <article class="fr-provider-card"><div class="fr-provider-icon">C</div><div><small>OpenAI</small><strong>Codex</strong><span>${codex ? esc(codex.detail) : text("Checking local Codex…", "Lokales Codex wird geprüft…")}</span></div><span class="fr-provider-state ${connected ? "ok" : available ? "ready" : "muted"}">${stateLabel}</span></article>
    ${connected ? `<p class="fr-success">${text("Codex is connected. The normal approval rules for changes still apply.", "Codex ist verbunden. Für Änderungen gelten weiterhin die normalen Freigaberegeln.")}</p>` : available ? `<div class="fr-connect-options"><button class="button primary" data-fr-connect-codex type="button">${text("Connect automatically", "Automatisch verbinden")}</button><label><span>${text("Or explicit Codex executable path", "Oder expliziter Codex-Programmpfad")}</span><div><input data-fr-codex-path data-fr-focus="codex-path" placeholder="C:\\...\\codex.exe"/><button class="button secondary" data-fr-connect-codex-manual type="button">${text("Connect path", "Pfad verbinden")}</button></div></label></div>` : `<p class="fr-warning">${text("Codex is not currently available. You can finish setup and configure providers later.", "Codex ist aktuell nicht verfügbar. Du kannst die Einrichtung abschließen und Provider später konfigurieren.")}</p>`}
    <div class="fr-actions"><button class="button secondary" data-fr-move="sources" type="button">${text("Back", "Zurück")}</button>${connected ? `<button class="button primary" data-fr-save-provider type="button">${text("Use Codex and continue", "Codex verwenden und weiter")}</button>` : `<button class="button primary" data-fr-defer-provider type="button">${text("Set up later", "Später einrichten")}</button>`}</div>${state.providers.deferred ? `<small class="fr-footnote">${text("Provider setup is currently deferred.", "Provider-Einrichtung ist aktuell aufgeschoben.")}</small>` : ""}</section>`;
}

function health(state: FirstRunState, snapshot: FirstRunLifecycleSnapshot): string {
  const sourceReady = snapshot.sourceReviewReady;
  const item = (ok: boolean, title: string, detail: string) => `<div class="${ok ? "ok" : "warn"}"><strong>${title}</strong><span>${detail}</span></div>`;
  return `<section class="fr-stage"><span class="fr-kicker">${text("Health check", "Abschlusscheck")}</span><h1>${text("Your setup can remain honestly incomplete", "Deine Einrichtung darf ehrlich unvollständig bleiben")}</h1><p>${text("This check shows what is configured and what is still unknown without filling gaps automatically.", "Dieser Check zeigt, was eingerichtet ist und was noch unbekannt bleibt, ohne Lücken automatisch zu füllen.")}</p><div class="fr-health">
    ${item(state.health.hasProjectSelection, text("Project", "Projekt"), state.health.hasProjectSelection ? text("Selected", "Ausgewählt") : text("Not selected", "Nicht ausgewählt"))}${item(state.health.hasSourceRegistry, text("Sources", "Quellen"), state.health.hasSourceRegistry ? text("Repositories configured", "Repositories eingerichtet") : text("Not configured", "Nicht eingerichtet"))}${item(sourceReady, text("Source check", "Quellenprüfung"), sourceReady ? text("Ready to observe", "Bereit zur Prüfung") : text("Primary local repository still needed", "Lokales Hauptrepository fehlt noch"))}${item(state.health.openQuestionCount === 0, text("Open questions", "Offene Fragen"), `${state.health.openQuestionCount} ${text("open", "offen")} · ${state.health.skippedQuestionCount} ${text("skipped/unknown", "übersprungen/unbekannt")}`)}${item(!state.providers.deferred && state.providers.configuredProviderIds.length > 0, text("Providers", "Provider"), state.providers.deferred ? text("Set up later", "Später einrichten") : state.providers.configuredProviderIds.length ? esc(state.providers.configuredProviderIds.join(", ")) : text("No provider recorded", "Kein Provider hinterlegt"))}</div>
    <div class="fr-boundary"><strong>${text("Changes remain controlled", "Änderungen bleiben kontrolliert")}</strong><p>${text("Finishing setup does not let Livariant or a connected AI change project files automatically. Changes still require the normal Livariant approval path.", "Das Abschließen der Einrichtung erlaubt Livariant oder einer verbundenen KI nicht, Projektdateien automatisch zu verändern. Für Änderungen gilt weiterhin der normale Livariant-Freigabepfad.")}</p></div><div class="fr-actions"><button class="button secondary" data-fr-move="providers" type="button">${text("Back", "Zurück")}</button><button class="button primary" data-fr-complete type="button">${text("Finish and open Livariant", "Abschließen und Livariant öffnen")}</button></div></section>`;
}

function stage(state: FirstRunState, snapshot: FirstRunLifecycleSnapshot, codex: CodexStatus | null, force: boolean, inspection: RepositoryInspection | null): string {
  const step = force && state.currentStep === "complete" ? "welcome" : state.currentStep;
  if (step === "project") return project(state); if (step === "understanding") return understanding(state); if (step === "sources") return sources(state, inspection); if (step === "providers") return providers(state, codex); if (step === "health") return health(state, snapshot); return welcome();
}

export async function mountFirstRunOnboarding(root: HTMLElement, options: { logoUrl: string; force?: boolean; onExit: () => void }): Promise<boolean> {
  let snapshot = await loadFirstRunLifecycle();
  if (snapshot.status === "complete" && !options.force) return false;
  let codex: CodexStatus | null = null; let inspection: RepositoryInspection | null = null; let busy = false; let error: string | null = null;

  const refreshCodex = async () => { try { codex = await invoke<CodexStatus>("codex_connector_status"); } catch { codex = null; } };
  await refreshCodex();

  const captureContext = (): RenderContext => {
    const main = root.querySelector<HTMLElement>(".fr-main");
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return { scrollTop: main?.scrollTop ?? 0, focusKey: active?.dataset.frFocus ?? null };
  };

  const apply = async (action: FirstRunLifecycleAction, preserveContext = false): Promise<boolean> => {
    if (busy) return false;
    const context = preserveContext ? captureContext() : undefined;
    busy = true; error = null; render(context);
    try { snapshot = await transitionFirstRunLifecycle(action); return true; }
    catch (cause) { error = String(cause); return false; }
    finally { busy = false; render(context); }
  };

  const formValue = (form: HTMLFormElement, name: string) => new FormData(form).get(name)?.toString().trim() ?? "";
  const repoAction = (form: HTMLFormElement, additional: boolean): FirstRunLifecycleAction => {
    const provider: RepoIdentity["provider"] = formValue(form, "provider") === "git" ? "git" : "github";
    const repositoryId = formValue(form, "repositoryId"); const displayName = formValue(form, "displayName"); const remoteUrl = formValue(form, "remoteUrl"); const localPath = formValue(form, "localPath");
    const identity: RepoIdentity = { provider, repositoryId, displayName, ...(remoteUrl ? { remoteUrl } : {}) };
    return additional ? { type: "add-additional-repository", identity, description: formValue(form, "description"), ...(localPath ? { localPath } : {}) } : { type: "set-primary-repository", identity, ...(localPath ? { localPath } : {}) };
  };

  const inspectRepository = async (path: string) => {
    try { inspection = await invoke<RepositoryInspection>("inspect_first_run_repository", { localPath: path }); }
    catch { inspection = null; }
  };

  const chooseFolder = async (): Promise<string | null> => {
    try { return await invoke<string | null>("pick_first_run_folder"); }
    catch (cause) { error = String(cause); render(captureContext()); return null; }
  };

  const render = (context?: RenderContext) => {
    const state = stateFrom(snapshot); const displayStep = options.force && state.currentStep === "complete" ? "welcome" : state.currentStep;
    root.innerHTML = `<div class="desktop-frame first-run-frame">${windowBar(options.logoUrl)}<div class="fr-shell"><aside class="fr-rail"><div class="fr-brand"><img src="${options.logoUrl}" alt="Livariant"/><div><strong>Livariant</strong><small>${text("Setup assistant", "Einrichtungsassistent")}</small></div></div><ol>${progress(displayStep)}</ol><div class="fr-rail-note"><strong>${text("Resumable by design", "Bewusst fortsetzbar")}</strong><span>${text("Your setup progress is saved locally so you can continue later.", "Dein Einrichtungsfortschritt wird lokal gespeichert, damit du später fortsetzen kannst.")}</span></div>${options.force ? `<button class="button secondary fr-return" data-fr-exit type="button">${text("Return to Livariant", "Zurück zu Livariant")}</button>` : ""}</aside><main class="fr-main">${error ? `<div class="fr-error" role="alert"><strong>${text("Setup needs attention", "Einrichtung benötigt Aufmerksamkeit")}</strong><span>${esc(error)}</span></div>` : ""}${busy ? `<div class="fr-busy">${text("Saving…", "Speichere…")}</div>` : ""}${stage(state, snapshot, codex, options.force === true, inspection)}</main></div></div>`;

    if (context) {
      const main = root.querySelector<HTMLElement>(".fr-main"); if (main) main.scrollTop = context.scrollTop;
      if (context.focusKey) root.querySelector<HTMLElement>(`[data-fr-focus="${CSS.escape(context.focusKey)}"]`)?.focus({ preventScroll: true });
    }

    root.querySelectorAll<HTMLButtonElement>("[data-fr-window]").forEach((button) => button.addEventListener("click", async () => { const action = button.dataset.frWindow; if (action === "minimize") await appWindow.minimize(); if (action === "maximize") await appWindow.toggleMaximize(); if (action === "close") await appWindow.close(); }));
    root.querySelector<HTMLButtonElement>("[data-fr-exit]")?.addEventListener("click", options.onExit);
    root.querySelectorAll<HTMLButtonElement>("[data-fr-move]").forEach((button) => button.addEventListener("click", () => void apply({ type: "move", step: button.dataset.frMove as Step })));
    root.querySelector<HTMLButtonElement>("[data-fr-skip-all]")?.addEventListener("click", async () => { if (await apply({ type: "complete" })) options.onExit(); });

    root.querySelector<HTMLButtonElement>("[data-fr-pick-project]")?.addEventListener("click", async () => {
      const selected = await chooseFolder(); if (!selected) return;
      const localRoot = root.querySelector<HTMLInputElement>('input[name="localRoot"]'); const projectId = root.querySelector<HTMLInputElement>('input[name="projectId"]');
      if (localRoot) localRoot.value = selected; if (projectId && !projectId.value.trim()) projectId.value = suggestProjectIdFromPath(selected);
    });
    root.querySelector<HTMLInputElement>('input[name="localRoot"]')?.addEventListener("change", (event) => {
      const path = (event.currentTarget as HTMLInputElement).value; const projectId = root.querySelector<HTMLInputElement>('input[name="projectId"]'); if (projectId && !projectId.value.trim() && path.trim()) projectId.value = suggestProjectIdFromPath(path);
    });
    root.querySelector<HTMLFormElement>("[data-fr-project]")?.addEventListener("submit", async (event) => {
      event.preventDefault(); const form = event.currentTarget as HTMLFormElement; const localRoot = formValue(form, "localRoot");
      if (await apply({ type: "select-project", projectId: formValue(form, "projectId"), localRoot })) { await inspectRepository(localRoot); await apply({ type: "move", step: "understanding" }); }
    });

    root.querySelectorAll<HTMLButtonElement>("[data-fr-question-answer]").forEach((button) => button.addEventListener("click", () => { const id = button.dataset.frQuestionAnswer ?? ""; const value = root.querySelector<HTMLTextAreaElement>(`[data-fr-question-value="${CSS.escape(id)}"]`)?.value ?? ""; void apply({ type: "answer-question", questionId: id, response: value }, true); }));
    root.querySelectorAll<HTMLButtonElement>("[data-fr-question-skip]").forEach((button) => button.addEventListener("click", () => void apply({ type: "skip-question", questionId: button.dataset.frQuestionSkip ?? "" }, true)));

    root.querySelectorAll<HTMLButtonElement>("[data-fr-pick-repo]").forEach((button) => button.addEventListener("click", async () => {
      const selected = await chooseFolder(); if (!selected) return; const form = button.closest("form"); const input = form?.querySelector<HTMLInputElement>('input[name="localPath"]'); if (input) input.value = selected;
      if (button.dataset.frPickRepo === "primary") { const context = captureContext(); await inspectRepository(selected); render(context); }
    }));
    root.querySelector<HTMLFormElement>("[data-fr-primary]")?.addEventListener("submit", (event) => { event.preventDefault(); void apply(repoAction(event.currentTarget as HTMLFormElement, false), true); });
    root.querySelector<HTMLFormElement>("[data-fr-additional]")?.addEventListener("submit", (event) => { event.preventDefault(); void apply(repoAction(event.currentTarget as HTMLFormElement, true), true); });

    root.querySelector<HTMLButtonElement>("[data-fr-connect-codex]")?.addEventListener("click", async () => { const context = captureContext(); busy = true; error = null; render(context); try { codex = await invoke<CodexStatus>("codex_connector_connect", { manualPath: null }); } catch (cause) { error = String(cause); } finally { busy = false; render(context); } });
    root.querySelector<HTMLButtonElement>("[data-fr-connect-codex-manual]")?.addEventListener("click", async () => { const manualPath = root.querySelector<HTMLInputElement>("[data-fr-codex-path]")?.value.trim(); if (!manualPath) { error = text("Enter an explicit Codex executable path first.", "Trage zuerst einen expliziten Codex-Programmpfad ein."); render(captureContext()); return; } const context = captureContext(); busy = true; error = null; render(context); try { codex = await invoke<CodexStatus>("codex_connector_connect", { manualPath }); } catch (cause) { error = String(cause); } finally { busy = false; render(context); } });
    root.querySelector<HTMLButtonElement>("[data-fr-save-provider]")?.addEventListener("click", async () => { if (await apply({ type: "set-providers", providerIds: ["codex"], deferred: false })) await apply({ type: "move", step: "health" }); });
    root.querySelector<HTMLButtonElement>("[data-fr-defer-provider]")?.addEventListener("click", async () => { if (await apply({ type: "set-providers", providerIds: [], deferred: true })) await apply({ type: "move", step: "health" }); });
    root.querySelector<HTMLButtonElement>("[data-fr-complete]")?.addEventListener("click", async () => { if (await apply({ type: "complete" })) options.onExit(); });
  };

  const initialState = stateFrom(snapshot); if (initialState.project.localRoot) await inspectRepository(initialState.project.localRoot);
  render(); return true;
}
