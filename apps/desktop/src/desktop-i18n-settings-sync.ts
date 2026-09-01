const scheduleSettingsTranslationSync = () => {
  requestAnimationFrame(() => {
    const settings = document.querySelector<HTMLElement>(".settings-modal");
    if (!settings) return;

    // The central i18n runtime owns all translations. This no-op child-list
    // mutation only asks its existing observer for one settled post-render pass
    // after the language attribute changed while Settings stayed open.
    const marker = document.createComment("i18n-settings-sync");
    settings.append(marker);
    marker.remove();
  });
};

new MutationObserver(scheduleSettingsTranslationSync).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["lang"],
});
