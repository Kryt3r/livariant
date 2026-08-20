import type { AutonomyProfile } from "../autonomy/profile.js";
import type { GuardianMachineReadiness } from "../guardian/readiness.js";
import type { BootstrapDiscoveryAttention } from "../project/bootstrap-discovery.js";
import type { UnderstandingReviewQuestion } from "../project/understanding-review.js";

export type CliLocale = "en" | "de";

export interface CliLocaleResolution {
  locale: CliLocale;
  supported: boolean;
  requestedLanguage: string;
  canonicalLanguage: "English" | "Deutsch";
}

const EN = {
  "language.prompt": "Preferred interaction language / Bevorzugte Sprache: ",
  "language.unsupported": "Requested interaction language \"{language}\" is not yet available for CLI localization. The First-Run UI uses English while preserving your preference.",
  "autonomy.choose": "Choose how often Livariant should stop and ask:",
  "autonomy.option.always": "1) Always ask — maximum control",
  "autonomy.option.important": "2) Ask on important decisions — recommended balance",
  "autonomy.option.continue": "3) Continue without confirmation — higher autonomy, higher risk",
  "autonomy.prompt": "Autonomy mode [2]: ",
  "autonomy.warning": "Warning: this mode lets the agent make consequential workflow choices without asking you first when no hard Livariant authority is required.",
  "autonomy.warning.boundary": "Mutation, Runtime and Release Authority boundaries still remain mandatory.",
  "autonomy.ack.use": "Type CONTINUE to use this profile for First-Run: ",
  "autonomy.ack.accept": "Type CONTINUE to accept this risk: ",
  "autonomy.error.ack": "High-autonomy profile acknowledgement did not match.",
  "autonomy.error.mode": "Autonomy mode must be 1, 2, or 3.",
  "report.title": "Livariant first run",
  "report.language": "Preferred interaction language",
  "report.locale": "CLI language",
  "report.autonomy": "Autonomy",
  "report.autonomyBehavior": "Autonomy behavior",
  "report.autonomyWarning": "Autonomy warning",
  "report.autonomyAuthority": "Autonomy grants Authority: no",
  "report.project": "Project",
  "report.workspace": "Workspace",
  "report.projectBrain": "Project Brain",
  "report.machine": "Machine protection readiness:",
  "report.machine.platform": "Platform",
  "report.machine.source": "Protected bootstrap source",
  "report.machine.guardian": "Guardian",
  "report.machine.lifecycle": "Lifecycle authorization prerequisite ready",
  "report.machine.ready": "ready",
  "report.machine.missingSource": "not installed",
  "report.machine.guardianBootstrap": "protected source ready; Guardian bootstrap still required",
  "report.machine.unsafe": "unsafe — stop and repair the protected installation path before lifecycle authorization",
  "report.machine.unsupported": "unsupported on this platform",
  "report.yes": "yes",
  "report.no": "no",
  "report.found": "What Livariant found:",
  "report.noConfirmed": "no confirmed project evidence yet",
  "report.noInferences": "no strong inferences",
  "report.more": "...and {count} more",
  "report.review": "Still needs your review:",
  "report.nothingFlagged": "nothing currently flagged",
  "report.moreItems": "...and {count} more item(s)",
  "report.externalSources": "external knowledge sources connected: {count}",
  "report.safety": "Important safety boundary:",
  "report.safety.evidence": "Discovery and external knowledge are evidence, not Project Truth.",
  "report.safety.autonomy": "Autonomy preference changes how often an agent should ask; it is not mutation, Runtime, or Release Authority.",
  "report.safety.firstRun": "This first-run does not persist autonomy, authorize initialization/adoption, configure providers, change runtime trust, or authorize release.",
  "report.safety.machine": "Machine readiness and Guardian readiness do not themselves grant project mutation, Runtime, integrity, or Release Authority.",
  "report.nextActions": "Next actions:",
  "report.action.optional": "optional",
  "report.action.next": "next",
  "report.changes": "Changes made: 0",
  "next.installProtectedSource": "Install the exact verified Livariant protected-bootstrap release material through the privileged Stage-A installation path before Guardian bootstrap or lifecycle authorization.",
  "next.bootstrapGuardian": "Run Guardian bootstrap from the already protected Livariant bootstrap source in a local privileged terminal, then verify readiness from an ordinary terminal.",
  "next.stopUnsafe": "Stop. The protected machine state is unsafe or ambiguous. Do not authorize initialization and do not bless or repair it through requester-controlled project/CLI state.",
  "next.unsupported": "This platform does not currently support protected Guardian v1; lifecycle authorization that requires Guardian cannot proceed here.",
  "next.initialize": "Initialize Project Brain only after you explicitly approve the bootstrap plan and required machine protection is ready.",
  "next.persist.valid": "Persist this autonomy preference machine-locally for this stable project identity. This does not grant Authority.",
  "next.persist.afterInit": "After Project Brain initialization establishes a stable project identity, persist this autonomy preference machine-locally. This does not grant Authority.",
  "next.review.external": "Continue the understanding review with the same external knowledge source. Replace <same-source-path> with the source path you selected for First-Run.",
  "next.review": "Review unknowns and provide corrections or answers before anything becomes Project Truth.",
  "next.provider": "Render the {provider} MCP setup guidance. Livariant makes no provider-configuration write; any later registration remains a separate explicit external action.",
  "next.continue": "Only reviewed candidate material may enter Controlled Starting Understanding Adoption; raw discovery or external evidence cannot be adopted directly.",
  "autonomy.label.ask-always": "Always ask",
  "autonomy.summary.ask-always": "Stop before routine and important discretionary next steps.",
  "autonomy.label.ask-important": "Ask on important decisions",
  "autonomy.summary.ask-important": "Continue through routine read-only work, but stop before important or consequential discretionary steps.",
  "autonomy.label.continue-without-confirmation": "Continue without confirmation",
  "autonomy.summary.continue-without-confirmation": "Continue through routine and important discretionary workflow decisions when no hard Livariant authority is required.",
  "autonomy.warning.continue-without-confirmation": "Higher autonomy can let an agent make consequential workflow choices without asking you first. Use only if you accept that risk. Hard Livariant authority boundaries still remain mandatory.",
  "question.project-purpose": "What is this project for, in 1-3 sentences?",
  "question.project-goals": "What are the most important current project goals?",
  "question.preferred-technical-direction": "Is there a preferred technical direction or stack that should guide future work?",
  "question.current-product-direction": "What is the current product direction or next meaningful outcome?",
  "question.non-negotiable-project-rules": "Which project rules or constraints must not be violated?",
  "question.fallback": "Please clarify: {topic}.",
} as const;

