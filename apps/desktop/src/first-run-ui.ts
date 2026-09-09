import "./first-run-ui.css";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getLanguage } from "./i18n/runtime.js";
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

const appWindow = getCurrentWindow();
const esc = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character] ?? character);
const text = <T>(en: T, de: T): T => getLanguage() === "de" ? de : en;
const STEPS: Step[] = ["welcome", "project", "understanding", "sources", "providers", "health"];
const STEP_LABELS: Record<Step, readonly [string, string]> = {
  welcome: ["Welcome", "Willkommen"],
  project: ["Project", "Projekt"],
  understanding: ["Understanding", "Verstehen"],
  sources: ["Sources", "Quellen"],
  providers: ["Providers", "Anbieter"],
  health: ["Health check", "Abschlusscheck"],
  complete: ["Complete", "Fertig"],
};

function stateFrom(snapshot: FirstRunLifecycleSnapshot): FirstRunState {
  const value = snapshot.onboardingState;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(text("First-run state is unavailable.", "First-Run-Zustand ist nicht verfügbar."));
  }
  const state = value as Partial<FirstRunState>;
  if (
    state.schemaVersion !== 1 || !state.project || !state.understanding || !Array.isArray(state.understanding.questions)
    || !state.providers || !state.health || !state.boundaries
  ) {
    throw new Error(text("First-run state does not match the supported presentation schema.", "First-Run-Zustand entspricht nicht dem unterstützten Darstellungs-Schema."));
  }
  if (
    state.boundaries.onboardingEvidenceIsProjectTruth !== false || state.boundaries.grantsAuthority !== false
    || state.boundaries.mutationAuthorized !== false || state.boundaries.changesProjectOwnedFiles !== false
  ) {
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
  return `<section class="fr-stage fr-welcome">
    <span class="fr-kicker">${text("First run", "Erster Start")}</span>
    <h1>${text("Set up Livariant around your project", "Richte Livariant für dein Projekt ein")}</h1>
    <p>${text("This assistant creates resumable setup state. It does not silently change your project, promote repository content to truth, or grant an LLM permission to mutate files.", "Dieser Assistent erstellt einen fortsetzbaren Einrichtungszustand. Er verändert dein Projekt nicht stillschweigend, macht Repository-Inhalte nicht automatisch zur Wahrheit und erteilt keinem LLM Änderungsrechte.")}</p>
    <div class="fr-principles">
      <div><strong>${text("Evidence stays evidence", "Evidence bleibt Evidence")}</strong><span>${text("Unknown and skipped answers remain unknown.", "Unbekannte und übersprungene Antworten bleiben unbekannt.")}</span></div>
      <div><strong>${text("You stay in control", "Du behältst die Kontrolle")}</strong><span>${text("Connection, capability and Authority remain separate.", "Verbindung, Capability und Authority bleiben getrennt.")}</span></div>
      <div><strong>${text("Resume later", "Später fortsetzen")}</strong><span>${text("Progress lives only in Livariant app data.", "Fortschritt liegt nur in Livariants App-Daten.")}</span></div>
    </div>
    <div class="fr-actions"><button class="button primary" data-fr-move="project" type="button">${text("Start setup", "Einrichtung starten")}</button><button class="button secondary" data-fr-skip-all type="button">${text("Continue without full setup", "Ohne vollständige Einrichtung fortfahren")}</button></div>
    <small class="fr-footnote">${text("The incomplete path is explicit; Livariant will not invent the missing information.", "Der unvollständige Pfad ist bewusst; Livariant erfindet die fehlenden Informationen nicht.")}</small>
  </section>`;
}

