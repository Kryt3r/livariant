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

Qualifiziertes installierbares CLI-Artefakt:

```text
livariant-0.1.0-rc.4.tgz
```

SHA-256:

```text
6a8a287e55344e22c97c543cb4a9e071d27d9e18c5ff585cab8235aaa37dce8e
```

`v0.1.0-rc.3` bleibt unveränderliche historische Foundation-Preview-Evidenz. RC4 schreibt die RC3-Historie nicht um, sondern ist der spätere separat qualifizierte Public-Preview-Kandidat.

## Wichtige RC4-Fresh-Install-Einschränkung

Echtes Windows-Dogfooding hat eine wichtige Distributionslücke in RC4 gezeigt:

- die normale RC4-CLI-`.tgz` lässt sich installieren und ausführen;
- Guardian Enforcement verlangt korrekt eine bereits geschützte Bootstrap-Quelle;
- der veröffentlichte RC4-Installations-/Distributionspfad provisioniert diese geschützte Stage-A-Quelle **nicht**;
- RC4 bietet deshalb keinen vollständigen unterstützten Clean-Machine -> Protected-Guardian -> First-Project-Initialisierungspfad.

Das ist kein Grund, Guardian-Prüfungen abzuschwächen. Kopiere keine beliebigen/globalen npm-Paketbytes als Workaround nach `C:\Program Files\Livariant` oder `/opt/livariant`.

WP-044 remediates dies für ein späteres separat qualifiziertes Release durch releasegebundene Stage-A-/Stage-B-Provisionierung, Maschinen-Readiness-Führung, EN/DE-First-Run-Lokalisierung und qualifizierte Release-Asset-Veröffentlichung/Provenance. Diese Änderungen sind **nicht rückwirkend Teil von RC4**.

Siehe [Installation & erstes Projekt](installation.md).

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
- Dateisystem-/Topologie-Sicherheit für die implementierten Lifecycle-Operationen;
- ein installierbares normales CLI-Paket.

Der letzte Punkt bedeutet **nicht**, dass RC4s Release-Distribution die getrennte Protected-Stage-A-Guardian-Provisioning-Voraussetzung vollständig erfüllt.

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

RC4 First Run kombiniert bestehende read-only Setup-/Understanding-Oberflächen und erfasst eine Interaktionssprache. Echtes Dogfooding hat gezeigt, dass RC4s Human-Readable-First-Run-Lokalisierung unvollständig ist und seine Next-Action-Führung fehlende Guardian-Maschinenvoraussetzungen nicht ausreichend sichtbar macht. WP-044 behebt beide Findings für ein zukünftiges qualifiziertes Release.

RC4 First Run endet weiterhin mit `Changes made: 0` und initialisiert das Projekt nicht stillschweigend, übernimmt keine Evidenz automatisch, konfiguriert keinen Provider, persistiert keine Authority und macht Agent-Ausgabe nicht zu Project Truth.

Siehe [First-Run-Komposition](first-run.md).

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

Die RC4-Release-Qualifikation hat release-relevante CI unter **Ubuntu und Windows** ausgeführt. Das Paket deklariert Node.js `>=20`.

Diese CI-Evidenz beweist keinen vollständigen Clean-Machine-Protected-Guardian-Installationspfad. Der reale Windows-Fresh-Install-Pfad ist jetzt ein explizites WP-044-Acceptance-Kriterium.

Guardian-v1-Protected-Provisioning ist für Windows und Linux vorgesehen; für macOS existiert aktuell kein geschützter Guardian-v1-Pfad.

Siehe [Installation & erstes Projekt](installation.md).

## Was RC4 nicht behauptet

Das Public Preview behauptet **nicht**:

- einen vollständigen RC4-Fresh-Machine-Protected-Guardian-Provisioning-Pfad;
- vollständige RC4-First-Run-Lokalisierung für jede gewählte Sprache;
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

WP-044 verlangt separat provenance-attestierte Release-Inputs und eine reale Windows-Fresh-Install-/First-Project-Qualifikation vor seinem eigenen GO. Diese Anforderung entscheidet nicht automatisch jede künftige Stable-Provenance-/Audit-Policy.

## Historisches RC3

`v0.1.0-rc.3` bleibt als unveränderliche historische Foundation-Preview-Evidenz verfügbar. Aussagen darüber, was RC3 enthielt, bleiben historisch und dürfen nicht als Umfang des aktuellen RC4 Public Preview gelesen werden.

Für den aktuellen Nutzerpfad beginne mit:

- [Installation & erstes Projekt](installation.md)
- [Fünf-Minuten-Schnellstart](quickstart.md)
- [Architektur & Sicherheit](architecture-and-safety.md)
