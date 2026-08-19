# Public-Preview-Umfang & Einschränkungen

Diese Seite beschreibt den Umfang des **aktuell veröffentlichten Livariant Public Preview**. Sie ist eine Release-Truth-Oberfläche, kein historisches Entwicklungsprotokoll und kein Versprechen, dass Roadmap-Arbeit bereits implementiert ist.

## Aktuelles veröffentlichtes Release

Das aktuelle öffentliche Prerelease ist:

```text
v0.1.0-rc.4
```

RC4 wurde aus folgendem exakten Quellstand qualifiziert:

```text
4f547751d9d53e7325e6ea1f2401f1dea45779dc
```

Qualifiziertes Release-Artefakt:

```text
livariant-0.1.0-rc.4.tgz
```

SHA-256:

```text
6a8a287e55344e22c97c543cb4a9e071d27d9e18c5ff585cab8235aaa37dce8e
```

`v0.1.0-rc.3` bleibt unveränderliche historische Foundation-Preview-Evidenz. RC4 schreibt die RC3-Historie nicht um, sondern ist der spätere separat qualifizierte Public-Preview-Kandidat.

## Was RC4 enthält

RC4 verbindet die gehärtete Grundlage für projekt-eigene Kontinuität/Lifecycle mit begrenzter Active Project Intelligence und einem agent-nativen MCP-Pfad.

### Projekt-eigene Kontinuität und Lifecycle

Das Public Preview enthält das Project Brain und unterstützte Lifecycle-Oberflächen für:

- Initialisierung sowie Status-/Diagnose-Inspektion;
- bestätigte Ziele, Projektwissen und akzeptierte Entscheidungen;
- plan-first unterstützte Mutationsabläufe;
- Supersession von Entscheidungen mit erhaltener Historie;
- Project-Brain-Resume-Handoff;
- Schutz vor veraltetem Kontext;
- Update- und unterstützte Migrations-/Recovery-Flows;
- Runtime-/Release-Integrität und geschützte Authority-Grenzen;
- stabile logische Project-Brain-Identität;
- Dateisystem-/Topologie-Sicherheit und saubere Paketinstallation.

### Active-Project-Intelligence-Grundlagen

RC4 enthält begrenzte read-only/review-orientierte Grundlagen wie:

- Project Context Snapshot;
- Semantic Proposal und Conflict/Drift Assessment;
- Provider Context und Provider Return Evidence Intake;
- Guided Project Understanding Review und kontrollierte Übernahme;
- External-Knowledge-Evidenz-Grundlagen;
- Autonomy Profiles;
- Evidence-backed Findings;
- Requirement -> Implementation -> Verification Trace.

Diese Fähigkeiten erhalten die Trennung zwischen Evidenz, Inferenz, Project Truth, Verifikation, Autorisierung und Mutation.

### First Run

RC4 enthält den geführten Einstieg:

```bash
livariant first-run
```

First Run kombiniert bestehende read-only Setup-/Understanding-Oberflächen, beginnt mit der Wahl einer Interaktionssprache und kann die nächsten expliziten Claude-Code- oder Codex-MCP-Setup-Schritte ausgeben.

Er endet mit `Changes made: 0`. Er initialisiert das Projekt nicht stillschweigend, übernimmt keine Evidenz automatisch, konfiguriert keinen Provider, persistiert keine Authority und macht Agent-Ausgabe nicht zu Project Truth.

Siehe [First-Run Composition](first-run.md).

### Lokale MCP-Agent-Bridge

RC4 enthält die lokale stdio-MCP-Bridge:

```bash
livariant mcp
```

und explizite Provider-Setup-Hinweise:

```bash
livariant mcp setup --provider claude-code
livariant mcp setup --provider codex
```

Aktuelle begrenzte MCP-Tools sind:

- `livariant_provider_context`;
- `livariant_provider_return`;
- `livariant_verification_trace`.

Provider-Konfiguration bleibt explizit. Livariant schreibt Provider-Konfiguration nicht stillschweigend um, und MCP-Transport verleiht weder unabhängiges Vertrauen noch Mutation Authority.

Siehe [Lokale MCP-Agent-Bridge](mcp-agent-bridge.md), [Provider-Handoff](provider-handoff.md) und [Verification Trace](verification-trace.md).

### Verification Trace

