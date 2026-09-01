const I18N_MODULES = [
  "./desktop-i18n-runtime.js",
  "./desktop-i18n-host-details.js",
  "./desktop-i18n-diagnostics.js",
] as const;

if (import.meta.hot) {
  import.meta.hot.accept([...I18N_MODULES], () => window.location.reload());
}
