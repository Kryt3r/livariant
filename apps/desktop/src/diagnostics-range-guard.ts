const bindRangeOption = (button: HTMLButtonElement) => {
  if (button.dataset.rangeGuardBound === "true") return;
  button.dataset.rangeGuardBound = "true";
  button.addEventListener("click", (event) => {
    // connections-diagnostics currently binds preset handlers to every element carrying
    // data-diagnostics-preset, including the diagnostics root. Keep the target button's
    // handler intact, but stop the same click from bubbling into that stale root handler.
    event.stopPropagation();
  }, { capture: true });
};

const bindRangeOptions = (root: ParentNode = document) => {
  root.querySelectorAll<HTMLButtonElement>(".diagnostics-range-option[data-diagnostics-preset]")
    .forEach(bindRangeOption);
};

new MutationObserver((records) => {
  records.forEach((record) => {
    record.addedNodes.forEach((node) => {
      if (!(node instanceof Element)) return;
      if (node.matches(".diagnostics-range-option[data-diagnostics-preset]")) {
        bindRangeOption(node as HTMLButtonElement);
      }
      bindRangeOptions(node);
    });
  });
}).observe(document.documentElement, { childList: true, subtree: true });

bindRangeOptions();
