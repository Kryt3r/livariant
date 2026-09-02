import "./desktop-i18n.css";
import { invoke } from "@tauri-apps/api/core";

type DesktopLanguage = "en" | "de";

const STORAGE_KEY = "livariant.desktop.language.v1";
const textSources = new WeakMap<Text, string>();
const attributeSources = new WeakMap<Element, Map<string, string>>();

const de: Record<string, string> = {
  "Desktop Foundation": "Desktop-Basis",
  "Overview": "Übersicht",
  "Project Truth": "Projektwissen",
  "Diagnostics": "Diagnose",
  "Settings": "Einstellungen",
  "Foundation preview": "Foundation-Vorschau",
  "Connector + diagnostics integration": "Connector- und Diagnoseintegration",
  "Project Brain workspace": "Project-Brain-Arbeitsbereich",
  "A clear view over Livariant's existing Project Brain: inspect current knowledge, tell Livariant what changed and review every canonical update before it is accepted.": "Eine klare Sicht auf Livariants bestehendes Project Brain: Wissen prüfen, Änderungen mitteilen und jede kanonische Aktualisierung vor der Übernahme kontrollieren.",
  "Current project": "Aktuelles Projekt",
  "No project selected": "Kein Projekt ausgewählt",
  "Search Project Brain areas…": "Project-Brain-Bereiche durchsuchen…",
  "Confirmed areas": "Bestätigte Bereiche",
  "Needs review": "Prüfung nötig",
  "Knowledge gaps": "Wissenslücken",
  "Potential conflicts": "Mögliche Konflikte",
  "Curated areas": "Kuratierte Bereiche",
  "Work with Project Brain without growing an endless list": "Mit Project Brain arbeiten, ohne eine endlose Liste aufzubauen",
  "All": "Alle",
  "Conflicts": "Konflikte",
  "Purpose": "Zweck",
  "Project purpose": "Projektzweck",
  "Why the project exists and which outcome it is meant to create.": "Warum das Projekt existiert und welches Ergebnis es erreichen soll.",
  "What is this project for? Describe the outcome or problem it exists to address.": "Wofür ist dieses Projekt gedacht? Beschreibe das Ergebnis oder Problem, das es erreichen beziehungsweise lösen soll.",
  "Direction": "Ausrichtung",
  "Current direction": "Aktuelle Ausrichtung",
  "The active product direction and the next meaningful outcome.": "Die aktive Produktausrichtung und das nächste sinnvolle Ergebnis.",
  "What is the current product direction or the next useful outcome?": "Was ist die aktuelle Produktausrichtung oder das nächste sinnvolle Ergebnis?",
  "Rules": "Regeln",
  "Rules & constraints": "Regeln & Grenzen",
  "Protected properties, boundaries and constraints that current work must preserve.": "Geschützte Eigenschaften, Grenzen und Vorgaben, die bei aktueller Arbeit erhalten bleiben müssen.",
  "Which project rules or constraints must Livariant never violate?": "Welche Projektregeln oder Grenzen darf Livariant niemals verletzen?",
  "Knowledge gap": "Wissenslücke",
  "Deferred": "Zurückgestellt",
  "Confirmed": "Bestätigt",
  "Conflict to review": "Konflikt prüfen",
  "View source": "Quelle anzeigen",
  "Project Brain snapshot": "Project-Brain-Snapshot",
  "Current canonical knowledge": "Aktuelles kanonisches Wissen",
  "No canonical knowledge loaded yet": "Noch kein kanonisches Wissen geladen",
  "This renderer preview does not create a separate Project Truth store. Once the Project Brain bridge is connected, this area will display the relevant existing canonical knowledge here.": "Diese Renderer-Vorschau erzeugt keinen separaten Wissensspeicher. Sobald die Project-Brain-Bridge verbunden ist, erscheint hier das relevante bestehende kanonische Wissen.",
  "Potential conflict": "Möglicher Konflikt",
  "Proposal waiting": "Vorschlag wartet",
  "Review proposal": "Vorschlag prüfen",
  "Tell Livariant what changed, what is missing or what should be reconsidered in this area.": "Teile Livariant mit, was sich geändert hat, was fehlt oder was in diesem Bereich neu bewertet werden sollte.",
  "Tell Livariant what changed…": "Teile Livariant mit, was sich geändert hat…",
  "Input stays evidence until review.": "Die Eingabe bleibt bis zur Prüfung Evidence.",
  "Analyze": "Analysieren",
  "Manual review required": "Manuelle Prüfung erforderlich",
  "Review Project Brain change": "Project-Brain-Änderung prüfen",
  "Livariant may analyze and propose. Canonical project knowledge changes only after your decision.": "Livariant darf analysieren und Vorschläge machen. Kanonisches Projektwissen ändert sich erst nach deiner Entscheidung.",
  "Confirmed Project Brain knowledge would change.": "Bestätigtes Project-Brain-Wissen würde verändert.",
  "The renderer cannot prove semantic compatibility yet, so Livariant keeps the current truth untouched until you explicitly resolve the proposal.": "Der Renderer kann semantische Kompatibilität noch nicht nachweisen. Deshalb bleibt das aktuelle Wissen unverändert, bis du den Vorschlag ausdrücklich auflöst.",
  "Area": "Bereich",
  "Conflict state": "Konfliktstatus",
  "Review required": "Prüfung erforderlich",
  "None detected": "Keiner erkannt",
  "Proposed effect": "Vorgeschlagene Wirkung",
  "Livariant analysis": "Livariant-Analyse",
  "Current canonical statement": "Aktuelle kanonische Aussage",
  "No confirmed Project Brain statement is loaded for this area yet.": "Für diesen Bereich ist noch keine bestätigte Project-Brain-Aussage geladen.",
  "User input": "Nutzereingabe",
  "Evidence submitted from Desktop": "Über Desktop eingereichte Evidence",
  "Edit proposal": "Vorschlag bearbeiten",
  "Change preview": "Änderungsvorschau",
  "What this renderer preview would change": "Was diese Renderer-Vorschau ändern würde",
  "Current Project Brain": "Aktuelles Project Brain",
  "Proposed Project Brain": "Vorgeschlagenes Project Brain",
  "Proposed addition": "Vorgeschlagene Ergänzung",
  "Decision": "Entscheidung",
  "Choose what should become canonical knowledge.": "Wähle, was kanonisches Wissen werden soll.",
  "Reject evidence": "Evidence ablehnen",
  "Keep existing": "Bestehendes behalten",
  "Accept into Project Truth": "In Project Truth übernehmen",
  "Existing Project Brain": "Bestehendes Project Brain",
  "Project Truth does not own another copy. This view is reserved for the existing canonical Project Brain source that backs this area.": "Project Truth besitzt keine weitere Kopie. Diese Ansicht ist für die bestehende kanonische Project-Brain-Quelle reserviert, die diesen Bereich trägt.",
  "Renderer preview:": "Renderer-Vorschau:",
  "Rendered": "Gerendert",
  "Raw Markdown": "Rohes Markdown",
  "Nothing matches this view": "Nichts passt zu dieser Ansicht",
  "Try another search or filter.": "Versuche eine andere Suche oder einen anderen Filter.",
  "One canonical brain, multiple input surfaces.": "Ein kanonisches Brain, mehrere Eingabeoberflächen.",
  "New": "Neu",
  "Adds new durable knowledge to this Project Brain area.": "Fügt diesem Project-Brain-Bereich neues dauerhaftes Wissen hinzu.",
  "No material change": "Keine wesentliche Änderung",
  "The proposed statement matches the currently confirmed Project Brain knowledge.": "Die vorgeschlagene Aussage entspricht dem aktuell bestätigten Project-Brain-Wissen.",
  "Extends": "Erweitert",
  "The proposal contains the existing statement and adds more context. Until semantic Project Brain analysis is connected, Livariant treats any material change to confirmed knowledge as potentially conflicting and requires review.": "Der Vorschlag enthält die bestehende Aussage und ergänzt weiteren Kontext. Solange die semantische Project-Brain-Analyse noch nicht verbunden ist, behandelt Livariant jede wesentliche Änderung an bestätigtem Wissen als potenziellen Konflikt und verlangt eine Prüfung.",
  "Refines": "Präzisiert",
  "The proposal narrows the existing statement. Until semantic Project Brain analysis is connected, this remains a potential conflict that requires review.": "Der Vorschlag präzisiert die bestehende Aussage. Solange die semantische Project-Brain-Analyse noch nicht verbunden ist, bleibt dies ein potenzieller Konflikt, der geprüft werden muss.",
  "Replaces": "Ersetzt",
  "The proposal is materially different from the currently confirmed statement and may replace it.": "Der Vorschlag unterscheidet sich wesentlich von der aktuell bestätigten Aussage und könnte sie ersetzen.",
  "Desktop lifecycle": "Desktop-Lebenszyklus",
  "Update availability is evidence. Livariant will not replace installed code until artifact and update authority are explicitly verified.": "Update-Verfügbarkeit ist Evidence. Livariant ersetzt installierten Code erst, wenn Artefakt und Update-Authority ausdrücklich verifiziert wurden.",
  "Secure preview updates": "Sichere Vorschau-Updates",
  "Check before changing anything": "Prüfen, bevor etwas verändert wird",
  "Update checks remain behind the fixed host-side updater boundary.": "Update-Prüfungen bleiben hinter der festen hostseitigen Updater-Grenze.",
  "Check for updates": "Nach Updates suchen",
  "Checking…": "Prüfe…",
  "Checking update channel": "Update-Kanal wird geprüft",
  "Checking for updates…": "Suche nach Updates…",
  "Livariant is asking the fixed host-side updater boundary for update state.": "Livariant fragt die feste hostseitige Updater-Grenze nach dem Update-Status.",
  "Update available": "Update verfügbar",
  "Up to date": "Aktuell",
  "Updater foundation": "Updater-Basis",
  "Update channel not configured yet": "Update-Kanal noch nicht konfiguriert",
  "Update check needs attention": "Update-Prüfung benötigt Aufmerksamkeit",
  "Update check did not complete": "Update-Prüfung wurde nicht abgeschlossen",
  "Check availability": "Verfügbarkeit prüfen",
  "Ask the fixed host-side updater boundary whether a newer trusted update exists.": "Die feste hostseitige Updater-Grenze fragen, ob ein neueres vertrauenswürdiges Update existiert.",
  "Download & verify": "Herunterladen & verifizieren",
  "Future progress belongs here only when the Desktop contract exposes real artifact download and verification state.": "Fortschritt wird hier erst angezeigt, wenn der Desktop-Vertrag echten Download- und Verifizierungsstatus liefert.",
  "Install & restart": "Installieren & neu starten",
  "Installation remains a separate explicit action. Availability alone never authorizes replacing installed code.": "Die Installation bleibt eine separate ausdrückliche Aktion. Verfügbarkeit allein autorisiert niemals das Ersetzen installierten Codes.",
  "Ready": "Bereit",
  "Checked": "Geprüft",
  "Checking": "Prüft",
  "Not exposed yet": "Noch nicht verfügbar",
  "User authorized": "Nutzerautorisiert",
  "Update details": "Update-Details",
  "Trust boundary, authority and release metadata": "Vertrauensgrenze, Authority und Release-Metadaten",
  "Update identity": "Update-Identität",
  "Fixed trusted boundary": "Feste vertrauenswürdige Grenze",
  "The renderer cannot supply arbitrary update URLs or executable paths.": "Der Renderer kann keine beliebigen Update-URLs oder ausführbaren Pfade liefern.",
  "Install authority": "Installations-Authority",
  "Separate user action": "Separate Nutzeraktion",
  "A successful check does not authorize installation, restart or replacement of installed code.": "Eine erfolgreiche Prüfung autorisiert weder Installation noch Neustart oder das Ersetzen installierten Codes.",
  "Release information": "Release-Informationen",
  "The current Desktop result does not carry structured release notes, so Livariant does not invent them.": "Das aktuelle Desktop-Ergebnis enthält keine strukturierten Release Notes; Livariant erfindet deshalb keine.",
  "Installed component versions": "Installierte Komponentenversionen",
  "Loading…": "Lädt…",
  "Unavailable": "Nicht verfügbar",
  "Version unavailable": "Version nicht verfügbar",
  "Node unknown": "Node unbekannt",
  "Protected components": "Geschützte Komponenten",
  "Guardian": "Guardian",
  "Bundled Core health is loading.": "Status des gebündelten Core wird geladen.",
  "Bundled runtime health is loading.": "Status der gebündelten Runtime wird geladen.",
  "Desktop version is loading.": "Desktop-Version wird geladen.",
  "Preferences": "Einstellungen",
  "General": "Allgemein",
  "Connections": "Verbindungen",
  "Global behavior and low-frequency configuration will be collected here as the Desktop surface grows.": "Globales Verhalten und selten benötigte Konfiguration werden hier gebündelt, während die Desktop-Oberfläche wächst.",
  "Settings foundation": "Einstellungs-Basis",
  "This modal establishes the permanent home for configuration without crowding the main workspace.": "Dieser Dialog schafft einen dauerhaften Ort für Konfiguration, ohne den Hauptarbeitsbereich zu überladen.",
  "Technical version and runtime information will live here instead of occupying normal work pages.": "Technische Versions- und Runtime-Informationen werden hier gebündelt, statt normale Arbeitsseiten zu belegen.",
  "System information is intentionally consolidated in Settings.": "Systeminformationen werden bewusst in den Einstellungen gebündelt.",
  "Preview": "Vorschau",
  "LLMs & agents": "LLMs & Agents",
  "Connect the tools you work with. Livariant keeps connection state separate from project Authority.": "Verbinde die Werkzeuge, mit denen du arbeitest. Livariant hält Verbindungsstatus strikt von Projekt-Authority getrennt.",
  "connected": "verbunden",
  "No providers connected": "Keine Anbieter verbunden",
  "Provider setup stays here in Settings so the main workspace remains focused.": "Die Anbieter-Einrichtung bleibt hier in den Einstellungen, damit der Hauptarbeitsbereich fokussiert bleibt.",
  "Connect Livariant through the official local Codex App Server boundary.": "Verbinde Livariant über die offizielle lokale Codex-App-Server-Grenze.",
  "Connected": "Verbunden",
  "Needs attention": "Aufmerksamkeit nötig",
  "Setup needed": "Einrichtung nötig",
  "Not checked": "Nicht geprüft",
  "Inspecting the local Codex installation…": "Lokale Codex-Installation wird geprüft…",
  "Codex was found but cannot be used yet": "Codex wurde gefunden, kann aber noch nicht verwendet werden",
  "Codex CLI was not found on this machine": "Codex CLI wurde auf diesem Gerät nicht gefunden",
  "Open Codex to check the local connection": "Öffne Codex, um die lokale Verbindung zu prüfen",
  "Connection": "Verbindung",
  "Connection needs attention": "Verbindung benötigt Aufmerksamkeit",
  "Codex is connected": "Codex ist verbunden",
  "Ready for one-click connection": "Bereit für die Ein-Klick-Verbindung",
  "Codex setup required": "Codex-Einrichtung erforderlich",
  "Refresh": "Aktualisieren",
  "Disconnect": "Trennen",
  "Disconnecting…": "Trenne…",
  "Connect Codex": "Codex verbinden",
  "Connecting…": "Verbinde…",
  "Codex CLI is required": "Codex CLI ist erforderlich",
  "Livariant could not find a usable local Codex installation. Install the official Codex CLI, then choose Refresh. A future guided setup may perform installation steps for you only after a clear permission request that shows exactly what will be changed.": "Livariant konnte keine nutzbare lokale Codex-Installation finden. Installiere die offizielle Codex CLI und wähle anschließend Aktualisieren. Eine spätere geführte Einrichtung darf Installationsschritte nur nach einer klaren Freigabe ausführen, die exakt zeigt, was verändert wird.",
  "Installation": "Installation",
  "App Server": "App Server",
  "Unusable": "Nicht nutzbar",
  "Not detected": "Nicht erkannt",
  "Connection method": "Verbindungsmethode",
  "Approvals": "Freigaben",
  "Automatic": "Automatisch",
  "Local fallback": "Lokaler Fallback",
  "Not active": "Nicht aktiv",
  "Disconnected": "Getrennt",
  "Authority stays separate.": "Authority bleibt getrennt.",
  "Connecting Codex does not authorize file changes, commands, merges or releases.": "Das Verbinden von Codex autorisiert keine Dateiänderungen, Befehle, Merges oder Releases.",
  "Close Codex settings": "Codex-Einstellungen schließen",
  "Close provider details": "Anbieterdetails schließen",
  "Available LLM and agent connections": "Verfügbare LLM- und Agent-Verbindungen",
  "OpenAI · local App Server": "OpenAI · lokaler App Server",
  "Anthropic · provider support": "Anthropic · Anbieter-Unterstützung",
  "Google · provider support": "Google · Anbieter-Unterstützung",
  "Advanced provider setup": "Erweiterte Anbieter-Einrichtung",
  "Custom connection": "Eigene Verbindung",
  "Advanced": "Erweitert",
  "Planned": "Geplant",
  "Not available in this preview": "In dieser Vorschau nicht verfügbar",
  "Claude connection support is part of the provider expansion, but it is not enabled in this preview yet.": "Claude-Unterstützung ist Teil der Anbieter-Erweiterung, aber in dieser Vorschau noch nicht aktiviert.",
  "Gemini connection support is planned, but Livariant does not currently claim a working Gemini connection boundary.": "Gemini-Unterstützung ist geplant, aber Livariant beansprucht derzeit noch keine funktionierende Gemini-Verbindungsgrenze.",
  "Custom provider connections are planned for advanced setups. The capability and authority boundary must be defined before this option becomes active.": "Eigene Anbieter-Verbindungen sind für erweiterte Setups geplant. Capability- und Authority-Grenzen müssen definiert sein, bevor diese Option aktiv wird.",
  "This entry is visible now so the Connections layout already scales to multiple providers without pretending unsupported functionality exists.": "Dieser Eintrag ist bereits sichtbar, damit das Verbindungs-Layout auf mehrere Anbieter vorbereitet ist, ohne nicht unterstützte Funktionen vorzutäuschen.",
  "Connections now live in Settings. This compatibility view uses the same provider overview.": "Verbindungen befinden sich jetzt in den Einstellungen. Diese Kompatibilitätsansicht nutzt dieselbe Anbieterübersicht.",
  "Measured evidence": "Gemessene Evidence",
  "These counters contain only provider/runtime-owned observations. Unknown is never replaced by synthetic zero.": "Diese Zähler enthalten ausschließlich provider-/runtime-eigene Beobachtungen. Unbekannt wird niemals durch eine künstliche Null ersetzt.",
  "Measured usage": "Gemessene Nutzung",
  "Observed evidence": "Observed Evidence",
  "Only raw values reported through the current runtime contract.": "Nur Rohwerte, die über den aktuellen Runtime-Vertrag gemeldet werden.",
  "Measured facts": "Gemessene Fakten",
  "Direct provider/runtime evidence.": "Direkte Provider-/Runtime-Evidence.",
  "Prevented work": "Vermeidete Arbeit",
  "Only justified counterfactuals belong here.": "Hierher gehören nur begründete kontrafaktische Werte.",
  "Modeled values": "Modellierte Werte",
  "Always explicitly marked as estimates.": "Immer ausdrücklich als Schätzung gekennzeichnet.",
  "Unknown": "Unbekannt",
  "Measured": "Gemessen",
  "Not surfaced": "Nicht angezeigt",
  "Total tokens": "Tokens gesamt",
  "Cached input": "Cached Input",
  "Connection diagnostics": "Verbindungsdiagnose",
  "Measure a real Codex turn": "Echten Codex-Turn messen",
  "Run one fixed harmless turn and record provider/runtime-owned token evidence. The test prompt is fixed in Core and cannot be supplied by the renderer.": "Einen fest definierten harmlosen Turn ausführen und provider-/runtime-eigene Token-Evidence erfassen. Der Test-Prompt ist fest im Core hinterlegt und kann nicht vom Renderer geliefert werden.",
  "Run measurement test": "Messung starten",
  "Measuring…": "Messe…",
  "Refreshing…": "Aktualisiere…",
  "Stored locally from Codex App Server runtime evidence.": "Lokal aus Runtime-Evidence des Codex App Servers gespeichert.",
  "No measured usage exists yet. Connect Codex and run the measurement test to create the first observation.": "Noch keine gemessene Nutzung vorhanden. Verbinde Codex und starte die Messung, um die erste Beobachtung zu erzeugen.",
  "Measurement boundary:": "Messgrenze:",
  "This page currently shows Observed Codex usage only; it does not claim counterfactual savings.": "Diese Seite zeigt derzeit ausschließlich Observed-Codex-Nutzung und beansprucht keine kontrafaktischen Einsparungen.",
  "Measurement details": "Messdetails",
  "Provider, model availability and counter definitions": "Provider, Modellverfügbarkeit und Zählerdefinitionen",
  "Model": "Modell",
  "Not exposed": "Nicht verfügbar",
  "Privacy & interpretation:": "Datenschutz & Interpretation:",
  "No raw prompt/project capture by default. Observed ≠ Avoided ≠ Estimated.": "Standardmäßig keine Erfassung roher Prompts oder Projektdaten. Observed ≠ Avoided ≠ Estimated.",
  "Time range": "Zeitraum",
  "Current locally available evidence": "Aktuell lokal verfügbare Evidence",
  "Current": "Aktuell"
};

