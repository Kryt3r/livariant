const findStepCard = (target: EventTarget | null) =>
  target instanceof Element ? target.closest<HTMLElement>(".step-card") : null;

document.addEventListener(
  "click",
  (event) => {
    if (!(event.target instanceof Element)) return;

    const opensEditor = event.target.closest(".answer-step, .edit-answer");
    if (!opensEditor) return;

    const card = findStepCard(event.target);
    const defaultActions = card?.querySelector<HTMLElement>(".default-actions");
    if (!defaultActions) return;

    defaultActions.hidden = true;
    defaultActions.style.display = "none";
    defaultActions.setAttribute("aria-hidden", "true");
  },
  { capture: true },
);
