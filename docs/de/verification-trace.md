# Anforderung → Implementierung → Verification Trace

Livariant kann prüfen, ob eine Implementierungsbehauptung tatsächlich durch Verifikationsnachweise gestützt wird, statt „die KI sagt, sie ist fertig“ mit Projektabschluss gleichzusetzen.

Der v1-Workflow ist bewusst read-only:

```text
Anforderung / Akzeptanzkriterium
→ Implementierungsbehauptung
→ Verification Evidence
→ supported / contradicted / unproven
```

## Warum es das gibt

KI-gestützte Implementierung kann fertig wirken, obwohl angeforderte Ergebnisse ungetestet, durch Evidence widerlegt oder schlicht nicht ausreichend belegt sind.

`verification-trace` macht diese Lücke sichtbar, ohne Project Truth, Task-Status, Release-Status oder Authority stillschweigend zu verändern.

## Einen Trace über die CLI ausführen

Erstelle einen JSON-Trace und führe aus:

```bash
livariant verification-trace --input trace.json
```

Maschinenlesbare Ausgabe:

```bash
livariant verification-trace --input trace.json --json
```

Der Befehl ist read-only und meldet `Changes made: 0`.

## Den Trace direkt aus einem MCP-Coding-Agent verwenden

Wenn Livariants lokale MCP-Bridge verbunden ist, kann ein MCP-fähiger Coding-Agent direkt dieses Tool aufrufen:

`livariant_verification_trace`

Das Tool akzeptiert dieselbe explizite Version-1-Trace-Struktur wie CLI und Core-Assessor und liefert dieselben deterministischen Assessment-Zustände zurück. Es ist ausdrücklich read-only und nicht-destruktiv deklariert.

Konzeptionell:

```text
Coding-Agent
  → livariant_verification_trace
  → bestehender Verification-Trace-Assessor
  → supported / contradicted / unproven
```

Dadurch muss während einer Agent-Session nicht mehr manuell der CLI-Befehl ausgeführt werden. Das fügt aber **keine** automatische Anforderungserkennung oder unabhängige Verification Intelligence hinzu: Anforderungen, Implementierungsbehauptungen und Verification Evidence müssen weiterhin explizit geliefert werden, und Evidence wird nicht allein deshalb vertrauenswürdig, weil sie über MCP von einem Agent stammt.

## Assessment-Zustände

### `supported`

Relevante Verification Evidence unterstützt das Ziel oder eine zugehörige Implementierungsbehauptung.

Das bedeutet: **Es gibt passende Evidence-Abdeckung.** Es bedeutet nicht automatisch akzeptiert, DONE, kanonisch, release-ready oder autorisiert.

### `contradicted`

Relevante Verification Evidence widerspricht dem Ziel oder einer zugehörigen Implementierungsbehauptung.

Widersprechende Evidence hat in diesem Assessment Vorrang vor einer optimistischen „implementiert“-Behauptung. Livariant zeigt den Konflikt sichtbar an, statt ihn durch die Behauptung zu verdecken.

### `unproven`

Es gibt keine relevante unterstützende Evidence. Dazu gehören auch Fälle, in denen Implementierung behauptet wird, aber nur inconclusive Evidence vorliegt.

`unproven` bedeutet nicht automatisch, dass die Implementierung falsch ist. Es bedeutet, dass der Trace aktuell nicht genug unterstützende Evidence für eine stärkere Aussage enthält.

## Beispiel

Ein Agent behauptet, die Authentifizierungsarbeit sei abgeschlossen:

```text
E-Mail-/Passwort-Login       → SUPPORTED
Login-Rate-Limiting          → CONTRADICTED
Reset-Token-Wiederverwendung → UNPROVEN
```

Livariant kann damit melden, dass die angeforderte Arbeit **nicht vollständig belegt** ist, obwohl der Implementierungs-Agent Fertigstellung behauptet.

Genau diese Trennung ist der Zweck des Features.

## Eingabegrenze

v1 erhält explizit:

- Anforderungen oder Akzeptanzkriterien;
- Implementierungsbehauptungen;
- Livariant Verification Evidence Records.

Der Trace legt keine Anforderungen automatisch im Project Brain an und entdeckt nicht beliebige Implementierungsbehauptungen automatisch aus Code.

Das sind getrennte zukünftige Fähigkeiten mit eigenem Scope und Trust-Modell.

## Sicherheitsgrenze

Das Trace-Assessment, einschließlich des MCP-Consumers:

- ist read-only;
- vergibt keine Authority;
- verändert Project Truth nicht;
- markiert Arbeit nicht als akzeptiert oder DONE;
- verändert keine Release-Entscheidung;
- vertraut Evidence nicht allein deshalb, weil sie von einer KI geliefert wurde;
- behauptet nicht, dass ein einzelner bestandener Test universelle Fertigstellung beweist.

Die Kernregeln bleiben:

> Evidence != Truth.
>
> Verification evidence != accepted completion.
>
> Test PASS != universal completion.

## Token-/Context-Benchmark

Für diesen Workflow gibt es einen deterministischen Benchmark:

```bash
npm run benchmark:verification-trace
```

Er misst:

1. den repräsentativen Raw-Trace-Input;
2. das vollständige Livariant-Assessment;
3. eine kompakte Consumer-Projektion, die Assessment-Zustände und Evidence-Quellen erhält.

Der Benchmark verwendet `ceil(UTF-8 bytes / 4)` als deterministischen Token-Proxy, weil Livariant nicht nur für diese Messung einen Provider-Tokenizer installiert.

Das ist **keine** exakte Provider-Abrechnungsmetrik, kein universelles Token-Sparversprechen und kein Vergleich mit einem anderen Produkt. Öffentliche Effizienz-Aussagen sollten ausschließlich reproduzierbare Livariant-Workloads verwenden und die Messmethode nennen.

## Aktueller v1-Scope

Bewusst nicht enthalten sind:

- automatische Anforderungspersistenz;
- automatisches Task-DONE;
- Project-Truth-Promotion;
- automatische beliebige Anforderungserkennung;
- unabhängiges Vertrauen in Agent-gelieferte Evidence;
- Graph-/Index-Infrastruktur;
- Ausführung von Verification-Plugins/Capability-Packs;
- Release-Autorisierung;
- breite Provider-/Agent-Consumer-Migration.

Das v1-Ziel ist enger: unbelegte oder widersprochene Fertigstellungsbehauptungen jetzt sowohl über CLI als auch über die lokale MCP-Agent-Bridge sichtbar und nutzbar machen und gleichzeitig saubere Erweiterungspunkte für spätere Fähigkeiten bewahren.
