# Reproduzierbarer Failure-Containment-Proof

Dieser Post-RC3-Proof macht eine Livariant-Zuverlässigkeitsgrenze direkt sichtbar, ohne neues Runtime-Verhalten hinzuzufügen.

Er demonstriert folgende Sequenz:

```text
akzeptierte Project Truth existiert
-> ein Agent/Provider liefert einen dauerhaften Kandidaten zurück
-> der Kandidat besitzt keine explizite Autorisierung
-> semantische Änderung bleibt null
-> kanonische Project Truth bleibt Byte für Byte unverändert
-> der kanonische Zustand wird später weiterentwickelt
-> der alte Provider Context wird stale
-> derselbe Kandidat wird erneut eingereicht
-> Livariant klassifiziert ihn als stale-context
-> semantische Änderung bleibt null
-> die aktuelle kanonische Project Truth bleibt Byte für Byte unverändert
```

Der Proof ist bewusst eng begrenzt. Er behauptet nicht, dass Livariant KI-Ausgaben korrekt macht. Er beweist für diesen bestehenden Provider-Return-Pfad, dass eine plausible Agentenausgabe nicht allein dadurch dauerhafte Project Truth oder Mutation Authority erhält, dass sie zurückgegeben wird.

## Ausführen

Aus einem Checkout des aktuellen Repository-`main` oder eines Kandidaten, der diesen Proof enthält:

```bash
npm run build
node --test dist/tests/failure-containment-proof.test.js
```

Erwartetes Ergebnis:

```text
ok ... proof: stale agent evidence cannot silently become Project Truth or self-authorize mutation
```

Der Test prüft selbst zwei Containment-Punkte:

1. **Keine Selbstautorisierung** — ein kohärenter zurückgegebener Kandidat ohne explizite Autorisierung erreicht den bestehenden Maintenance-Pfad als `authorization-required`, `semanticChangesMade === 0`, und alle verwalteten Project-Brain-Dateien bleiben Byte für Byte unverändert.
2. **Kein stilles Rebinding veralteten Kontexts** — nachdem sich die kanonische Project Truth weiterentwickelt hat, wird derselbe ältere Provider Context/Kandidat als `stale-context` klassifiziert, `semanticChangesMade === 0`, und der neuere kanonische Project Brain bleibt Byte für Byte unverändert.

## Was dieser Proof beweist

Für den exakt getesteten Source-Stand:

- Provider-/Agentenausgabe ist Evidenz, nicht Project Truth;
- ein Kandidat kann seine eigene dauerhafte Mutation nicht autorisieren;
- ein älterer Context Packet wird nicht still an einen neueren kanonischen Zustand gebunden;
- die getesteten Fehlerpfade führen zu null semantischen Änderungen;
- die verwalteten Project-Brain-Dateien bleiben während der blockierten Versuche unverändert.

## Was dieser Proof nicht beweist

Dieser Proof behauptet nicht:

- dass alle möglichen KI-Fehler eingedämmt werden;
- dass jede Livariant-Oberfläche durch dieses eine Szenario abgedeckt ist;
- dass Provider-Output allein durch Korrelation mit einem Context Packet authentifiziert wird;
- dass ein künftiger Release qualifiziert oder autorisiert ist;
- dass `v0.1.0-rc.3` diese Post-RC3-Funktion enthält.

Das umfassendere Sicherheitsmodell hängt weiterhin von den konkreten Truth-, Authority-, Verification-, Recovery-, Guardian- und Self-Integrity-Verträgen des getesteten Source-Stands ab.

## Warum der Proof ausführbar ist

Das Szenario verwendet dieselben Runtime-Funktionen und Project-Brain-Dateien, die auch von den bestehenden Provider-Return-Tests verwendet werden. Es simuliert keinen Erfolg durch geänderte Produktionssemantik und behandelt Prosa nicht als Evidenz.

Relevante Implementierungsdokumentation:

- [Provider Roundtrip Evidence Intake](provider-roundtrip-evidence.md)
- [Agent-Assisted Semantic Maintenance](semantic-maintenance.md)
- [Proposal-bound Authorization Foundation](proposal-bound-authorization.md)
- [Semantic Apply](semantic-apply.md)