export type CliMessageKey = keyof typeof EN;

const DE: Record<CliMessageKey, string> = {
  "language.prompt": "Preferred interaction language / Bevorzugte Sprache: ",
  "language.unsupported": "Die gewünschte Interaktionssprache \"{language}\" ist für die CLI-Lokalisierung noch nicht verfügbar. Die First-Run-Oberfläche verwendet Englisch; deine Sprachpräferenz bleibt gespeichert.",
  "autonomy.choose": "Wähle, wie oft Livariant anhalten und nachfragen soll:",
  "autonomy.option.always": "1) Immer fragen — maximale Kontrolle",
  "autonomy.option.important": "2) Bei wichtigen Entscheidungen fragen — empfohlener Mittelweg",
  "autonomy.option.continue": "3) Ohne Bestätigung fortfahren — mehr Autonomie, höheres Risiko",
  "autonomy.prompt": "Autonomiemodus [2]: ",
  "autonomy.warning": "Warnung: In diesem Modus kann der Agent folgenreiche Ablaufentscheidungen treffen, ohne vorher zu fragen, sofern keine feste Livariant-Authority erforderlich ist.",
  "autonomy.warning.boundary": "Die Grenzen für Mutation-, Runtime- und Release-Authority bleiben weiterhin zwingend bestehen.",
  "autonomy.ack.use": "Gib CONTINUE ein, um dieses Profil für den First Run zu verwenden: ",
  "autonomy.ack.accept": "Gib CONTINUE ein, um dieses Risiko zu akzeptieren: ",
  "autonomy.error.ack": "Die Bestätigung für das Profil mit hoher Autonomie stimmt nicht überein.",
  "autonomy.error.mode": "Der Autonomiemodus muss 1, 2 oder 3 sein.",
  "report.title": "Livariant – Ersteinrichtung",
  "report.language": "Bevorzugte Interaktionssprache",
  "report.locale": "CLI-Sprache",
  "report.autonomy": "Autonomie",
  "report.autonomyBehavior": "Autonomieverhalten",
  "report.autonomyWarning": "Autonomiewarnung",
  "report.autonomyAuthority": "Autonomie erteilt Authority: nein",
  "report.project": "Projekt",
  "report.workspace": "Arbeitsbereich",
  "report.projectBrain": "Project Brain",
  "report.machine": "Bereitschaft der Maschinenabsicherung:",
  "report.machine.platform": "Plattform",
  "report.machine.source": "Geschützte Bootstrap-Quelle",
  "report.machine.guardian": "Guardian",
  "report.machine.lifecycle": "Voraussetzung für Lifecycle-Autorisierung bereit",
  "report.machine.ready": "bereit",
  "report.machine.missingSource": "nicht installiert",
  "report.machine.guardianBootstrap": "geschützte Quelle bereit; Guardian-Bootstrap noch erforderlich",
  "report.machine.unsafe": "unsicher — geschützten Installationspfad vor einer Lifecycle-Autorisierung reparieren",
  "report.machine.unsupported": "auf dieser Plattform nicht unterstützt",
  "report.yes": "ja",
  "report.no": "nein",
  "report.found": "Was Livariant gefunden hat:",
  "report.noConfirmed": "noch keine bestätigten Projektinformationen",
  "report.noInferences": "keine starken Schlussfolgerungen",
  "report.more": "...und {count} weitere",
  "report.review": "Das braucht noch deine Prüfung:",
  "report.nothingFlagged": "aktuell nichts markiert",
  "report.moreItems": "...und {count} weitere Einträge",
  "report.externalSources": "verbundene externe Wissensquellen: {count}",
  "report.safety": "Wichtige Sicherheitsgrenze:",
  "report.safety.evidence": "Discovery und externe Wissensquellen sind Evidenz, nicht Project Truth.",
  "report.safety.autonomy": "Die Autonomiepräferenz bestimmt, wie oft ein Agent nachfragen soll; sie ist keine Mutation-, Runtime- oder Release-Authority.",
  "report.safety.firstRun": "Dieser First Run speichert keine Autonomiepräferenz dauerhaft, autorisiert keine Initialisierung oder Übernahme, konfiguriert keinen Provider, verändert kein Runtime-Vertrauen und autorisiert keinen Release.",
  "report.safety.machine": "Maschinen- und Guardian-Bereitschaft erteilen für sich genommen keine Projektmutation-, Runtime-, Integrity- oder Release-Authority.",
  "report.nextActions": "Nächste Schritte:",
  "report.action.optional": "optional",
  "report.action.next": "als Nächstes",
  "report.changes": "Vorgenommene Änderungen: 0",
  "next.installProtectedSource": "Installiere das exakt verifizierte Livariant-Release-Material für die geschützte Bootstrap-Quelle über den privilegierten Stage-A-Installationspfad, bevor Guardian-Bootstrap oder Lifecycle-Autorisierung ausgeführt werden.",
  "next.bootstrapGuardian": "Führe den Guardian-Bootstrap aus der bereits geschützten Livariant-Bootstrap-Quelle in einem lokalen privilegierten Terminal aus und prüfe die Bereitschaft danach aus einem normalen Terminal.",
  "next.stopUnsafe": "Stopp. Der geschützte Maschinenzustand ist unsicher oder mehrdeutig. Initialisierung nicht autorisieren und den Zustand nicht über projekt- oder CLI-kontrollierte Daten segnen oder reparieren.",
  "next.unsupported": "Diese Plattform unterstützt den geschützten Guardian v1 derzeit nicht; eine Lifecycle-Autorisierung, die Guardian voraussetzt, kann hier nicht fortgesetzt werden.",
  "next.initialize": "Initialisiere das Project Brain erst, nachdem du den Bootstrap-Plan ausdrücklich geprüft und freigegeben hast und die erforderliche Maschinenabsicherung bereit ist.",
  "next.persist.valid": "Speichere diese Autonomiepräferenz maschinenlokal für diese stabile Projektidentität. Dadurch wird keine Authority erteilt.",
  "next.persist.afterInit": "Speichere diese Autonomiepräferenz nach der Project-Brain-Initialisierung maschinenlokal, sobald eine stabile Projektidentität existiert. Dadurch wird keine Authority erteilt.",
  "next.review.external": "Setze die Verständnisprüfung mit derselben externen Wissensquelle fort. Ersetze <same-source-path> durch den beim First Run gewählten Quellpfad.",
  "next.review": "Prüfe Unklarheiten und gib Korrekturen oder Antworten an, bevor etwas zu Project Truth wird.",
  "next.provider": "Zeige die MCP-Einrichtung für {provider}. Livariant schreibt keine Provider-Konfiguration; eine spätere Registrierung bleibt eine separate ausdrückliche externe Aktion.",
  "next.continue": "Nur geprüftes Kandidatenmaterial darf in die Controlled Starting Understanding Adoption übergehen; rohe Discovery- oder externe Evidenz darf nicht direkt übernommen werden.",
  "autonomy.label.ask-always": "Immer fragen",
  "autonomy.summary.ask-always": "Vor routinemäßigen und wichtigen frei entscheidbaren nächsten Schritten anhalten.",
  "autonomy.label.ask-important": "Bei wichtigen Entscheidungen fragen",
  "autonomy.summary.ask-important": "Routinemäßige schreibgeschützte Arbeit fortsetzen, aber vor wichtigen oder folgenreichen frei entscheidbaren Schritten anhalten.",
  "autonomy.label.continue-without-confirmation": "Ohne Bestätigung fortfahren",
  "autonomy.summary.continue-without-confirmation": "Routinemäßige und wichtige frei entscheidbare Ablaufschritte fortsetzen, solange keine feste Livariant-Authority erforderlich ist.",
  "autonomy.warning.continue-without-confirmation": "Höhere Autonomie kann dazu führen, dass ein Agent folgenreiche Ablaufentscheidungen trifft, ohne vorher zu fragen. Verwende diesen Modus nur, wenn du dieses Risiko akzeptierst. Die festen Livariant-Authority-Grenzen bleiben zwingend bestehen.",
  "question.project-purpose": "Wofür ist dieses Projekt gedacht? Beschreibe es in 1–3 Sätzen.",
  "question.project-goals": "Was sind die derzeit wichtigsten Ziele des Projekts?",
  "question.preferred-technical-direction": "Gibt es eine bevorzugte technische Richtung oder einen Stack, der zukünftige Arbeit leiten soll?",
  "question.current-product-direction": "Was ist die aktuelle Produktrichtung oder das nächste sinnvolle Ergebnis?",
  "question.non-negotiable-project-rules": "Welche Projektregeln oder Einschränkungen dürfen nicht verletzt werden?",
  "question.fallback": "Bitte kläre: {topic}.",
};

