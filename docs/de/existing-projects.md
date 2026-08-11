# Leitfaden für bestehende Projekte

Bestehende Projekte sind ein First-Class-Anwendungsfall. Das Framework ist discovery-first und preservation-first: Es soll zuerst das vorhandene Projekt verstehen, bevor es Framework-eigenen Zustand vorschlägt.

## Sicherer Übernahmeablauf

Vom Projekt-Root aus:

```bash
livariant status
livariant doctor
livariant init
```

Die Inspektionsphase ist read-only. Prüfe die erkannte Evidenz und die vorgeschlagenen Project-Brain-Dateien, bevor du etwas autorisierst.

Wenn Initialisierung anwendbar ist:

```bash
livariant init --apply
```

Die unterstützte Übernahme erstellt Framework-eigenen Project-Brain-State. Sie reorganisiert keinen Sourcecode, schreibt keine Konfiguration um, löst keine widersprüchliche Dokumentation auf, übernimmt keine Secrets und ersetzt keine bestehenden Agent-Instruktionsdateien nur deshalb, um das Repository sauberer aussehen zu lassen.

> [!IMPORTANT]
> Bestehende projekt-eigene Dateien bleiben für ihre jeweiligen Domänen autoritativ, sofern Livariant dafür keinen expliziten Framework-eigenen Vertrag besitzt. Discovery-Capability verleiht keine Mutationsautorität.

## Was das Framework beobachten darf

Die aktuelle Baseline kann direkte Projektevidenz wie Package-Name, Vorhandensein eines Source-Verzeichnisses, Git-Präsenz und ausgewählte strukturelle Signale verwenden. Sie erfindet bewusst keine Projektziele oder architektonische Absichten aus schwachen Signalen.

Fehlerhafte oder widersprüchliche Evidenz schränkt ein, was daraus geschlossen werden darf. Eine fehlerhafte `package.json` kann beispielsweise als nicht lesbare Evidenz erfasst werden, statt ihren Inhalt zu erraten.

Das Vorhandensein sensibler Dateien wie `.env` kann als Sicherheitssignal erkannt werden. Secret-Inhalte werden vom unterstützten Initialisierungspfad nicht in Project-Brain-Wissen übernommen.

## Menschlich verwaltete Provider-Dateien

Bestehende `CLAUDE.md` und `AGENTS.md` bleiben projekt-eigen. Ihr Vorhandensein wird erkannt, aber die unterstützte Übernahme überschreibt sie nicht und erhebt widersprüchlichen Text aus diesen Dateien nicht zur kanonischen Project-Brain-Wahrheit.

Provider-Projektionen und provider-natives Memory sind keine konkurrierenden Quellen der Wahrheit. Das Project Brain bleibt die projekt-eigene kanonische Wahrheit für von Livariant verwaltetes Projektwissen.

## Initialisierung erneut ausführen

Sobald ein gültiges Project Brain existiert, ist frische Initialisierung nicht mehr die unterstützte Aktion. Ein erneutes `init --apply` darf es nicht überschreiben oder normalisieren.

Ist das Brain beschädigt, unvollständig, gedriftet oder Lifecycle-Recovery erforderlich, zuerst diagnostizieren:

```bash
livariant doctor
livariant recover
```

> [!CAUTION]
> `.project-brain/` nicht löschen oder manuell ersetzen und anschließend neu initialisieren, um einen Fehler zu reparieren. Das würde Projekthistorie verwerfen oder neu interpretieren und den unterstützten Lifecycle-/Recovery-Pfad umgehen.

Recovery nur anwenden, wenn Livariant eine gültige unterstützte Strategie meldet:

```bash
livariant recover --apply
```

## Dateisystemgrenzen

Verwaltete Project-Brain-Schreibflächen müssen echte Dateien bzw. Verzeichnisse innerhalb ihrer autorisierten Projektgrenze sein. Symlink-basierte kanonische Brain-Dateien oder Lifecycle-Verzeichnisse werden für Schreiboperationen abgelehnt statt verfolgt.

Das ist beabsichtigt: Dateisystem-Schreibfähigkeit darf semantische Autorität niemals über die Project-Brain-Speichergrenze hinaus erweitern.
