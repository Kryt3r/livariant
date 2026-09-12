import "./project-source-review-view.css";
import "./project-source-review-performance.css";
import "./github-project-telemetry.css";
import { getLanguage } from "./i18n/runtime.js";
import {
  getCurrentProjectSourceReviewPresentation,
  loadProjectSourceReviewPresentation,
  refreshProjectSourceReviewPresentation,
  renderProjectSourceReviewBridgeView,
  startProjectSourceReview,
} from "./project-source-review-bridge.js";
import {
  loadGitHubProjectTelemetry,
  renderGitHubTelemetry,
  renderGitHubTelemetryError,
  renderGitHubTelemetryLoading,
} from "./github-project-telemetry.js";

let sourceReviewActive = false;
let refreshGeneration = 0;

const text = (en: string, de: string) => getLanguage() === "de" ? de : en;
const sourcesIcon = () => '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 5h16v4H4zM4 15h16v4H4z"/><path d="M8 9v6M16 9v6"/></svg>';

const renderTelemetry = async (content: HTMLElement, generation: number) => {
  const presentation = getCurrentProjectSourceReviewPresentation();
  const primary = presentation?.sources.find((source) => source.kind === "primary");
  if (!primary || primary.identity.provider !== "github") return;

  content.insertAdjacentHTML("beforeend", renderGitHubTelemetryLoading(primary.identity.repositoryId));
  const placeholder = content.querySelector<HTMLElement>("[data-gh-project-telemetry]");
  if (!placeholder) return;

  try {
    const telemetry = await loadGitHubProjectTelemetry(primary.identity.repositoryId);
    if (!sourceReviewActive || generation !== refreshGeneration || !placeholder.isConnected) return;
    placeholder.outerHTML = renderGitHubTelemetry(telemetry);
  } catch (cause) {
    if (!sourceReviewActive || generation !== refreshGeneration || !placeholder.isConnected) return;
    placeholder.outerHTML = renderGitHubTelemetryError(primary.identity.repositoryId, String(cause));
  }
};

const bindReviewSelection = (content: HTMLElement, generation: number) => {
  const checkboxes = [...content.querySelectorAll<HTMLInputElement>("[data-review-path]")];
  const startButton = content.querySelector<HTMLButtonElement>("[data-start-project-review]");
  const count = content.querySelector<HTMLElement>("[data-review-selection-count]");
  const status = content.querySelector<HTMLElement>("[data-review-start-status]");
  const filter = content.querySelector<HTMLInputElement>("[data-review-path-filter]");

  const updateSelectionState = () => {
    const selectedCount = checkboxes.filter((input) => input.checked).length;
    if (count) count.textContent = `${selectedCount} ${text("selected", "ausgewählt")}`;
    if (startButton) startButton.disabled = selectedCount === 0;
  };

  content.addEventListener("change", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.matches("[data-review-path]")) updateSelectionState();
  });
  filter?.addEventListener("input", () => {
    const query = filter.value.trim().toLocaleLowerCase();
    content.querySelectorAll<HTMLElement>("[data-review-path-row]").forEach((row) => {
      const searchable = row.dataset.reviewPathSearch ?? "";
      row.hidden = !!query && !searchable.includes(query);
    });
  });

  startButton?.addEventListener("click", async () => {
    const selectedReviewPaths = checkboxes.filter((input) => input.checked).map((input) => input.value);
    if (selectedReviewPaths.length === 0) return;
    startButton.disabled = true;
    checkboxes.forEach((input) => { input.disabled = true; });
    if (filter) filter.disabled = true;
    if (status) status.textContent = text("Starting review…", "Review wird gestartet…");

    try {
      await startProjectSourceReview(selectedReviewPaths);
      if (!sourceReviewActive || generation !== refreshGeneration) return;
      const currentContent = document.querySelector<HTMLElement>("main.content");
      if (!currentContent) return;
      renderCurrentContent(currentContent, generation);
    } catch (cause) {
      if (!sourceReviewActive || generation !== refreshGeneration) return;
      checkboxes.forEach((input) => { input.disabled = false; });
      if (filter) filter.disabled = false;
      updateSelectionState();
      if (status) status.textContent = `${text("Review could not be started safely", "Review konnte nicht sicher gestartet werden")}: ${String(cause)}`;
    }
  });

  updateSelectionState();
};