function project(state: FirstRunState): string {
  return `<section class="fr-stage">
    <span class="fr-kicker">${text("Project", "Projekt")}</span><h1>${text("Which project should Livariant understand?", "Welches Projekt soll Livariant verstehen?")}</h1>
    <p>${text("Choose a stable Livariant project ID and an existing local project folder. Reading it is discovery evidence, not permission to modify it.", "Wähle eine stabile Livariant-Projekt-ID und einen bestehenden lokalen Projektordner. Das Lesen ist Discovery-Evidence und keine Erlaubnis, ihn zu verändern.")}</p>
    <form class="fr-form" data-fr-project>
      <label><span>${text("Project ID", "Projekt-ID")}</span><input name="projectId" required value="${esc(state.project.projectId ?? "")}" placeholder="livariant"/></label>
      <label><span>${text("Local project folder", "Lokaler Projektordner")}</span><input name="localRoot" required value="${esc(state.project.localRoot ?? "")}" placeholder="C:\\Projects\\my-project"/><small>${text("Livariant inspects this folder read-only to create the canonical understanding questions.", "Livariant untersucht diesen Ordner nur lesend, um die kanonischen Verständnisfragen zu erzeugen.")}</small></label>
      <div class="fr-actions"><button class="button secondary" data-fr-move="welcome" type="button">${text("Back", "Zurück")}</button><button class="button primary" type="submit">${text("Inspect project", "Projekt untersuchen")}</button></div>
    </form>
  </section>`;
}

function understanding(state: FirstRunState): string {
  const questions = state.understanding.questions;
  const cards = questions.map((question) => `<article class="fr-question ${question.state}">
    <div class="fr-question-head"><div><small>${esc(question.topic)}</small><strong>${esc(question.prompt)}</strong></div><span>${question.state === "answered" ? text("Answered", "Beantwortet") : question.state === "skipped" ? text("Unknown / skipped", "Unbekannt / übersprungen") : text("Open", "Offen")}</span></div>
    <p>${esc(question.reason)}</p><textarea data-fr-question-value="${esc(question.id)}" placeholder="${text("Your answer…", "Deine Antwort…")}">${esc(question.response ?? "")}</textarea>
    <div class="fr-question-actions"><button class="button secondary" data-fr-question-skip="${esc(question.id)}" type="button">${text("Skip / keep unknown", "Überspringen / unbekannt lassen")}</button><button class="button primary" data-fr-question-answer="${esc(question.id)}" type="button">${text("Save answer", "Antwort speichern")}</button></div>
  </article>`).join("");
  return `<section class="fr-stage">
    <span class="fr-kicker">${text("Project understanding", "Projektverständnis")}</span><h1>${text("Clarify what files cannot prove", "Kläre, was Dateien nicht beweisen können")}</h1>
    <p>${text("These questions come from canonical discovery. Answers remain candidate evidence until reviewed; Skip never means a guessed default.", "Diese Fragen stammen aus der kanonischen Discovery. Antworten bleiben Candidate Evidence bis zur Prüfung; Überspringen bedeutet niemals einen geratenen Standardwert.")}</p>
    ${cards ? `<div class="fr-question-list">${cards}</div>` : `<div class="fr-empty"><strong>${text("No clarification questions are currently open.", "Aktuell sind keine Klärungsfragen offen.")}</strong><span>${text("You may continue without claiming the project is fully understood.", "Du kannst fortfahren, ohne zu behaupten, dass das Projekt vollständig verstanden ist.")}</span></div>`}
    <div class="fr-actions"><button class="button secondary" data-fr-move="project" type="button">${text("Back", "Zurück")}</button><button class="button primary" data-fr-move="sources" type="button">${text("Continue to sources", "Weiter zu Quellen")}</button></div>
  </section>`;
}

function sourceCard(repo: Repo, primary: boolean): string {
  return `<article class="fr-repo-card"><div><small>${primary ? text("Primary repository", "Hauptrepository") : text("Additional repository", "Zusätzliches Repository")}</small><strong>${esc(repo.identity.displayName)}</strong><span>${esc(repo.identity.provider)} · ${esc(repo.identity.repositoryId)}</span>${repo.description ? `<p>${esc(repo.description)}</p>` : ""}</div><em>${repo.local?.localPath ? esc(repo.local.localPath) : text("No local binding", "Keine lokale Bindung")}</em></article>`;
}