const GERMAN_ALIASES = new Set(["de", "de-de", "deutsch", "german"]);
const ENGLISH_ALIASES = new Set(["en", "en-us", "en-gb", "english", "englisch"]);

function normalizedLanguageKey(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, "-");
}

export function resolveCliLocale(preferredLanguage: string): CliLocaleResolution {
  const requestedLanguage = preferredLanguage.trim();
  const key = normalizedLanguageKey(requestedLanguage);
  if (GERMAN_ALIASES.has(key)) return { locale: "de", supported: true, requestedLanguage, canonicalLanguage: "Deutsch" };
  if (ENGLISH_ALIASES.has(key)) return { locale: "en", supported: true, requestedLanguage, canonicalLanguage: "English" };
  return { locale: "en", supported: false, requestedLanguage, canonicalLanguage: "English" };
}

export function cliMessage(locale: CliLocale, key: CliMessageKey, values: Record<string, string | number> = {}): string {
  const table = locale === "de" ? DE : EN;
  let message: string = table[key];
  for (const [name, value] of Object.entries(values)) message = message.replaceAll(`{${name}}`, String(value));
  return message;
}

export function localizeAutonomyPolicy(locale: CliLocale, profile: AutonomyProfile): { label: string; summary: string; warning?: string } {
  if (profile === "ask-always") {
    return { label: cliMessage(locale, "autonomy.label.ask-always"), summary: cliMessage(locale, "autonomy.summary.ask-always") };
  }
  if (profile === "ask-important") {
    return { label: cliMessage(locale, "autonomy.label.ask-important"), summary: cliMessage(locale, "autonomy.summary.ask-important") };
  }
  return {
    label: cliMessage(locale, "autonomy.label.continue-without-confirmation"),
    summary: cliMessage(locale, "autonomy.summary.continue-without-confirmation"),
    warning: cliMessage(locale, "autonomy.warning.continue-without-confirmation"),
  };
}

