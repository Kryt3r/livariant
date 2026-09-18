/* WP-056 visual QA only.
   This entry is never loaded by the production Desktop entry point. It renders the
   real Desktop renderer/shell in Vite and supplies only the minimal native bridge
   fixtures needed to inspect visual fidelity without installing the Rust toolchain. */

type VisualInvoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

const previewParams = new URLSearchParams(window.location.search);
const previewScenario = previewParams.get("scenario") ?? "normal";
const previewLanguage = previewParams.get("lang");
if (previewLanguage === "de" || previewLanguage === "en") {
  localStorage.setItem("livariant.desktop.language.v1", previewLanguage);
}

const diagnosticFixture = {
  preset: "30d",
  range: { start: "2026-08-18T00:00:00Z", end: "2026-09-16T23:59:59Z" },
  hasObservedData: true,
  storage: "Local diagnostics history",
  observed: {
    eventCount: 286,
    inputTokens: 184200,
    outputTokens: 96500,
    cacheReadTokens: 74200,
    cacheWriteTokens: 21400,
    reasoningTokens: 35600,
    totalTokens: 411900,
    knownFieldCount: 482,
    unknownFieldCount: 18,
  },
  avoided: { eventCount: 41, contextTokens: 128400 },
  estimated: { eventCount: 17, tokens: 32900 },
  attribution: {
    provider: {
      attributedEventCount: 280,
      unattributedEventCount: 6,
      groups: [
        { value: "Codex", eventCount: 178, totalTokens: 261400, knownTotalTokenEvents: 174, unknownTotalTokenEvents: 4 },
        { value: "Claude", eventCount: 72, totalTokens: 104300, knownTotalTokenEvents: 71, unknownTotalTokenEvents: 1 },
        { value: "Gemini", eventCount: 30, totalTokens: 46200, knownTotalTokenEvents: 29, unknownTotalTokenEvents: 1 },
      ],
    },
    model: {
      attributedEventCount: 254,
      unattributedEventCount: 32,
      groups: [
        { value: "gpt-5.6-sol", eventCount: 146, totalTokens: 218700, knownTotalTokenEvents: 143, unknownTotalTokenEvents: 3 },
        { value: "claude-sonnet-4.6", eventCount: 71, totalTokens: 103100, knownTotalTokenEvents: 70, unknownTotalTokenEvents: 1 },
        { value: "gemini-2.5-pro", eventCount: 37, totalTokens: 50900, knownTotalTokenEvents: 36, unknownTotalTokenEvents: 1 },
      ],
    },
    projectId: {
      attributedEventCount: 274,
      unattributedEventCount: 12,
      groups: [
        { value: "livariant", eventCount: 164, totalTokens: 232800, knownTotalTokenEvents: 160, unknownTotalTokenEvents: 4 },
        { value: "socariant", eventCount: 61, totalTokens: 91500, knownTotalTokenEvents: 60, unknownTotalTokenEvents: 1 },
        { value: "runforge", eventCount: 31, totalTokens: 52900, knownTotalTokenEvents: 30, unknownTotalTokenEvents: 1 },
        { value: "phosort", eventCount: 18, totalTokens: 24700, knownTotalTokenEvents: 18, unknownTotalTokenEvents: 0 },
      ],
    },
    sessionId: {
      attributedEventCount: 267,
      unattributedEventCount: 19,
      groups: [
        { value: "session-104", eventCount: 74, totalTokens: 103300, knownTotalTokenEvents: 72, unknownTotalTokenEvents: 2 },
        { value: "session-103", eventCount: 61, totalTokens: 89400, knownTotalTokenEvents: 60, unknownTotalTokenEvents: 1 },
        { value: "session-101", eventCount: 48, totalTokens: 75600, knownTotalTokenEvents: 47, unknownTotalTokenEvents: 1 },
        { value: "session-099", eventCount: 37, totalTokens: 59200, knownTotalTokenEvents: 36, unknownTotalTokenEvents: 1 },
      ],
    },
    taskId: {
      attributedEventCount: 275,
      unattributedEventCount: 11,
      groups: [
        { value: "WP-056", eventCount: 121, totalTokens: 182700, knownTotalTokenEvents: 119, unknownTotalTokenEvents: 2 },
        { value: "WP-055", eventCount: 66, totalTokens: 98200, knownTotalTokenEvents: 64, unknownTotalTokenEvents: 2 },
        { value: "release-prep", eventCount: 49, totalTokens: 77400, knownTotalTokenEvents: 48, unknownTotalTokenEvents: 1 },
        { value: "docs-polish", eventCount: 39, totalTokens: 53600, knownTotalTokenEvents: 39, unknownTotalTokenEvents: 0 },
      ],
    },
  },
};

