import "./i18n/runtime.js";
import "./desktop-i18n.css";

type ViteHotContext = {
  accept: (dependencies: string[], callback: () => void) => void;
};

type ImportMetaWithHot = ImportMeta & {
  hot?: ViteHotContext;
};

const hot = (import.meta as ImportMetaWithHot).hot;
if (hot) {
  hot.accept(
    ["./i18n/runtime.js", "./i18n/catalog.js"],
    () => window.location.reload(),
  );
}
