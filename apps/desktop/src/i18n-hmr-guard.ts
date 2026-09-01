import "./desktop-i18n-runtime.js";
import "./desktop-i18n-host-details.js";
import "./desktop-i18n-diagnostics.js";

if (import.meta.hot) {
  import.meta.hot.accept(
    ["./desktop-i18n-runtime.js", "./desktop-i18n-host-details.js", "./desktop-i18n-diagnostics.js"],
    () => window.location.reload(),
  );
}