RC4 kann explizite Anforderungen oder Acceptance Criteria gegen bereitgestellte Implementierungsclaims und Verification Evidence bewerten mit:

```text
SUPPORTED
CONTRADICTED
UNPROVEN
```

Diese Zustände beschreiben Evidenzunterstützung. Sie bedeuten **nicht** automatisch akzeptierte Completion oder Project Truth.

Dauerhafte Grenzen sind unter anderem:

```text
SUPPORTED != DONE
Verification Evidence != akzeptierte Completion
Evidence != Project Truth
Capability != Authority
MCP-Transport != unabhängiges Vertrauen
```

## Provider-Unterstützung

Das aktuelle Public Preview bietet explizite Integrations-/Setup-Pfade für **Claude Code** und **Codex**.

Provider-Auswahl oder Provider-Ausgabe verleiht selbst keine Livariant Authority. Provider-/Client-Material, das Livariant erreicht, bleibt Evidenz oder Kandidatenmaterial, solange es nicht den passenden bestehenden Project-Truth-/Authority-Prozess durchläuft.

Livariant behauptet nicht, jede Provider-Funktion, jeden Authentifizierungsmechanismus, jede Modellauswahl, native Memory-Oberfläche oder künftiges MCP-Verhalten zu verwalten.

## Plattform- und Paketumfang

Die RC4-Release-Qualifikation hat die release-relevante Pipeline unter **Ubuntu und Windows** ausgeführt. Das Paket deklariert Node.js `>=20`; die Release-Qualifikation verwendet die im Repository festgelegte CI-/Toolchain-Konfiguration.

Siehe [Installation & erstes Projekt](installation.md) für den aktuellen Installationspfad.

## Was RC4 nicht behauptet

Das Public Preview behauptet **nicht**:

- universelle automatische Anforderungsentdeckung;
- automatische Erzeugung vertrauenswürdiger Verification Evidence;
- universelle Korrektheitsverifikation für beliebigen Code;
- provider-gesteuerte, Wildcard- oder Standing-Autorisierung semantischer Mutation;
- Provider-Ausgabe werde allein durch MCP automatisch Project Truth;
- Remote-/Cloud-MCP-Hosting als Livariant-Dienst;
- Besitz einer breiten Repository-Graph-/Index-/Search-Schicht;
- automatische Drift-Reparatur;
- uneingeschränkte autonome Repository-Mutation;
- breite Multi-Agent-Orchestrierung oder Concurrent-Agent-Containment;
- ein allgemeines Drittanbieter-Plugin-/Marketplace-Ausführungsmodell;
- exakte Einsparungen bei provider-abgerechneten Tokens.

RC4 enthält deterministische Kontext-/Token-Proxy-Evidenz, aber diese Messungen sind keine exakten Claude-/Codex-Billing-Tokenwerte und belegen keinen universellen Token-Sparprozentsatz.

## Stable-Release-Arbeit bleibt getrennt

RC4 ist ein **Public-Preview-Prerelease**, kein Stable Release.

Vor einem ersten Stable Release benötigt Livariant weiterhin repräsentative Real-Agent-Workflow-Qualifikation, soweit sinnvoll einschließlich:

- korrekte MCP-Tool-Auswahl;
- verpasste oder unnötige Tool-Aufrufe;
- Interpretation von `SUPPORTED / CONTRADICTED / UNPROVEN`;
- Unterschiede zwischen Claude Code und Codex;
- Verhalten in längeren Sessions und bei Kontextverlust;
- Fehlermodi;
- provider-beobachtetes Token-/Kontextverhalten, soweit praktikabel.

Build-Provenance/Attestation und ein unabhängiger KI-gestützter Release-Audit sind ebenfalls explizite Release-Hardening-Kandidaten; ob sie für Stable Pflicht-Gates werden, muss evidenzbasiert entschieden werden.

## Historisches RC3

`v0.1.0-rc.3` bleibt als unveränderliche historische Foundation-Preview-Evidenz verfügbar. Aussagen darüber, was RC3 enthielt, bleiben historisch und dürfen nicht als Umfang des aktuellen RC4 Public Preview gelesen werden.

Für den aktuellen Nutzerpfad beginne mit:

- [Installation & erstes Projekt](installation.md)
- [Fünf-Minuten-Schnellstart](quickstart.md)
- [Architektur & Sicherheit](architecture-and-safety.md)