const emptyDiagnosticFixture = {
  ...diagnosticFixture,
  hasObservedData: false,
  observed: {
    eventCount: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    knownFieldCount: 0,
    unknownFieldCount: 0,
  },
  avoided: { eventCount: 0, contextTokens: 0 },
  estimated: { eventCount: 0, tokens: 0 },
  attribution: {
    provider: { attributedEventCount: 0, unattributedEventCount: 0, groups: [] },
    model: { attributedEventCount: 0, unattributedEventCount: 0, groups: [] },
    projectId: { attributedEventCount: 0, unattributedEventCount: 0, groups: [] },
    sessionId: { attributedEventCount: 0, unattributedEventCount: 0, groups: [] },
    taskId: { attributedEventCount: 0, unattributedEventCount: 0, groups: [] },
  },
};

const partialDiagnosticFixture = {
  ...diagnosticFixture,
  observed: {
    ...diagnosticFixture.observed,
    knownFieldCount: 212,
    unknownFieldCount: 188,
  },
  attribution: {
    ...diagnosticFixture.attribution,
    model: {
      attributedEventCount: 121,
      unattributedEventCount: 165,
      groups: [
        { value: "gpt-5.6-sol", eventCount: 121, totalTokens: 182400, knownTotalTokenEvents: 93, unknownTotalTokenEvents: 28 },
      ],
    },
    taskId: {
      attributedEventCount: 134,
      unattributedEventCount: 152,
      groups: [
        { value: "WP-056", eventCount: 94, totalTokens: 132700, knownTotalTokenEvents: 78, unknownTotalTokenEvents: 16 },
        { value: "WP-055", eventCount: 40, totalTokens: 59800, knownTotalTokenEvents: 31, unknownTotalTokenEvents: 9 },
      ],
    },
  },
};

const currentFixture = () => previewScenario === "empty"
  ? emptyDiagnosticFixture
  : previewScenario === "partial"
    ? partialDiagnosticFixture
    : diagnosticFixture;

const measurementFixture = () => {
  const now = Date.now();
  const measuredAt = new Date(now - 60 * 60 * 1000).toISOString();
  const retryAt = new Date(now + 5 * 60 * 60 * 1000).toISOString();
  const baseTarget = {
    provider: "openai-codex",
    isDefault: true,
    lastSuccessfulAt: measuredAt,
    retryAt,
    ready: false,
    readiness: "cooldown" as const,
  };
  if (previewScenario === "cooldown") {
    return {
      provider: "openai-codex",
      scope: "model",
      available: true,
      cooldownMs: 21_600_000,
      readyTargetCount: 0,
      unmeasuredTargetCount: 0,
      nextRetryAt: retryAt,
      detail: null,
      targets: [{ ...baseTarget, model: "gpt-5.6-sol", displayName: "GPT-5.6 Sol" }],
    };
  }
  return {
    provider: "openai-codex",
    scope: "model",
    available: true,
    cooldownMs: 21_600_000,
    readyTargetCount: 1,
    unmeasuredTargetCount: 1,
    nextRetryAt: retryAt,
    detail: null,
    targets: [
      { ...baseTarget, model: "gpt-5.6-sol", displayName: "GPT-5.6 Sol" },
      {
        provider: "openai-codex",
        model: "gpt-5.6-pro",
        displayName: "GPT-5.6 Pro",
        isDefault: false,
        lastSuccessfulAt: null,
        retryAt: null,
        ready: true,
        readiness: "unmeasured",
      },
    ],
  };
};

