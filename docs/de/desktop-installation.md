# Livariant Desktop - Windows-Installation & erster Start

Diese Anleitung gilt für die **Windows-Desktop**-Produktoberfläche. Core/CLI und der geschützte Guardian-Installationspfad sind getrennte Oberflächen und bleiben unter [Installation & erstes Projekt](installation.md) dokumentiert.

## Aktuell veröffentlichtes Desktop Preview

Das aktuelle unveränderlich veröffentlichte Desktop Preview ist:

- Version: `0.1.0-rc.29`;
- Tag: `desktop-preview-0.1.0-rc.29-bbfd076f0710`;
- exakter Quellstand: `bbfd076f07103026688611f4e5438c8a58687e83`;
- Windows-Installer: `Livariant_0.1.0-rc.29_x64-setup.exe`;
- Installer-SHA-256: `12065505aac7b3c620e3cb0396b66aa6cc620bdb168bc184bd63a09b57ed8199`.

Release-Seite:

https://github.com/Kryt3r/livariant/releases/tag/desktop-preview-0.1.0-rc.29-bbfd076f0710

Repository-`main` ist neuer als dieses unveränderliche Preview. Neuerer Source-Code, Merge-State oder CI-Ergebnisse verändern das bereits veröffentlichte rc.29-Artefakt nicht.

## 1. Exakten Installer herunterladen

Lade `Livariant_0.1.0-rc.29_x64-setup.exe` von der oben genannten Release-Seite herunter.

Verwende GitHubs automatisch erzeugte Source-Code-Archive nicht als Ersatz für den Windows-Installer.

## 2. Installer-Digest prüfen

In PowerShell:

```powershell
Get-FileHash .\Livariant_0.1.0-rc.29_x64-setup.exe -Algorithm SHA256
```

Für das oben genannte unveränderliche Preview muss der Wert lauten:

```text
12065505aac7b3c620e3cb0396b66aa6cc620bdb168bc184bd63a09b57ed8199
```

Weicht der Digest ab, stoppe.

Das Release enthält zusätzlich die Tauri-Updater-Signaturdatei für den unterstützten signierten Update-Pfad.

## Windows-Publisher-Warnung

Livariants direkter GitHub-Vertrieb kann ohne Windows-Authenticode-Publisher-Identität veröffentlicht werden. Windows kann deshalb eine **Unknown publisher / SmartScreen**-Warnung anzeigen, obwohl die heruntergeladenen Bytes dem veröffentlichten Digest entsprechen. Die separate kryptografische Updater-Signatur von Livariant bleibt dabei verpflichtend; Windows-Publisher-Signing kann später ergänzt werden, ohne den direkten Download-Vertrieb zu ändern.

Updater-Signaturprüfung und Windows-Publisher-Identität sind getrennte Vertrauensschichten.

Behandle eine Warnung nicht als etwas, das Livariant für dich sicher umgehen kann. Wenn Quelle, Tag oder Digest nicht exakt dem beabsichtigten Test entsprechen, stoppe.

## 3. Installieren

Starte den geprüften NSIS-Installer.

Das aktuelle Windows-Paket verwendet eine Installation für den **aktuellen Benutzer** und macht Livariant nicht zu einer systemweiten Projekt-Authority.

Die Installation:

- vergibt keine Projekt-Mutation-Authority;
- macht Repository-Inhalte nicht automatisch zu Project Truth;
- verbindet GitHub nicht automatisch;
- verbindet keinen KI-Provider automatisch;
- veröffentlicht oder verändert kein Repository.

## 4. Erster Start

Bei neuem Desktop-State öffnet Livariant den geführten First Run.

Dieser Desktop-Flow ist vom CLI-Flow `livariant first-run` getrennt. Der Desktop kann dich durch folgende Schritte führen:

1. Projektordner auswählen;
2. erkannte Repository-Identität prüfen;
3. Fragen zum Projektverständnis beantworten oder überspringen;
4. Hauptrepository und optionale zusätzliche Repositories bestätigen;
5. optional unterstützte Provider verbinden;
6. Setup-Zustand prüfen.

Du kannst fortfahren, ohne jeden optionalen Schritt abzuschließen, und später über die Einstellungen zurückkehren.

