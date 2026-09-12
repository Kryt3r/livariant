import "./project-source-review-view.css";
import "./project-source-review-lazy-view.css";
import "./github-project-telemetry.css";
import { getLanguage } from "./i18n/runtime.js";
import {
  getCurrentProjectSourceReviewPresentation,
  loadProjectSourceReviewPresentation,
} from "./project-source-review-bridge.js";
import {
  bindProjectSourceReviewHub,
  renderProjectSourceReviewHub,
} from "./project-source-review-lazy-view.js";

let sourceReviewActive = false;
let renderGeneration = 0;

const text = (en: string, de: string) => getLanguage() === "de" ? de : en;
const sourcesIcon = () => '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 5h16v4H4zM4 15h16v4H4z"/><path d="M8 9v6M16 9v6"/></svg>';

const renderHub = (content: HTMLElement, generation: number) => {
  const presentation = getCurrentProjectSourceReviewPresentation();
  content.innerHTML = renderProjectSourceReviewHub(presentation);
  bindProjectSourceReviewHub(
    content,
    presentation,
    () => sourceReviewActive && generation === renderGeneration && content.isConnected,
  );
};

const renderIntoContent = async () => {
  const generation = ++renderGeneration;
  const content = document.querySelector<HTMLElement>("main.content");
  if (!content || !sourceReviewActive) return;

  // Keep entry lightweight: show only the compact hub from the current in-memory state.
  renderHub(content, generation);

  // Read only the existing safe app-data snapshot. No repository observation, inventory,
  // telemetry or review material is scanned merely because the user opened this view.
  await loadProjectSourceReviewPresentation();
  if (!sourceReviewActive || generation !== renderGeneration) return;

  const currentContent = document.querySelector<HTMLElement>("main.content");
  if (!currentContent) return;
  renderHub(currentContent, generation);
};

const teardownHeavySection = () => {
  const heavyRoot = document.querySelector<HTMLElement>("main.content [data-source-review-heavy-root]");
  if (heavyRoot) heavyRoot.replaceChildren();
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
        renderGeneration += 1;
        teardownHeavySection();
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
    const alreadyRendered = content?.querySelector(".source-review-lazy-hub");
    if (!alreadyRendered) void renderIntoContent();
  }
};

const appRoot = document.querySelector<HTMLElement>("#app");
if (appRoot) {
  const observer = new MutationObserver(() => installNavigation());
  observer.observe(appRoot, { childList: true });
}
installNavigation();
