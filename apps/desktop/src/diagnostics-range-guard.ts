const bindRangeOption = (button: HTMLButtonElement) => {
  if (button.dataset.rangeGuardBound === "true") return;
  button.dataset.rangeGuardBound = "true";
  button.addEventListener("click", (event) => {
    // Let the button's own diagnostics preset handler run first, then stop the same
    // click from bubbling into the stale surface-level preset handler.
    event.stopPropagation();
  });
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