function sources(state: FirstRunState): string {
  const registry = state.project.sourceRegistry;
  const configured = registry ? `<div class="fr-repos">${sourceCard(registry.primary, true)}${registry.additional.map((repo) => sourceCard(repo, false)).join("")}</div>` : "";
  const primary = !registry ? `<form class="fr-form fr-source-form" data-fr-primary>
    <div class="fr-grid"><label><span>${text("Provider", "Provider")}</span><select name="provider"><option value="github">GitHub</option><option value="git">Git</option></select></label><label><span>${text("Repository ID", "Repository-ID")}</span><input name="repositoryId" required placeholder="Kryt3r/livariant"/></label><label><span>${text("Display name", "Anzeigename")}</span><input name="displayName" required placeholder="livariant"/></label><label><span>${text("Remote URL (optional)", "Remote-URL (optional)")}</span><input name="remoteUrl" placeholder="https://github.com/..."/></label></div>
    <label><span>${text("Local repository path", "Lokaler Repository-Pfad")}</span><input name="localPath" required placeholder="${esc(state.project.localRoot ?? "C:\\Projects\\my-project")}"/><small>${text("Enter it explicitly. Livariant deliberately does not infer this binding from the project folder.", "Trage ihn explizit ein. Livariant leitet diese Bindung absichtlich nicht aus dem Projektordner ab.")}</small></label>
    <button class="button primary" type="submit">${text("Set primary repository", "Hauptrepository setzen")}</button>
  </form>` : "";
  const additional = registry ? `<form class="fr-form fr-source-form" data-fr-additional>
    <h3>${text("Add another project source", "Weitere Projektquelle hinzufügen")}</h3>
    <div class="fr-grid"><label><span>${text("Provider", "Provider")}</span><select name="provider"><option value="github">GitHub</option><option value="git">Git</option></select></label><label><span>${text("Repository ID", "Repository-ID")}</span><input name="repositoryId" required/></label><label><span>${text("Display name", "Anzeigename")}</span><input name="displayName" required/></label><label><span>${text("Local path (optional)", "Lokaler Pfad (optional)")}</span><input name="localPath"/></label></div>
    <label><span>${text("Purpose in this project", "Zweck in diesem Projekt")}</span><textarea name="description" required></textarea><small>${text("The description adds context only. It grants no Trust, Truth or Authority.", "Die Beschreibung liefert nur Kontext. Sie erteilt kein Trust, keine Truth und keine Authority.")}</small></label>
    <button class="button secondary" type="submit">${text("Add repository", "Repository hinzufügen")}</button>
  </form>` : "";
  return `<section class="fr-stage"><span class="fr-kicker">${text("Project sources", "Projektquellen")}</span><h1>${text("Bind repositories explicitly", "Repositories explizit verbinden")}</h1><p>${text("A project has exactly one primary repository and optional additional repositories. Local paths and repository identity stay separate.", "Ein Projekt hat genau ein Hauptrepository und optionale zusätzliche Repositories. Lokale Pfade und Repository-Identität bleiben getrennt.")}</p>${configured}${primary}${additional}<div class="fr-actions"><button class="button secondary" data-fr-move="understanding" type="button">${text("Back", "Zurück")}</button><button class="button primary" data-fr-move="providers" type="button" ${registry ? "" : "disabled"}>${text("Continue", "Weiter")}</button></div></section>`;
}

