const diagnosticTranslations: Record<string, string> = {
  "This surface currently reads the qualified Codex App Server measurement contract.": "Diese Oberfläche liest derzeit den qualifizierten Messvertrag des Codex App Servers.",
  "The current summary carries no model identifier, so Livariant does not guess one.": "Die aktuelle Zusammenfassung enthält keine Modellkennung; Livariant erfindet deshalb keine.",
  "Total token value reported by the runtime.": "Von der Runtime gemeldete Gesamtzahl der Tokens.",
  "Provider input tokens where that field is reported.": "Vom Provider gemeldete Input-Tokens, sofern dieses Feld verfügbar ist.",
  "Provider output tokens where that field is reported.": "Vom Provider gemeldete Output-Tokens, sofern dieses Feld verfügbar ist.",
  "Cache-read input tokens; not automatically equivalent to money or time saved.": "Aus dem Cache gelesene Input-Tokens; sie entsprechen nicht automatisch eingespartem Geld oder Zeit.",
  "Reasoning-token evidence where available. Unknown remains unknown.": "Reasoning-Token-Evidence, sofern verfügbar. Unbekannt bleibt unbekannt.",
  "Context tokens recorded by qualified host evidence as avoided by a concrete Livariant intervention. This is not automatically money or time saved.": "Kontext-Tokens, die durch qualifizierte Host-Evidence als durch eine konkrete Livariant-Intervention vermieden erfasst wurden. Das entspricht nicht automatisch eingespartem Geld oder Zeit.",
  "Modeled token values. They remain Estimated and are never merged into Observed totals.": "Modellierte Token-Werte. Sie bleiben Estimated und werden niemals mit Observed-Gesamtwerten zusammengeführt.",
  "Loading qualified Avoided evidence...": "Qualifizierte Avoided-Evidence wird geladen...",
  "Loading explicitly modeled evidence...": "Explizit modellierte Evidence wird geladen...",
  "Loading qualified Avoided evidence…": "Qualifizierte Avoided-Evidence wird geladen…",
  "Loading explicitly modeled evidence…": "Explizit modellierte Evidence wird geladen…",
  "Avoided context": "Avoided-Kontext",
  "Estimated tokens": "Estimated-Tokens"
};

const sourceText = new WeakMap<Text, string>();

const applyDiagnosticTranslations = () => {
  const german = document.documentElement.lang.toLowerCase().startsWith("de");
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    const node = current as Text;
    const parent = node.parentElement;
    if (parent?.closest("textarea, input, code, pre, script, style, svg, [data-i18n-ignore]")) {
      current = walker.nextNode();
      continue;
    }

    let source = sourceText.get(node);
    if (source === undefined) {
      source = node.data;
      sourceText.set(node, source);
    }
    const trimmed = source.trim();
    if (trimmed) {
      const replacement = german ? diagnosticTranslations[trimmed] : undefined;
      const next = source.replace(trimmed, replacement ?? trimmed);
      if (node.data !== next) node.data = next;
    }
    current = walker.nextNode();
  }
};

let scheduled = false;
const scheduleDiagnosticTranslations = () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    applyDiagnosticTranslations();
  });
};

new MutationObserver(scheduleDiagnosticTranslations).observe(document.documentElement, { childList: true, subtree: true });
new MutationObserver(scheduleDiagnosticTranslations).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

scheduleDiagnosticTranslations();