Erkannte Daten werden nicht stillschweigend zu Project Truth oder Authority.

## 5. GitHub ist optional

Du kannst Repository-Informationen manuell eingeben oder GitHub ausdrücklich verbinden.

Wird GitHub über den Device Flow der Livariant GitHub App verbunden, kann Livariant Repositories erkennen, die GitHub für diese autorisierte Verbindung freigibt, einschließlich privater Repositories.

Die aktuelle Integration ist leseorientiert. Auswahl oder Clone eines Repositories bestätigt es nicht automatisch als Project Truth und vergibt keine Repository-Schreibfähigkeit.

Nach der Einrichtung kannst du unter **Einstellungen → Verbindungen**:

- GitHub neu verbinden oder trennen;
- zugeordnete Repositories prüfen;
- eine lokale Checkout-Zuordnung ändern;
- den Projektzweck eines zusätzlichen Repositories bearbeiten;
- ein zusätzliches Repository auf **Nur Remote** umstellen;
- eine zusätzliche Repository-Zuordnung entfernen.

Das Entfernen einer Zuordnung löscht weder das GitHub-Repository noch den lokalen Checkout.

Siehe [Desktop-GitHub-Verbindung](desktop-github-connection.md).

## 6. KI-Provider-Verbindung

Der aktuelle Desktop unterstützt den lokalen **Codex App Server**-Verbindungspfad.

Claude, Gemini und eigene Verbindungen können als **Geplant** sichtbar sein; sie werden im aktuellen Preview nicht als funktionierende Integrationen dargestellt.

Das Verbinden eines Providers autorisiert allein keine Dateiänderungen, Befehle, Merges oder Releases.

## 7. Hintergrund-/Tray-Verhalten

Im aktuellen Preview versteckt das Schließen des Hauptfensters Livariant im Windows-Tray, statt den Prozess zu beenden.

Verwende im Tray **Quit Livariant**, wenn du den Desktop-Prozess vollständig beenden möchtest.

Beende Livariant vor einer Deinstallation des aktuellen Previews ausdrücklich über den Tray.

Dieses Verhalten wird vor dem ersten offiziellen öffentlichen Release auf eine klarere First-Use-Darstellung geprüft.

## 8. Updates

Livariant führt keinen automatischen Remote-Update-Check aus.

Verwende **Einstellungen → Updates → Nach Updates suchen**, wenn du den konfigurierten signierten Preview-Kanal prüfen möchtest.

Der Desktop prüft das Ziel vor der Installation erneut und verifiziert die Updater-Signing-Identität. Ein verifizierter Operator-Sicherheitsblock kann die Installation einer exakten Zielversion verhindern.

Siehe [Datenschutz & Netzwerkverhalten](privacy-and-network.md) für den davon getrennten automatischen Operator-Sicherheitsabruf.

## 9. Deinstallation

Beende Livariant zuerst vollständig über den Tray.

Verwende danach den normalen Windows-Pfad für installierte Apps/Deinstallation.

Repository-Dateien und GitHub-Repositories sind keine projektbezogenen Deinstallationsziele. Lösche Projekt-Repositories nicht manuell als Teil einer Desktop-Deinstallation.

App-Daten-Aufbewahrung/-Entfernung ist von Projekt-Repository-Löschung getrennt; behandle Deinstallation nicht als Projekt-Datenlöscher.

## Desktop vs. Core/CLI

Livariant besitzt derzeit getrennte Produktoberflächen:

- **Desktop** - Windows-first Normalnutzer-Oberfläche dieser Anleitung;
- **Core/CLI** - Kommandozeilen- und geschützte Guardian-/Runtime-Workflows unter [Installation & erstes Projekt](installation.md).

Beide Oberflächen teilen Livariants Trust-/Authority-Semantik, haben aber nicht denselben Installations- oder First-Run-Pfad.

## Sicherheit und Datenschutz

- [Datenschutz & Netzwerkverhalten](privacy-and-network.md)
- [Architektur & Sicherheit](architecture-and-safety.md)
- [Security Policy](../../SECURITY.md)
- [Lizenzierung](../../LICENSING.md)
- [Third-Party Notices](../../THIRD_PARTY_NOTICES.md)
