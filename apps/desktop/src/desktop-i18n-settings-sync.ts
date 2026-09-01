let syncScheduled = false;

const scheduleSettingsTranslationSync = () => {
  if (syncScheduled) return;
  syncScheduled = true;
  requestAnimationFrame(() => {
    syncScheduled = false;
    const settings = document.querySelector<HTMLElement>(".settings-modal");
    if (!settings) return;

    // Translation remains owned by the central i18n runtime. Settings can render
    // sections and provider state independently after a language change, so poke
    // the existing central observer once after those Settings-owned DOM updates
    // have settled instead of translating a second time here.
    const marker = document.createComment("i18n-settings-sync");
    document.body.append(marker);
    marker.remove();
  });
};

new MutationObserver(scheduleSettingsTranslationSync).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["lang"],
});

new MutationObserver((mutations) => {
  const touchesSettings = mutations.some((mutation) => {
    const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
    if (target?.closest(".settings-modal")) return true;
    return [...mutation.addedNodes].some((node) =>
      node instanceof Element && (node.matches(".settings-modal") || Boolean(node.querySelector(".settings-modal"))),
    );
  });
  if (touchesSettings) scheduleSettingsTranslationSync();
}).observe(document.documentElement, { childList: true, subtree: true });