const invoke: VisualInvoke = async (command, args) => {
  if (command === "plugin:event|listen") return 1;
  if (command === "plugin:event|unlisten") return null;
  if (command === "codex_connector_status") {
    return {
      installationState: "available",
      version: "visual-qa",
      connected: true,
      connectionState: "connected",
      pendingApprovals: 0,
      detail: "Visual QA fixture: connected",
      connectionMode: "auto",
      configuredCommand: null,
    };
  }
  if (command === "codex_diagnostics_summary") {
    return { ...currentFixture(), measurement: measurementFixture(), preset: (args?.preset as string | undefined) ?? "30d" };
  }
  if (command === "codex_diagnostics_measure") {
    return {
      connection: { connected: true },
      measuredTarget: { provider: "openai-codex", model: "gpt-5.6-pro", displayName: "GPT-5.6 Pro", scope: "model" },
      diagnostics: { ...currentFixture(), measurement: measurementFixture() },
    };
  }
  if (command === "save_codex_diagnostics_export") {
    return { saved: true, fileName: "livariant-diagnostics-visual-qa.json" };
  }
  if (command === "operator_live_notice_list") {
    const severity = previewScenario === "operator-critical" ? "critical" : "warning";
    const hasNotice = previewScenario === "operator-warning" || previewScenario === "operator-critical";
    return {
      schemaVersion: 1,
      notices: hasNotice ? [{
        id: `visual-${severity}`,
        severity,
        title: severity === "critical" ? "Dienst vorübergehend eingeschränkt" : "Geplantes Wartungsfenster",
        body: severity === "critical"
          ? "Ein Teil des Livariant-Dienstes ist aktuell nicht erreichbar. Lokale Projektarbeit bleibt davon unberührt."
          : "Am 18. September kann der Livariant-Dienst zwischen 14:00 und 14:20 Uhr kurzzeitig nicht erreichbar sein.",
        createdAtMs: Date.now() - 15 * 60 * 1000,
        sourceRef: "operator:visual-qa",
        activeUntilMs: Date.now() + 2 * 60 * 60 * 1000,
      }] : [],
    };
  }
  throw new Error(`Native command '${command}' is unavailable in the visual QA preview.`);
};

Object.defineProperty(window, "__TAURI_INTERNALS__", {
  configurable: true,
  value: {
    invoke,
    transformCallback: () => 1,
    metadata: {
      currentWindow: { label: "main" },
      currentWebview: { label: "main" },
    },
  },
});

await import("./main.js");
await import("./project-source-review-navigation.js");
await import("./shell-redesign.js");
await import("./diagnostics-cockpit.js");
await import("./diagnostics-empty-state-polish.js");
await import("./first-run-revisit.js");
await import("./wp056-redesign-polish.js");
await import("./operator-live-notice.js");

window.requestAnimationFrame(() => {
  const view = previewParams.get("view") ?? "overview";
  if (view === "diagnostics") {
    document.querySelector<HTMLButtonElement>("nav.nav [data-view='diagnostics']")?.click();
    window.setTimeout(() => {
      const tab = previewParams.get("tab");
      if (tab) document.querySelector<HTMLButtonElement>(`[data-dc-tab='${tab}']`)?.click();

      const preset = previewParams.get("preset");
      const presetSelect = document.querySelector<HTMLSelectElement>(".dc-preset");
      if (preset && presetSelect) {
        presetSelect.value = preset;
        presetSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }

      const action = previewParams.get("action");
      if (action === "export") {
        window.setTimeout(() => document.querySelector<HTMLButtonElement>(".dc-export")?.click(), 250);
      } else if (action === "measure") {
        window.setTimeout(() => document.querySelector<HTMLButtonElement>(".dc-measure-polish")?.click(), 500);
      }
    }, 250);
    return;
  }
  if (view === "settings") {
    document.querySelector<HTMLButtonElement>("nav.nav [data-view='overview']")?.click();
    window.setTimeout(() => {
      document.querySelector<HTMLButtonElement>("[data-open-settings]")?.click();
      const section = previewParams.get("section");
      if (section) window.setTimeout(() => document.querySelector<HTMLButtonElement>(`[data-settings-section='${section}']`)?.click(), 120);
    }, 250);
    return;
  }
  if (view === "steps") {
    document.querySelector<HTMLButtonElement>("nav.nav [data-view='steps']")?.click();
    return;
  }
  document.querySelector<HTMLButtonElement>("nav.nav [data-view='overview']")?.click();
});