const enByDe = new Map<string, string>(Object.entries(de).map(([english, german]) => [german, english]));

const canonicalSource = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const english = enByDe.get(trimmed);
  return english ? value.replace(trimmed, english) : value;
};

const translatePattern = (source: string): string | null => {
  let match = source.match(/^(\d+) measured events$/);
  if (match) return `${match[1]} gemessene Ereignisse`;
  match = source.match(/^(\d+) provider connected$/);
  if (match) return `${match[1]} Anbieter verbunden`;
  match = source.match(/^(\d+) connected$/);
  if (match) return `${match[1]} verbunden`;
  match = source.match(/^(\d+) pending$/);
  if (match) return `${match[1]} ausstehend`;
  match = source.match(/^Codex (.+) · App Server connected$/);
  if (match) return `Codex ${match[1]} · App Server verbunden`;
  match = source.match(/^Codex (.+) detected locally$/);
  if (match) return `Codex ${match[1]} lokal erkannt`;
  match = source.match(/^Desktop updater version: (.+)$/);
  if (match) return `Desktop-Updater-Version: ${match[1]}`;
  match = source.match(/^Expand (.+) Project Truth area$/);
  if (match) return `${match[1]}-Bereich erweitern`;
  match = source.match(/^Collapse (.+) Project Truth area$/);
  if (match) return `${match[1]}-Bereich einklappen`;
  match = source.match(/^Tell Livariant about (.+)$/);
  if (match) return `Livariant über ${match[1]} informieren`;
  return null;
};