const installRefreshControl = (content: HTMLElement, generation: number) => {
  const wrapper = document.createElement("section");
  wrapper.className = "source-review-selection source-review-refresh-panel";
  wrapper.innerHTML = `<div class="source-review-section-head"><div><span class="eyebrow">${text("Snapshot", "Snapshot")}</span><h2>${text("Project source data", "Projektquellen-Daten")}</h2><p>${text("Opening this view uses the last safe local snapshot. Refresh only when you need current repository observations and review material.", "Beim Öffnen dieser Ansicht wird der letzte sichere lokale Snapshot verwendet. Aktualisiere nur, wenn du aktuelle Repository-Beobachtungen und Review-Material benötigst.")}</p></div></div><div class="source-review-selection-actions"><button type="button" data-refresh-source-review>${text("Refresh sources & review material", "Quellen & Review-Material aktualisieren")}</button><span data-refresh-source-review-status aria-live="polite"></span></div>`;
  content.prepend(wrapper);

  const button = wrapper.querySelector<HTMLButtonElement>("[data-refresh-source-review]");
  const status = wrapper.querySelector<HTMLElement>("[data-refresh-source-review-status]");
  button?.addEventListener("click", async () => {
    button.disabled = true;
    if (status) status.textContent = text("Refreshing…", "Wird aktualisiert…");
    await refreshProjectSourceReviewPresentation();
    if (!sourceReviewActive || generation !== refreshGeneration) return;
    const currentContent = document.querySelector<HTMLElement>("main.content");
    if (!currentContent) return;
    renderCurrentContent(currentContent, generation);
  });
};

const renderCurrentContent = (content: HTMLElement, generation: number) => {
  content.innerHTML = renderProjectSourceReviewBridgeView();
  installRefreshControl(content, generation);
  bindReviewSelection(content, generation);
  void renderTelemetry(content, generation);
};

const renderIntoContent = async () => {
  const generation = ++refreshGeneration;
  const content = document.querySelector<HTMLElement>("main.content");
  if (!content || !sourceReviewActive) return;

  content.innerHTML = renderProjectSourceReviewBridgeView();
  installRefreshControl(content, generation);
  await loadProjectSourceReviewPresentation();

  if (!sourceReviewActive || generation !== refreshGeneration) return;
  const currentContent = document.querySelector<HTMLElement>("main.content");
  if (!currentContent) return;
  renderCurrentContent(currentContent, generation);
};

const installNavigation = () => {
  const nav = document.querySelector<HTMLElement>("nav.nav");
  if (!nav) return;

  nav.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => {
    if (button.dataset.sourceReviewResetBound === "true") return;
    button.dataset.sourceReviewResetBound = "true";
    button.addEventListener("click", () => {
      if (button.dataset.view !== "source-review") {
        sourceReviewActive = false;
        refreshGeneration += 1;
      }
    }, { capture: true });
  });

  const desiredLabel = text("Project Sources & Review", "Projektquellen & Prüfung");
  let button = nav.querySelector<HTMLButtonElement>("[data-view='source-review']");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "nav-item";
    button.dataset.view = "source-review";
    button.innerHTML = `${sourcesIcon()}<span>${desiredLabel}</span>`;
    nav.insertBefore(button, nav.querySelector("[data-view='diagnostics']"));
  } else {
    const label = button.querySelector<HTMLSpanElement>("span");
    if (label && label.textContent !== desiredLabel) label.textContent = desiredLabel;
  }

  if (button.dataset.sourceReviewBound !== "true") {
    button.dataset.sourceReviewBound = "true";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      sourceReviewActive = true;
      document.querySelectorAll<HTMLElement>("nav.nav .nav-item").forEach((item) => item.classList.remove("active"));
      button?.classList.add("active");
      void renderIntoContent();
    });
  }

  if (sourceReviewActive) {
    document.querySelectorAll<HTMLElement>("nav.nav .nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    const content = document.querySelector<HTMLElement>("main.content");
    const alreadyRendered = content?.querySelector(".source-review-summary, .source-review-empty");
    if (!alreadyRendered) void renderIntoContent();
  }
};

const appRoot = document.querySelector<HTMLElement>("#app");
if (appRoot) {
  const observer = new MutationObserver(() => installNavigation());
  observer.observe(appRoot, { childList: true });
}
installNavigation();
