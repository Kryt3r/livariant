type SettingsCopy = {
  preferences: string;
  settings: string;
  general: string;
  connections: string;
  generalDetail: string;
  foundation: string;
  foundationDetail: string;
  ready: string;
  systemDetail: string;
  systemFoundation: string;
  systemFoundationDetail: string;
  preview: string;
};

const copy = (german: boolean): SettingsCopy => german ? {
  preferences: "Einstellungen",
  settings: "Einstellungen",
  general: "Allgemein",
  connections: "Verbindungen",
  generalDetail: "Globales Verhalten und selten benötigte Konfiguration werden hier gebündelt, während die Desktop-Oberfläche wächst.",
  foundation: "Einstellungs-Basis",
  foundationDetail: "Dieser Dialog schafft einen dauerhaften Ort für Konfiguration, ohne den Hauptarbeitsbereich zu überladen.",
  ready: "Bereit",
  systemDetail: "Technische Versions- und Runtime-Informationen werden hier gebündelt, statt normale Arbeitsseiten zu belegen.",
  systemFoundation: "Foundation-Vorschau",
  systemFoundationDetail: "Systeminformationen werden bewusst in den Einstellungen gebündelt.",
  preview: "Vorschau",
} : {
  preferences: "Preferences",
  settings: "Settings",
  general: "General",
  connections: "Connections",
  generalDetail: "Global behavior and low-frequency configuration will be collected here as the Desktop surface grows.",
  foundation: "Settings foundation",
  foundationDetail: "This modal establishes the permanent home for configuration without crowding the main workspace.",
  ready: "Ready",
  systemDetail: "Technical version and runtime information will live here instead of occupying normal work pages.",
  systemFoundation: "Foundation preview",
  systemFoundationDetail: "System information is intentionally consolidated in Settings.",
  preview: "Preview",
};

const setText = (selector: string, value: string) => {
  const node = document.querySelector<HTMLElement>(selector);
  if (node && node.textContent !== value) node.textContent = value;
};

const syncSettingsLanguage = () => {
  const modal = document.querySelector<HTMLElement>(".settings-modal");
  if (!modal) return;

  const values = copy(document.documentElement.lang.toLowerCase().startsWith("de"));

  setText(".settings-heading .eyebrow", values.preferences);
  setText("#settings-title", values.settings);
  setText('[data-settings-section="general"] span', values.general);
  setText('[data-settings-section="connections"] span', values.connections);

  const active = modal.querySelector<HTMLButtonElement>("[data-settings-section].active")?.dataset.settingsSection;
  const panel = modal.querySelector<HTMLElement>(".settings-content-body .settings-panel");
  if (!panel || panel.classList.contains("connections-settings")) return;

  if (active === "general") {
    setText(".settings-content-body .settings-panel h2", values.general);
    setText(".settings-content-body .settings-panel > p", values.generalDetail);
    setText(".settings-content-body .settings-card strong", values.foundation);
    setText(".settings-content-body .settings-card div > span", values.foundationDetail);
    setText(".settings-content-body .settings-card > .settings-badge", values.ready);
    return;
  }

  if (active === "system") {
    setText(".settings-content-body .settings-panel > p", values.systemDetail);
    setText(".settings-content-body .settings-card strong", values.systemFoundation);
    setText(".settings-content-body .settings-card div > span", values.systemFoundationDetail);
    setText(".settings-content-body .settings-card > .settings-badge", values.preview);
  }
};

let scheduled = false;
const scheduleSync = () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    syncSettingsLanguage();
  });
};

new MutationObserver(scheduleSync).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["lang"],
});

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => {
    const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
    return Boolean(target?.closest(".settings-modal")) || [...mutation.addedNodes].some((node) =>
      node instanceof Element && (node.matches(".settings-modal") || Boolean(node.querySelector(".settings-modal"))),
    );
  })) scheduleSync();
}).observe(document.documentElement, { childList: true, subtree: true });

scheduleSync();
