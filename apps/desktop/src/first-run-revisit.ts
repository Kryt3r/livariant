const addRevisitControl = () => {
  const body = document.querySelector<HTMLElement>(".settings-content-body");
  const generalActive = document.querySelector<HTMLElement>("[data-settings-section='general'].active");
  if (!body || !generalActive || body.querySelector("[data-reopen-first-run]")) return;
  const card = document.createElement("div");
  card.className = "settings-card";
  card.innerHTML = `<div><strong>Setup assistant</strong><span>Review or continue the resumable first-run project, source and provider setup.</span></div><button class="button secondary" data-reopen-first-run type="button">Open setup</button>`;
  card.querySelector<HTMLButtonElement>("[data-reopen-first-run]")?.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("livariant:open-first-run"));
  });
  body.append(card);
};

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  if (event.target.closest("[data-open-settings], [data-settings-section='general']")) queueMicrotask(addRevisitControl);
}, { capture: true });
