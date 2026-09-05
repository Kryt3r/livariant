export type DesktopLanguage = "en" | "de";
export type I18nSegment = "common" | "navigation" | "updates" | "diagnostics" | "settings" | "projectBrain" | "connections";

export type MessageDefinition = Readonly<{
  segment: I18nSegment;
  en: string;
  de: string;
}>;

export const messages = {
  "common.ready": { segment: "common", en: "Ready", de: "Bereit" },
  "common.loading": { segment: "common", en: "Loading…", de: "Lädt…" },
  "common.unknown": { segment: "common", en: "Unknown", de: "Unbekannt" },
  "common.unavailable": { segment: "common", en: "Unavailable", de: "Nicht verfügbar" },
  "common.refresh": { segment: "common", en: "Refresh", de: "Aktualisieren" },
  "common.refreshing": { segment: "common", en: "Refreshing…", de: "Aktualisiere…" },
  "common.closeSettings": { segment: "common", en: "Close settings", de: "Einstellungen schließen" },
  "common.windowControls": { segment: "common", en: "Window controls", de: "Fenstersteuerung" },
  "common.minimize": { segment: "common", en: "Minimize", de: "Minimieren" },
  "common.maximize": { segment: "common", en: "Maximize", de: "Maximieren" },
  "common.close": { segment: "common", en: "Close", de: "Schließen" },

  "navigation.desktopFoundation": { segment: "navigation", en: "Desktop Foundation", de: "Desktop-Basis" },
  "navigation.primary": { segment: "navigation", en: "Primary navigation", de: "Hauptnavigation" },
  "navigation.overview": { segment: "navigation", en: "Overview", de: "Übersicht" },
  "navigation.projectTruth": { segment: "navigation", en: "Project Truth", de: "Projektwissen" },
  "navigation.diagnostics": { segment: "navigation", en: "Diagnostics", de: "Diagnose" },
  "navigation.updates": { segment: "navigation", en: "Updates", de: "Updates" },
  "navigation.settings": { segment: "navigation", en: "Settings", de: "Einstellungen" },
  "navigation.foundationPreview": { segment: "navigation", en: "Foundation preview", de: "Foundation-Vorschau" },
  "navigation.connectorDiagnostics": { segment: "navigation", en: "Connector + diagnostics integration", de: "Connector- und Diagnoseintegration" },

  "updates.desktopLifecycle": { segment: "updates", en: "Desktop lifecycle", de: "Desktop-Lebenszyklus" },
  "updates.evidenceBoundary": { segment: "updates", en: "Update availability is evidence. Livariant will not replace installed code until artifact and update authority are explicitly verified.", de: "Update-Verfügbarkeit ist Evidence. Livariant ersetzt installierten Code erst, wenn Artefakt und Update-Authority ausdrücklich verifiziert wurden." },
  "updates.securePreview": { segment: "updates", en: "Secure preview updates", de: "Sichere Vorschau-Updates" },
  "updates.checkBeforeChange": { segment: "updates", en: "Check before changing anything", de: "Prüfen, bevor etwas verändert wird" },
  "updates.fixedBoundary": { segment: "updates", en: "Update checks remain behind the fixed host-side updater boundary.", de: "Update-Prüfungen bleiben hinter der festen hostseitigen Updater-Grenze." },
  "updates.check": { segment: "updates", en: "Check for updates", de: "Nach Updates suchen" },
  "updates.checking": { segment: "updates", en: "Checking…", de: "Prüfe…" },
  "updates.checkingChannel": { segment: "updates", en: "Checking update channel", de: "Update-Kanal wird geprüft" },
  "updates.checkingTitle": { segment: "updates", en: "Checking for updates…", de: "Suche nach Updates…" },
  "updates.askBoundary": { segment: "updates", en: "Livariant is asking the fixed host-side updater boundary for update state.", de: "Livariant fragt die feste hostseitige Updater-Grenze nach dem Update-Status." },
  "updates.available": { segment: "updates", en: "Update available", de: "Update verfügbar" },
  "updates.current": { segment: "updates", en: "Up to date", de: "Aktuell" },
  "updates.foundation": { segment: "updates", en: "Updater foundation", de: "Updater-Basis" },
  "updates.notConfigured": { segment: "updates", en: "Update channel not configured yet", de: "Update-Kanal noch nicht konfiguriert" },
  "updates.needsAttention": { segment: "updates", en: "Update check needs attention", de: "Update-Prüfung benötigt Aufmerksamkeit" },
  "updates.didNotComplete": { segment: "updates", en: "Update check did not complete", de: "Update-Prüfung wurde nicht abgeschlossen" },
  "updates.signedIdentity": { segment: "updates", en: "Signed update identity", de: "Signierte Update-Identität" },
  "updates.verifiedBoundary": { segment: "updates", en: "Verified boundary", de: "Verifizierte Grenze" },
  "updates.rendererCannotSupply": { segment: "updates", en: "The renderer cannot supply arbitrary update URLs or executable paths.", de: "Der Renderer kann keine beliebigen Update-URLs oder ausführbaren Pfade liefern." },
  "updates.installAuthority": { segment: "updates", en: "Install authority", de: "Installations-Authority" },
  "updates.userTriggered": { segment: "updates", en: "User triggered", de: "Vom Nutzer ausgelöst" },
  "updates.availabilityDoesNotAuthorize": { segment: "updates", en: "A successful availability check alone never authorizes installation or restart.", de: "Eine erfolgreiche Verfügbarkeitsprüfung allein autorisiert niemals Installation oder Neustart." },
  "updates.checkAvailability": { segment: "updates", en: "Check availability", de: "Verfügbarkeit prüfen" },
  "updates.downloadVerify": { segment: "updates", en: "Download & verify", de: "Herunterladen & verifizieren" },
  "updates.installRestart": { segment: "updates", en: "Install & restart", de: "Installieren & neu starten" },
  "updates.awaitingApproval": { segment: "updates", en: "Awaiting approval", de: "Wartet auf Freigabe" },
  "updates.checked": { segment: "updates", en: "Checked", de: "Geprüft" },
  "updates.releaseInfo": { segment: "updates", en: "Release information", de: "Release-Informationen" },
  "updates.installedVersions": { segment: "updates", en: "Installed component versions", de: "Installierte Komponentenversionen" },

  "diagnostics.measuredEvidence": { segment: "diagnostics", en: "Measured evidence", de: "Gemessene Evidence" },
  "diagnostics.title": { segment: "diagnostics", en: "Diagnostics", de: "Diagnose" },
  "diagnostics.intro": { segment: "diagnostics", en: "These counters contain only provider/runtime-owned observations. Unknown is never replaced by synthetic zero.", de: "Diese Zähler enthalten ausschließlich provider-/runtime-eigene Beobachtungen. Unbekannt wird niemals durch eine künstliche Null ersetzt." },
  "diagnostics.period": { segment: "diagnostics", en: "Diagnostics period", de: "Diagnosezeitraum" },
  "diagnostics.day": { segment: "diagnostics", en: "1 day", de: "1 Tag" },
  "diagnostics.days7": { segment: "diagnostics", en: "7 days", de: "7 Tage" },
  "diagnostics.days30": { segment: "diagnostics", en: "30 days", de: "30 Tage" },
  "diagnostics.days90": { segment: "diagnostics", en: "90 days", de: "90 Tage" },
  "diagnostics.allTime": { segment: "diagnostics", en: "All time", de: "Gesamter Zeitraum" },
  "diagnostics.totalTokens": { segment: "diagnostics", en: "Total tokens", de: "Tokens gesamt" },
  "diagnostics.cachedInput": { segment: "diagnostics", en: "Cached input", de: "Cached Input" },
  "diagnostics.measured": { segment: "diagnostics", en: "Measured", de: "Gemessen" },
  "diagnostics.timeRange": { segment: "diagnostics", en: "Time range", de: "Zeitraum" },
  "diagnostics.last24": { segment: "diagnostics", en: "Last 24 hours", de: "Letzte 24 Stunden" },
  "diagnostics.last7": { segment: "diagnostics", en: "Last 7 days", de: "Letzte 7 Tage" },
  "diagnostics.last30": { segment: "diagnostics", en: "Last 30 days", de: "Letzte 30 Tage" },
  "diagnostics.last90": { segment: "diagnostics", en: "Last 90 days", de: "Letzte 90 Tage" },
  "diagnostics.allEvidence": { segment: "diagnostics", en: "All locally available evidence", de: "Alle lokal verfügbaren Evidenzen" },
  "diagnostics.observedEvidence": { segment: "diagnostics", en: "Observed evidence", de: "Observed Evidence" },
  "diagnostics.measuredUsage": { segment: "diagnostics", en: "Measured usage", de: "Gemessene Nutzung" },
  "diagnostics.rawValues": { segment: "diagnostics", en: "Only raw values reported through the current runtime contract.", de: "Nur Rohwerte, die über den aktuellen Runtime-Vertrag gemeldet werden." },
  "diagnostics.measuredFacts": { segment: "diagnostics", en: "Measured facts", de: "Gemessene Fakten" },
  "diagnostics.directEvidence": { segment: "diagnostics", en: "Direct provider/runtime evidence.", de: "Direkte Provider-/Runtime-Evidence." },
  "diagnostics.preventedWork": { segment: "diagnostics", en: "Prevented work", de: "Vermeidete Arbeit" },
  "diagnostics.modeledValues": { segment: "diagnostics", en: "Modeled values", de: "Modellierte Werte" },
  "diagnostics.connectionDiagnostics": { segment: "diagnostics", en: "Connection diagnostics", de: "Verbindungsdiagnose" },
  "diagnostics.measureTurn": { segment: "diagnostics", en: "Measure a real Codex turn", de: "Echten Codex-Turn messen" },
  "diagnostics.measure": { segment: "diagnostics", en: "Run measurement test", de: "Messung starten" },
  "diagnostics.measuring": { segment: "diagnostics", en: "Measuring…", de: "Messe…" },
  "diagnostics.measurementDetails": { segment: "diagnostics", en: "Measurement details", de: "Messdetails" },
  "diagnostics.providerModel": { segment: "diagnostics", en: "Provider, model availability and counter definitions", de: "Provider, Modellverfügbarkeit und Zählerdefinitionen" },
  "diagnostics.notExposed": { segment: "diagnostics", en: "Not exposed", de: "Nicht verfügbar" },
  "diagnostics.privacy": { segment: "diagnostics", en: "Privacy & interpretation:", de: "Datenschutz & Interpretation:" },
  "diagnostics.noRawCapture": { segment: "diagnostics", en: "No raw prompt/project capture by default. Observed ≠ Avoided ≠ Estimated.", de: "Standardmäßig keine Erfassung roher Prompts oder Projektdaten. Observed ≠ Avoided ≠ Estimated." },
  "diagnostics.qualifiedContract": { segment: "diagnostics", en: "This surface currently reads the qualified Codex App Server measurement contract.", de: "Diese Oberfläche liest derzeit den qualifizierten Messvertrag des Codex App Servers." },
  "diagnostics.noModelGuess": { segment: "diagnostics", en: "The current summary carries no model identifier, so Livariant does not guess one.", de: "Die aktuelle Zusammenfassung enthält keine Modellkennung; Livariant erfindet deshalb keine." },
  "diagnostics.runtimeTotal": { segment: "diagnostics", en: "Total token value reported by the runtime.", de: "Von der Runtime gemeldete Gesamtzahl der Tokens." },
  "diagnostics.runtimeInput": { segment: "diagnostics", en: "Provider input tokens where that field is reported.", de: "Vom Provider gemeldete Input-Tokens, sofern dieses Feld verfügbar ist." },
  "diagnostics.runtimeOutput": { segment: "diagnostics", en: "Provider output tokens where that field is reported.", de: "Vom Provider gemeldete Output-Tokens, sofern dieses Feld verfügbar ist." },
  "diagnostics.cacheRead": { segment: "diagnostics", en: "Cache-read input tokens; not automatically equivalent to money or time saved.", de: "Aus dem Cache gelesene Input-Tokens; sie entsprechen nicht automatisch eingespartem Geld oder Zeit." },
  "diagnostics.reasoningEvidence": { segment: "diagnostics", en: "Reasoning-token evidence where available. Unknown remains unknown.", de: "Reasoning-Token-Evidence, sofern verfügbar. Unbekannt bleibt unbekannt." },
  "diagnostics.avoidedContext": { segment: "diagnostics", en: "Avoided context", de: "Avoided-Kontext" },
  "diagnostics.estimatedTokens": { segment: "diagnostics", en: "Estimated tokens", de: "Estimated-Tokens" },

  "settings.preferences": { segment: "settings", en: "Preferences", de: "Einstellungen" },
  "settings.title": { segment: "settings", en: "Settings", de: "Einstellungen" },
  "settings.general": { segment: "settings", en: "General", de: "Allgemein" },
  "settings.connections": { segment: "settings", en: "Connections", de: "Verbindungen" },
  "settings.system": { segment: "settings", en: "System", de: "System" },
  "settings.globalBehavior": { segment: "settings", en: "Global behavior and low-frequency configuration will be collected here as the Desktop surface grows.", de: "Globales Verhalten und selten benötigte Konfiguration werden hier gebündelt, während die Desktop-Oberfläche wächst." },
  "settings.foundation": { segment: "settings", en: "Settings foundation", de: "Einstellungs-Basis" },
  "settings.foundationDetail": { segment: "settings", en: "This modal establishes the permanent home for configuration without crowding the main workspace.", de: "Dieser Dialog schafft einen dauerhaften Ort für Konfiguration, ohne den Hauptarbeitsbereich zu überladen." },
  "settings.systemDetail": { segment: "settings", en: "Technical version and runtime information will live here instead of occupying normal work pages.", de: "Technische Versions- und Runtime-Informationen werden hier gebündelt, statt normale Arbeitsseiten zu belegen." },
  "settings.systemConsolidated": { segment: "settings", en: "System information is intentionally consolidated in Settings.", de: "Systeminformationen werden bewusst in den Einstellungen gebündelt." },
  "settings.language": { segment: "settings", en: "Language", de: "Sprache" },
  "settings.appLanguage": { segment: "settings", en: "App language", de: "App-Sprache" },
  "settings.languageDetail": { segment: "settings", en: "Changes immediately and is remembered on this device.", de: "Wird sofort geändert und auf diesem Gerät gespeichert." },

  "connections.llmsAgents": { segment: "connections", en: "LLMs & agents", de: "LLMs & Agents" },
  "connections.title": { segment: "connections", en: "Connections", de: "Verbindungen" },
  "connections.description": { segment: "connections", en: "Connect the tools you work with. Livariant keeps connection state separate from project Authority.", de: "Verbinde die Werkzeuge, mit denen du arbeitest. Livariant hält Verbindungsstatus strikt von Projekt-Authority getrennt." },
  "connections.connected": { segment: "connections", en: "Connected", de: "Verbunden" },
  "connections.noProviders": { segment: "connections", en: "No providers connected", de: "Keine Anbieter verbunden" },
  "connections.needsAttention": { segment: "connections", en: "Needs attention", de: "Aufmerksamkeit nötig" },
  "connections.setupNeeded": { segment: "connections", en: "Setup needed", de: "Einrichtung nötig" },
  "connections.notChecked": { segment: "connections", en: "Not checked", de: "Nicht geprüft" },
  "connections.disconnect": { segment: "connections", en: "Disconnect", de: "Trennen" },
  "connections.connectCodex": { segment: "connections", en: "Connect Codex", de: "Codex verbinden" },

  "projectBrain.workspace": { segment: "projectBrain", en: "Project Brain workspace", de: "Project-Brain-Arbeitsbereich" },
  "projectBrain.search": { segment: "projectBrain", en: "Search Project Brain areas…", de: "Project-Brain-Bereiche durchsuchen…" },
  "projectBrain.all": { segment: "projectBrain", en: "All", de: "Alle" },
  "projectBrain.conflicts": { segment: "projectBrain", en: "Conflicts", de: "Konflikte" },
  "projectBrain.purpose": { segment: "projectBrain", en: "Purpose", de: "Zweck" },
  "projectBrain.direction": { segment: "projectBrain", en: "Direction", de: "Ausrichtung" },
  "projectBrain.rules": { segment: "projectBrain", en: "Rules", de: "Regeln" },
  "projectBrain.knowledgeGap": { segment: "projectBrain", en: "Knowledge gap", de: "Wissenslücke" },
  "projectBrain.confirmed": { segment: "projectBrain", en: "Confirmed", de: "Bestätigt" },
  "projectBrain.needsReview": { segment: "projectBrain", en: "Needs review", de: "Prüfung nötig" },
  "projectBrain.viewSource": { segment: "projectBrain", en: "View source", de: "Quelle anzeigen" },
  "projectBrain.analyze": { segment: "projectBrain", en: "Analyze", de: "Analysieren" },
  "projectBrain.reviewProposal": { segment: "projectBrain", en: "Review proposal", de: "Vorschlag prüfen" }
} as const satisfies Record<string, MessageDefinition>;

export type MessageKey = keyof typeof messages;

export const messageFor = (language: DesktopLanguage, key: MessageKey): string => messages[key][language];

export const sourceToKey = new Map<string, MessageKey>(
  (Object.entries(messages) as [MessageKey, MessageDefinition][]).map(([key, definition]) => [definition.en, key]),
);

export const germanToKey = new Map<string, MessageKey>(
  (Object.entries(messages) as [MessageKey, MessageDefinition][]).map(([key, definition]) => [definition.de, key]),
);

export const segmentKeys = (segment: I18nSegment): MessageKey[] =>
  (Object.entries(messages) as [MessageKey, MessageDefinition][])
    .filter(([, definition]) => definition.segment === segment)
    .map(([key]) => key);
