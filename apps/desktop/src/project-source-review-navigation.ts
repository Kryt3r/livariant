import "./project-source-review-view.css";
import "./github-project-telemetry.css";
import { getLanguage } from "./i18n/runtime.js";
import {
  getCurrentProjectSourceReviewPresentation,
  refreshProjectSourceReviewPresentation,
  renderProjectSourceReviewBridgeView,
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

const renderIntoContent = async () => {
  const generation = ++refreshGeneration;
  const content = document.querySelector<HTMLElement>("main.content");
  if (!content || !sourceReviewActive) return;

  content.innerHTML = renderProjectSourceReviewBridgeView();
  await refreshProjectSourceReviewPresentation();

  if (!sourceReviewActive || generation !== refreshGeneration) return;
  const currentContent = document.querySelector<HTMLElement>("main.content");
  if (!currentContent) return;
  currentContent.innerHTML = renderProjectSourceReviewBridgeView();
  void renderTelemetry(currentContent, generation);
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

const observer = new MutationObserver(() => installNavigation());
observer.observe(document.body, { childList: true, subtree: true });
installNavigation();