function providers(state: FirstRunState, codex: CodexStatus | null): string {
  const connected = codex?.connected === true;
  const available = codex?.installationState === "available";
  const stateLabel = connected ? text("Connected", "Verbunden") : available ? text("Ready", "Bereit") : text("Not ready", "Nicht bereit");
  return `<section class="fr-stage"><span class="fr-kicker">${text("LLM connections", "LLM-Verbindungen")}</span><h1>${text("Connect a provider, or deliberately defer it", "Verbinde einen Anbieter oder verschiebe es bewusst")}</h1><p>${text("A connection is capability, not Authority. Persisted reconnect later does not grant file-change, merge or release permission.", "Eine Verbindung ist Capability, nicht Authority. Persistenter Reconnect erteilt später keine Dateiänderungs-, Merge- oder Release-Rechte.")}</p>
    <article class="fr-provider-card"><div class="fr-provider-icon">C</div><div><small>OpenAI</small><strong>Codex</strong><span>${codex ? esc(codex.detail) : text("Checking local Codex…", "Lokales Codex wird geprüft…")}</span></div><span class="fr-provider-state ${connected ? "ok" : available ? "ready" : "muted"}">${stateLabel}</span></article>
    ${connected ? `<p class="fr-success">${text("Codex is connected. Recording it in onboarding grants no additional Authority.", "Codex ist verbunden. Das Hinterlegen im Onboarding erteilt keine zusätzliche Authority.")}</p>` : available ? `<div class="fr-connect-options"><button class="button primary" data-fr-connect-codex type="button">${text("Connect automatically", "Automatisch verbinden")}</button><label><span>${text("Or explicit Codex executable path", "Oder expliziter Codex-Programmpfad")}</span><div><input data-fr-codex-path placeholder="C:\\...\\codex.exe"/><button class="button secondary" data-fr-connect-codex-manual type="button">${text("Connect path", "Pfad verbinden")}</button></div></label></div>` : `<p class="fr-warning">${text("Codex is not currently available. You can finish setup and configure providers later.", "Codex ist aktuell nicht verfügbar. Du kannst die Einrichtung abschließen und Provider später konfigurieren.")}</p>`}
    <div class="fr-actions"><button class="button secondary" data-fr-move="sources" type="button">${text("Back", "Zurück")}</button>${connected ? `<button class="button primary" data-fr-save-provider type="button">${text("Use Codex and continue", "Codex verwenden und weiter")}</button>` : `<button class="button primary" data-fr-defer-provider type="button">${text("Set up later", "Später einrichten")}</button>`}</div>
    ${state.providers.deferred ? `<small class="fr-footnote">${text("Provider setup is currently deferred.", "Provider-Einrichtung ist aktuell aufgeschoben.")}</small>` : ""}
  </section>`;
}

function health(state: FirstRunState, snapshot: FirstRunLifecycleSnapshot): string {
  const sourceReady = snapshot.sourceReviewReady;
  const item = (ok: boolean, title: string, detail: string) => `<div class="${ok ? "ok" : "warn"}"><strong>${title}</strong><span>${detail}</span></div>`;
  return `<section class="fr-stage"><span class="fr-kicker">${text("Health check", "Abschlusscheck")}</span><h1>${text("Your setup can remain honestly incomplete", "Deine Einrichtung darf ehrlich unvollständig bleiben")}</h1><p>${text("This check reports configured and unknown areas without turning gaps into defaults.", "Dieser Check zeigt eingerichtete und unbekannte Bereiche, ohne Lücken in Standardwerte umzudeuten.")}</p>
    <div class="fr-health">
      ${item(state.health.hasProjectSelection, text("Project", "Projekt"), state.health.hasProjectSelection ? text("Selected", "Ausgewählt") : text("Not selected", "Nicht ausgewählt"))}
      ${item(state.health.hasSourceRegistry, text("Sources", "Quellen"), state.health.hasSourceRegistry ? text("Registry configured", "Registry eingerichtet") : text("Not configured", "Nicht eingerichtet"))}
      ${item(sourceReady, text("Source review", "Quellenprüfung"), sourceReady ? text("Ready for observation", "Bereit für Observation") : text("Needs explicit primary local binding", "Benötigt explizite lokale Hauptrepo-Bindung"))}
      ${item(state.health.openQuestionCount === 0, text("Open questions", "Offene Fragen"), `${state.health.openQuestionCount} ${text("open", "offen")} · ${state.health.skippedQuestionCount} ${text("skipped/unknown", "übersprungen/unbekannt")}`)}
      ${item(!state.providers.deferred && state.providers.configuredProviderIds.length > 0, text("Providers", "Provider"), state.providers.deferred ? text("Deferred", "Aufgeschoben") : state.providers.configuredProviderIds.length ? esc(state.providers.configuredProviderIds.join(", ")) : text("No provider recorded", "Kein Provider hinterlegt"))}
    </div>
    <div class="fr-boundary"><strong>${text("Protected boundary", "Geschützte Grenze")}</strong><p>${text("Finishing onboarding does not authorize Semantic Apply, project-file mutation or Self-Hosting mutation. Evidence is still not Truth.", "Das Abschließen autorisiert keinen Semantic Apply, keine Projektdatei-Mutation und keine Self-Hosting-Mutation. Evidence ist weiterhin keine Truth.")}</p></div>
    <div class="fr-actions"><button class="button secondary" data-fr-move="providers" type="button">${text("Back", "Zurück")}</button><button class="button primary" data-fr-complete type="button">${text("Finish and open Livariant", "Abschließen und Livariant öffnen")}</button></div>
  </section>`;
}