const DISCOVERY_VALUES_DE: Record<string, string> = {
  "empty workspace": "leerer Arbeitsbereich",
  "existing project workspace": "bestehender Projektarbeitsbereich",
  "Git metadata present": "Git-Metadaten vorhanden",
  "Node.js package manifest": "Node.js-Paketmanifest",
  "TypeScript configuration": "TypeScript-Konfiguration",
  "Python project manifest": "Python-Projektmanifest",
  "Python requirements manifest": "Python-Abhängigkeitsmanifest",
  "Rust package manifest": "Rust-Paketmanifest",
  "Go module manifest": "Go-Modulmanifest",
  "Maven project manifest": "Maven-Projektmanifest",
  "Gradle build manifest": "Gradle-Buildmanifest",
  "Gradle Kotlin build manifest": "Gradle-Kotlin-Buildmanifest",
  "Docker build configuration": "Docker-Buildkonfiguration",
  "Docker Compose configuration": "Docker-Compose-Konfiguration",
  "Compose configuration": "Compose-Konfiguration",
  "README documentation": "README-Dokumentation",
  "Claude Code project guidance": "Claude-Code-Projektanweisungen",
  "Agent project guidance": "Agent-Projektanweisungen",
  "documentation directory present": "Dokumentationsverzeichnis vorhanden",
  "src directory present": "src-Verzeichnis vorhanden",
  "test directory present": "test-Verzeichnis vorhanden",
  "tests directory present": "tests-Verzeichnis vorhanden",
  "test script declared": "Testskript definiert",
  "build script declared": "Buildskript definiert",
};

