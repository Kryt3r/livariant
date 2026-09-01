import "./brand-depth-v2.css";

const STORAGE_KEY = "livariant.project-truth.accordions.v1";

type AccordionState = Record<string, boolean>;

const readState = (): AccordionState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as AccordionState : {};
  } catch {
    return {};
  }
};

const writeState = (state: AccordionState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // UI preference persistence must never block the renderer.
  }
};

const state = readState();

const chevron = `
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="m7 10 5 5 5-5" />
  </svg>`;

const applyAccordionState = () => {
  const cards = [...document.querySelectorAll<HTMLElement>(".truth-area-card[data-area]")];
  cards.forEach((card, index) => {
    const areaId = card.dataset.area;
    const head = card.querySelector<HTMLElement>(".truth-area-head");
    const actions = card.querySelector<HTMLElement>(".truth-area-head-actions");
    if (!areaId || !head || !actions) return;

    let toggle = actions.querySelector<HTMLButtonElement>(".truth-area-accordion-toggle");
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "truth-area-accordion-toggle";
      toggle.innerHTML = chevron;
      actions.prepend(toggle);
    }

    const collapsed = areaId in state ? state[areaId] : index !== 0;
    card.classList.toggle("is-collapsed", collapsed);
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", `${collapsed ? "Expand" : "Collapse"} ${areaId} Project Truth area`);

    const setCollapsed = (nextCollapsed: boolean) => {
      card.classList.toggle("is-collapsed", nextCollapsed);
      toggle?.setAttribute("aria-expanded", String(!nextCollapsed));
      toggle?.setAttribute("aria-label", `${nextCollapsed ? "Expand" : "Collapse"} ${areaId} Project Truth area`);
      state[areaId] = nextCollapsed;
      writeState(state);
    };

    if (toggle.dataset.bound !== "true") {
      toggle.dataset.bound = "true";
      toggle.addEventListener("click", (event) => {
        event.stopPropagation();
        setCollapsed(!card.classList.contains("is-collapsed"));
      });
    }

    if (head.dataset.accordionBound !== "true") {
      head.dataset.accordionBound = "true";
      head.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest("button, a, input, textarea, select, [role='button']")) return;
        setCollapsed(!card.classList.contains("is-collapsed"));
      });
    }
  });
};

let scheduled = false;
const scheduleApply = () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    applyAccordionState();
  });
};

const observer = new MutationObserver(scheduleApply);
observer.observe(document.documentElement, { childList: true, subtree: true });

scheduleApply();