const readStoredLanguage = (): DesktopLanguage | null => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "de" || value === "en" ? value : null;
  } catch {
    return null;
  }
};

const systemLanguage = (): DesktopLanguage => navigator.language.toLowerCase().startsWith("de") ? "de" : "en";
let language: DesktopLanguage = readStoredLanguage() ?? systemLanguage();
document.documentElement.lang = language;

const shouldSkipText = (node: Node) => {
  const parent = node instanceof Element ? node : node.parentElement;
  return Boolean(parent?.closest("[data-i18n-ignore], textarea, input, code, pre, script, style, svg, .truth-formatted-value, .truth-review-source-text, .truth-source-rendered, .truth-source-raw"));
};

const translated = (source: string) => language === "de" ? (de[source] ?? translatePattern(source) ?? source) : source;

const translateTextNode = (node: Text) => {
  if (shouldSkipText(node)) return;
  let source = textSources.get(node);
  if (source === undefined) {
    source = canonicalSource(node.data);
    textSources.set(node, source);
  } else {
    const canonical = canonicalSource(source);
    if (canonical !== source) {
      source = canonical;
      textSources.set(node, source);
    }
  }
  const trimmed = source.trim();
  if (!trimmed) return;
  const next = source.replace(trimmed, translated(trimmed));
  if (node.data !== next) node.data = next;
};