function stage(state: FirstRunState, snapshot: FirstRunLifecycleSnapshot, codex: CodexStatus | null, force: boolean): string {
  const step = force && state.currentStep === "complete" ? "welcome" : state.currentStep;
  if (step === "project") return project(state);
  if (step === "understanding") return understanding(state);
  if (step === "sources") return sources(state);
  if (step === "providers") return providers(state, codex);
  if (step === "health") return health(state, snapshot);
  return welcome();
}

export async function mountFirstRunOnboarding(
  root: HTMLElement,
  options: { logoUrl: string; force?: boolean; onExit: () => void },
): Promise<boolean> {
  let snapshot = await loadFirstRunLifecycle();
  if (snapshot.status === "complete" && !options.force) return false;
  let codex: CodexStatus | null = null;
  let busy = false;
  let error: string | null = null;

  const refreshCodex = async () => {
    try { codex = await invoke<CodexStatus>("codex_connector_status"); }
    catch { codex = null; }
  };
  await refreshCodex();

  const apply = async (action: FirstRunLifecycleAction): Promise<boolean> => {
    if (busy) return false;
    busy = true; error = null; render();
    try {
      snapshot = await transitionFirstRunLifecycle(action);
      return true;
    } catch (cause) {
      error = String(cause);
      return false;
    } finally {
      busy = false;
      render();
    }
  };

  const formValue = (form: HTMLFormElement, name: string) => new FormData(form).get(name)?.toString().trim() ?? "";
  const repoAction = (form: HTMLFormElement, additional: boolean): FirstRunLifecycleAction => {
    const provider: RepoIdentity["provider"] = formValue(form, "provider") === "git" ? "git" : "github";
    const repositoryId = formValue(form, "repositoryId");
    const displayName = formValue(form, "displayName");
    const remoteUrl = formValue(form, "remoteUrl");
    const localPath = formValue(form, "localPath");
    const identity: RepoIdentity = { provider, repositoryId, displayName, ...(remoteUrl ? { remoteUrl } : {}) };
    return additional
      ? { type: "add-additional-repository", identity, description: formValue(form, "description"), ...(localPath ? { localPath } : {}) }
      : { type: "set-primary-repository", identity, ...(localPath ? { localPath } : {}) };
  };

  const render = () => {
    const state = stateFrom(snapshot);
    const displayStep = options.force && state.currentStep === "complete" ? "welcome" : state.currentStep;
    root.innerHTML = `<div class="desktop-frame first-run-frame">${windowBar(options.logoUrl)}<div class="fr-shell"><aside class="fr-rail"><div class="fr-brand"><img src="${options.logoUrl}" alt="Livariant"/><div><strong>Livariant</strong><small>${text("Setup assistant", "Einrichtungsassistent")}</small></div></div><ol>${progress(displayStep)}</ol><div class="fr-rail-note"><strong>${text("Resumable by design", "Bewusst fortsetzbar")}</strong><span>${text("Every normal step persists through the canonical lifecycle bridge.", "Jeder normale Schritt wird über die kanonische Lifecycle-Bridge gespeichert.")}</span></div>${options.force ? `<button class="button secondary fr-return" data-fr-exit type="button">${text("Return to Livariant", "Zurück zu Livariant")}</button>` : ""}</aside><main class="fr-main">${error ? `<div class="fr-error" role="alert"><strong>${text("Setup needs attention", "Einrichtung benötigt Aufmerksamkeit")}</strong><span>${esc(error)}</span></div>` : ""}${busy ? `<div class="fr-busy">${text("Saving through canonical lifecycle…", "Speichere über kanonischen Lifecycle…")}</div>` : ""}${stage(state, snapshot, codex, options.force === true)}</main></div></div>`;

    root.querySelectorAll<HTMLButtonElement>("[data-fr-window]").forEach((button) => button.addEventListener("click", async () => {
      const action = button.dataset.frWindow;
      if (action === "minimize") await appWindow.minimize();
      if (action === "maximize") await appWindow.toggleMaximize();
      if (action === "close") await appWindow.close();
    }));
    root.querySelector<HTMLButtonElement>("[data-fr-exit]")?.addEventListener("click", options.onExit);
    root.querySelectorAll<HTMLButtonElement>("[data-fr-move]").forEach((button) => button.addEventListener("click", () => void apply({ type: "move", step: button.dataset.frMove as Step })));
    root.querySelector<HTMLButtonElement>("[data-fr-skip-all]")?.addEventListener("click", async () => { if (await apply({ type: "complete" })) options.onExit(); });
    root.querySelector<HTMLFormElement>("[data-fr-project]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      if (await apply({ type: "select-project", projectId: formValue(form, "projectId"), localRoot: formValue(form, "localRoot") })) {
        await apply({ type: "move", step: "understanding" });
      }
    });
    root.querySelectorAll<HTMLButtonElement>("[data-fr-question-answer]").forEach((button) => button.addEventListener("click", () => {
      const id = button.dataset.frQuestionAnswer ?? "";
      const value = root.querySelector<HTMLTextAreaElement>(`[data-fr-question-value="${CSS.escape(id)}"]`)?.value ?? "";
      void apply({ type: "answer-question", questionId: id, response: value });
    }));
    root.querySelectorAll<HTMLButtonElement>("[data-fr-question-skip]").forEach((button) => button.addEventListener("click", () => void apply({ type: "skip-question", questionId: button.dataset.frQuestionSkip ?? "" })));
    root.querySelector<HTMLFormElement>("[data-fr-primary]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      void apply(repoAction(event.currentTarget as HTMLFormElement, false));
    });
    root.querySelector<HTMLFormElement>("[data-fr-additional]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      void apply(repoAction(event.currentTarget as HTMLFormElement, true));
    });
    root.querySelector<HTMLButtonElement>("[data-fr-connect-codex]")?.addEventListener("click", async () => {
      busy = true; error = null; render();
      try { codex = await invoke<CodexStatus>("codex_connector_connect", { manualPath: null }); }
      catch (cause) { error = String(cause); }
      finally { busy = false; render(); }
    });
    root.querySelector<HTMLButtonElement>("[data-fr-connect-codex-manual]")?.addEventListener("click", async () => {
      const manualPath = root.querySelector<HTMLInputElement>("[data-fr-codex-path]")?.value.trim();
      if (!manualPath) { error = text("Enter an explicit Codex executable path first.", "Trage zuerst einen expliziten Codex-Programmpfad ein."); render(); return; }
      busy = true; error = null; render();
      try { codex = await invoke<CodexStatus>("codex_connector_connect", { manualPath }); }
      catch (cause) { error = String(cause); }
      finally { busy = false; render(); }
    });
    root.querySelector<HTMLButtonElement>("[data-fr-save-provider]")?.addEventListener("click", async () => {
      if (await apply({ type: "set-providers", providerIds: ["codex"], deferred: false })) await apply({ type: "move", step: "health" });
    });
    root.querySelector<HTMLButtonElement>("[data-fr-defer-provider]")?.addEventListener("click", async () => {
      if (await apply({ type: "set-providers", providerIds: [], deferred: true })) await apply({ type: "move", step: "health" });
    });
    root.querySelector<HTMLButtonElement>("[data-fr-complete]")?.addEventListener("click", async () => { if (await apply({ type: "complete" })) options.onExit(); });
  };

  render();
  return true;
}
