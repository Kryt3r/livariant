# Provider Roundtrip Evidence Intake

Provider Roundtrip Evidence Intake ist eine lokale Repository-Funktion nach RC3, die genau einen strukturierten Provider-Return als **nicht vertrauenswürdige Evidence** entgegennimmt und mit genau einer bereitgestellten ready Provider-Context-Kopie korreliert.

Provider-Ausgabe wird dadurch weder zu vertrauenswürdiger Projektwahrheit, noch beweist ein Provider-Context-Paket, dass Livariant dieses Paket historisch tatsächlich ausgegeben oder zugestellt hat.

Unterstützte Provider bleiben:

- `claude-code`
- `codex`

Diese Funktion ist Repository-Entwicklung nach RC3 und nicht Bestandteil des unveränderlichen Releases `v0.1.0-rc.3`.

## CLI

```bash
livariant provider-return --context provider-context.json --input provider-return.json
livariant provider-return --context provider-context.json --input provider-return.json --json
livariant provider-return --context provider-context.json --input provider-return.json --authorization <authorization-id> --json
```

Runtime-API: `processProviderReturn()`.

Context- und Return-Dateien sind externe Eingabe. Livariant parst beide strikt, bevor sie weiterverwendet werden.

## Provider-Return-Form

Ein Provider-Return verwendet Schema-/Packet-Version 1 und enthält:

```json
{
  "schemaVersion": 1,
  "packetVersion": 1,
  "provider": "codex",
  "contextPacketId": "pcx_<sha256>",
  "stableProjectIdentity": "<project-uuid>",
  "baselineDigest": "<sha256>",
  "taskDigest": "<sha256>",
  "candidate": null
}
```

`candidate` darf `null` oder genau ein Candidate aus dem bereits bestehenden Semantic-Proposal-Candidate-Schema sein. WP-011 führt keine neue semantische Mutationsdomäne ein.

Unbekannte Felder für Zustimmung, Authority, Safety-State oder Mutationsberechtigung werden nicht als Möglichkeit akzeptiert, den Return stärker zu autorisieren.

## Korrelation ist keine Authority

Livariant prüft deterministisches Korrelationsmaterial, darunter:

- unterstützter Provider;
- interne Konsistenz der Provider-Context-Packet-ID;
- stabile logische Project-Brain-Identität;
- materiale Baseline;
- Task-Korrelation;
- Beziehung zwischen Return und Context-Paket.

Diese Prüfungen belegen ausschließlich Korrelation.

Sie beweisen **nicht**:

- dass Livariant das bereitgestellte Paket historisch ausgegeben hat;
- dass ein Provider es tatsächlich konsumiert hat;
- dass Provider-Ausgabe kanonische Project-Brain-Wahrheit ist;
- dass der Nutzer dem Candidate zugestimmt hat;
- dass Mutation autorisiert ist.

Ein Aufrufer kann eine schema-gültige, intern selbstkonsistente Provider-Context-Kopie und einen dazu passenden Return fabrizieren. Dieses fabrizierte Paar darf keine stärkere Fähigkeit besitzen als die direkte Übergabe desselben typisierten Candidates an die bestehende Semantic-Maintenance-Oberfläche.

Kopierte Provider-Context-Evidence wird deshalb strukturell validiert, bleibt aber nicht vertrauenswürdig.

## Frische lokale Wahrheit und Staleness

Bevor ein zurückgegebener Candidate in Semantic Maintenance gelangen kann, rekonstruiert Livariant den aktuellen kanonischen Project-Brain-Kontext frisch und lokal.

Die aktuell vertrauenswürdige stabile Project Identity und die materiale Baseline müssen weiterhin zur korrelierten Provider-Context-Kopie passen.

Wenn sich die materiale Project-Brain-Baseline nach Erstellung des Contexts verändert hat, wird der Return zu `stale-context`. Livariant bindet alte Provider-Evidence nicht stillschweigend an eine neuere Baseline um.

Wenn Provider, Packet, Task, Project Identity oder anderes erforderliches Korrelationsmaterial nicht passt, lautet das Ergebnis `mismatched-context`.

Ein blockierter aktueller Project-Brain-Zustand bleibt blockiert.

## Candidate- und Authorization-Grenze

Ein kohärenter aktueller Return darf höchstens einen bestehenden schema-konformen Candidate enthalten.

Der Candidate wird normalisiert und an die bestehende `maintainSemanticProjectState()`-Komposition übergeben. WP-011 erzeugt keine zweite Proposal-, Authorization-, Authority-Store- oder Mutationsimplementierung.

Ohne `--authorization` sucht oder konsumiert Provider Return niemals implizit passende bestehende Authority. Das normale zulässige Ergebnis bleibt `authorization-required` oder ein anderer nicht mutierender Review-/Block-State.

Mit `--authorization <id>` ist die ID nur ein ausdrücklicher Selektor für bereits bestehende proposal-gebundene Authority. Mutation kann ausschließlich über den bereits verifizierten Semantic-Apply-Pfad und dessen exakte Regeln für Project Identity, Baseline, Proposal, Scope, Lifecycle, Replay, Recovery und Verifikation erfolgen.

Provider-Return-Bytes können weder Zustimmung noch Authority erzeugen.

## Roundtrip-to-maintain-Kohärenz

Der Provider-Return-Pfad übergibt die frisch verifizierte erwartete stabile Project Identity und materiale Baseline als nur für diesen Aufruf geltende Kohärenzbedingungen an Semantic Maintenance.

Nachdem Semantic Maintenance den Candidate gegen frischen kanonischen Zustand neu aufgebaut hat, blockiert eine veränderte Identität oder Baseline vor Actionable-Proposal-Erstellung, Authority-Lookup/-Consumption oder semantischer Mutation.

Diese Bedingung ist kein neuer Trust Root, kein Issuance-Ledger und kein persistentes Recovery-Objekt.

## Ergebniszustände

Der lokale Roundtrip stellt strukturierte Zustände bereit, darunter:

- `no-candidate`;
- `candidate-received` mit verschachteltem Semantic-Maintenance-Ergebnis;
- `stale-context`;
- `mismatched-context`;
- `blocked`.

Bei einem zulässigen Candidate ohne ausdrückliche Authorization lautet der verschachtelte Maintenance-State normalerweise `authorization-required`, und semantische Änderungen bleiben null.

## Explizite Grenzen

Provider Roundtrip Evidence Intake führt nicht ein:

- MCP- oder Netzwerktransport;
- automatische Provider-Injektion;
- Provider-Prozesssteuerung;
- provider-spezifische Authorization;
- vertrauenswürdige Provider-Context-Issuance-Historie;
- Packet-Signaturen oder Authentifizierung;
- freie LLM-Inferenz dauerhafter Wahrheit innerhalb Livariants;
- automatische Candidate-Extraktion aus beliebigem Gesprächstext;
- Standing- oder Wildcard-Authorization;
- Batch-Candidates oder Multi-Mutation-Transaktionen;
- neue semantische Domänen;
- beliebige Repository-Schreibvorgänge;
- Release, Tag oder Package-Publication.

Siehe auch:

- [Provider Context Foundation](provider-context-foundation.md)
- [Agent-Assisted Semantic Maintenance](semantic-maintenance.md)
- [Proposal-bound Authorization Foundation](proposal-bound-authorization.md)
- [Semantic Apply](semantic-apply.md)
