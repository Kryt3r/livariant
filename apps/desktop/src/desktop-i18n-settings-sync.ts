let syncScheduled = false;

const scheduleOpenSettingsRerender = () => {
  if (syncScheduled) return;
  syncScheduled = true;
  requestAnimationFrame(() => {
    syncScheduled = false;
    if (!document.querySelector(".settings-modal")) return;

    // Settings contains long-lived text nodes whose original renderer copy may
    // already have been translated. Re-render the still-open modal through the
    // existing renderer so the central i18n runtime receives fresh canonical
    // English source nodes for the newly selected language. No translation is
    // performed here and Settings stays open in the same section.
    document.querySelector<HTMLButtonElement>("[data-open-settings]")?.click();
  });
};

new MutationObserver(scheduleOpenSettingsRerender).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["lang"],
});