const translateAttribute = (element: Element, name: "placeholder" | "title" | "aria-label") => {
  const current = element.getAttribute(name);
  if (current === null) return;
  let sources = attributeSources.get(element);
  if (!sources) {
    sources = new Map();
    attributeSources.set(element, sources);
  }
  let source = sources.get(name);
  if (source === undefined) {
    source = canonicalSource(current);
    sources.set(name, source);
  } else {
    const canonical = canonicalSource(source);
    if (canonical !== source) {
      source = canonical;
      sources.set(name, source);
    }
  }
  const next = translated(source);
  if (current !== next) element.setAttribute(name, next);
};

const applyTranslations = () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    translateTextNode(current as Text);
    current = walker.nextNode();
  }
  document.querySelectorAll<Element>("[placeholder], [title], [aria-label]").forEach((element) => {
    translateAttribute(element, "placeholder");
    translateAttribute(element, "title");
    translateAttribute(element, "aria-label");
  });
};

const languageCopy = () => language === "de"
  ? { eyebrow: "Sprache", title: "App-Sprache", detail: "Wird sofort geändert und auf diesem Gerät gespeichert." }
  : { eyebrow: "Language", title: "App language", detail: "Changes immediately and is remembered on this device." };

const ensureLanguageControl = () => {
  const panel = [...document.querySelectorAll<HTMLElement>(".settings-content-body .settings-panel")].find((candidate) => {
    const title = candidate.querySelector("h2")?.textContent?.trim();
    return title === "General" || title === "Allgemein";
  });
  if (!panel) return;

  let card = panel.querySelector<HTMLElement>(".language-setting-card");
  if (!card) {
    card = document.createElement("div");
    card.className = "language-setting-card";
    card.dataset.i18nIgnore = "true";
    const firstSettingsCard = panel.querySelector<HTMLElement>(".settings-card");
    if (firstSettingsCard) firstSettingsCard.insertAdjacentElement("beforebegin", card);
    else panel.append(card);
  }

  if (card.dataset.language === language) return;
  card.dataset.language = language;
  const copy = languageCopy();
  card.innerHTML = `
    <div class="language-setting-copy">
      <small>${copy.eyebrow}</small>
      <strong>${copy.title}</strong>
      <span>${copy.detail}</span>
    </div>
    <div class="language-setting-options" role="group" aria-label="${copy.title}">
      <button class="language-setting-option ${language === "de" ? "active" : ""}" type="button" data-language="de">Deutsch</button>
      <button class="language-setting-option ${language === "en" ? "active" : ""}" type="button" data-language="en">English</button>
    </div>`;

  card.querySelectorAll<HTMLButtonElement>("[data-language]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.language;
      if (next === "de" || next === "en") setLanguage(next);
    });
  });
};

const applyLanguage = () => {
  document.documentElement.lang = language;
  applyTranslations();
  ensureLanguageControl();
};

const setLanguage = (next: DesktopLanguage) => {
  if (language === next) return;
  language = next;
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* UI preference persistence must not block the renderer. */ }
  applyLanguage();
};

let scheduled = false;
const scheduleApply = () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    applyLanguage();
  });
};

const observer = new MutationObserver(scheduleApply);
observer.observe(document.documentElement, { childList: true, subtree: true });

const hydrateInstallerLanguage = async () => {
  if (readStoredLanguage()) return;
  try {
    const installerLanguage = await invoke<string | null>("installer_language");
    if (installerLanguage !== "de" && installerLanguage !== "en") return;
    if (readStoredLanguage()) return;
    language = installerLanguage;
    try { localStorage.setItem(STORAGE_KEY, installerLanguage); } catch { /* Best-effort first-run seed. */ }
    applyLanguage();
  } catch {
    // Dev builds and non-Windows environments may not provide an installer preference.
  }
};

scheduleApply();
void hydrateInstallerLanguage();