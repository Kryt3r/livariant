const hostDetailTranslations: Record<string, string> = {
  "Bundled connector runtime is not present in this Desktop build.": "Die gebündelte Connector-Runtime ist in diesem Desktop-Build nicht enthalten.",
};

const originalText = new WeakMap<Text, string>();

const applyHostDetailTranslations = () => {
  const german = document.documentElement.lang.toLowerCase().startsWith("de");
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    const text = current as Text;
    let source = originalText.get(text);
    if (source === undefined) {
      const trimmed = text.data.trim();
      if (trimmed in hostDetailTranslations) {
        source = trimmed;
        originalText.set(text, source);
      }
    }

    if (source) {
      const next = german ? hostDetailTranslations[source] : source;
      const currentTrimmed = text.data.trim();
      if (currentTrimmed !== next) {
        text.data = text.data.replace(currentTrimmed, next);
      }
    }

    current = walker.nextNode();
  }
};

let scheduled = false;
const scheduleApply = () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    applyHostDetailTranslations();
  });
};

const observer = new MutationObserver(scheduleApply);
observer.observe(document.documentElement, { childList: true, subtree: true });

scheduleApply();
