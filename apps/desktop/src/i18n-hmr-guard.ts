import "./desktop-i18n-runtime.js";
import "./desktop-i18n-host-details.js";
import "./desktop-i18n-diagnostics.js";

type ViteHotContext = {
  accept: (dependencies: string[], callback: () => void) => void;
};

type ImportMetaWithHot = ImportMeta & {
  hot?: ViteHotContext;
};

const hot = (import.meta as ImportMetaWithHot).hot;
if (hot) {
  hot.accept(
    ["./desktop-i18n-runtime.js", "./desktop-i18n-host-details.js", "./desktop-i18n-diagnostics.js"],
    () => window.location.reload(),
  );
}