export function localizeDiscoveryValue(locale: CliLocale, value: string): string {
  if (locale === "en") return value;
  if (value.endsWith(" lockfile")) return value.replace(/ lockfile$/, "-Lockfile");
  return DISCOVERY_VALUES_DE[value] ?? value;
}

export function localizeAttention(locale: CliLocale, item: BootstrapDiscoveryAttention): string {
  if (locale === "en") return item.message;
  const first = item.provenance[0] ?? "Datei";
  if (item.code === "discovery-unsafe-package-manifest") return "package.json ist vorhanden, aber keine reguläre Datei ohne Symlink; Livariant hat sie nicht interpretiert.";
  if (item.code === "discovery-unreadable-package-manifest") return "package.json konnte nicht als JSON gelesen werden; Abhängigkeits- und Skriptinformationen wurden nicht abgeleitet.";
  if (item.code === "discovery-unsafe-high-signal-file") return `${first} ist vorhanden, aber keine reguläre Datei ohne Symlink; Livariant hat sie nicht interpretiert.`;
  if (item.code === "discovery-multiple-node-lockfiles") return "Mehrere Node-Paketmanager-Lockfiles sind vorhanden; die aktive Paketmanager-Konvention ist unklar.";
  if (item.code === "discovery-sensitive-file-present") return `${first} ist vorhanden. Discovery erfasst nur die Existenz und liest oder klassifiziert den Inhalt nicht.`;
  return item.message;
}

export function localizeQuestion(locale: CliLocale, question: UnderstandingReviewQuestion): string {
  if (locale === "en") return question.prompt;
  const suffix = question.id.replace(/^unknown:/, "");
  const candidate = `question.${suffix}`;
  if (candidate in DE) return cliMessage(locale, candidate as CliMessageKey);
  return cliMessage(locale, "question.fallback", { topic: question.topic });
}

export function localizeProjectShape(locale: CliLocale, shape: string): string {
  if (locale === "en") return shape;
  if (shape === "existing") return "bestehendes Projekt";
  if (shape === "empty") return "leerer Arbeitsbereich";
  return shape;
}

export function localizeProjectBrainHealth(locale: CliLocale, health: string): string {
  if (locale === "en") return health;
  if (health === "valid") return "gültig";
  if (health === "not-found") return "nicht gefunden";
  if (health === "invalid") return "ungültig";
  if (health === "partial") return "unvollständig";
  return health;
}

export function localizeReadinessState(locale: CliLocale, readiness: GuardianMachineReadiness): string {
  if (readiness.state === "ready") return cliMessage(locale, "report.machine.ready");
  if (readiness.state === "protected-source-required") return cliMessage(locale, "report.machine.missingSource");
  if (readiness.state === "guardian-bootstrap-required") return cliMessage(locale, "report.machine.guardianBootstrap");
  if (readiness.state === "unsafe") return cliMessage(locale, "report.machine.unsafe");
  return cliMessage(locale, "report.machine.unsupported");
}
