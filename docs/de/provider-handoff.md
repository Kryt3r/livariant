# Provider-Handoff

Die Provider-Oberfläche der Public Preview ist bewusst eng gefasst: Sie unterstützt **Project-Brain-Resume-Handoff** für Claude Code und Codex. Sie beansprucht keine vollständige Kontrolle über die gesamte Tool- oder Agent-Oberfläche beider Provider.

## Was übertragen wird

Livariant überträgt kein verstecktes Provider-Sitzungsmemory. Stattdessen verarbeitet jeder Provider unabhängig einen Resume-Kontext, der aus dem kanonischen Project-Brain-State abgeleitet wird.

Konzeptionell:

```text
Project Brain
→ kanonischer ResumeContext
   ├─ Claude-Code-Projektion
   └─ Codex-Projektion
```

Die Darstellung kann unterschiedlich sein. Die kanonische Semantik darf es nicht sein.

## Explizite Umgebungsevidenz

Die CLI verlangt explizite Evidenz zur aktuell verwendeten Provider-Umgebung:

```bash
LIVARIANT_PROVIDER_ENV=claude-code livariant resume --provider claude-code
LIVARIANT_PROVIDER_ENV=codex livariant resume --provider codex
```

Ein providerspezifischer Handoff ohne passende Evidenz schlägt fail-closed fehl, statt Kompatibilität vorzutäuschen.

Explizite Auswahl schafft aktuelle Anwendbarkeitsevidenz für die unterstützte Resume-Capability. Sie erzeugt keine Mutationsautorität.

Die gebündelten Preview-Adapteridentitäten sind:

```text
livariant.claude-code.resume
livariant.codex.resume
```

## Handoff-Beispiel

Ein unterstützter Übergang sieht so aus:

1. Claude Code arbeitet am Projekt, und akzeptierte Projektwahrheit wird im Project Brain persistiert.
2. Die Claude-Sitzung endet.
3. Kein versteckter Claude-Memory-State wird zu Codex kopiert.
4. Codex startet separat gegen dasselbe Projektverzeichnis.
5. Codex fordert seine providerspezifische Resume-Projektion aus dem kanonischen Brain an.
6. Codex rekonstruiert aktive Entscheidungen, bekannte Fakten, Ziele, Unbekannte und Lifecycle-Kontext aus diesem kanonischen Zustand.

Die ausführbare Hardening-Suite testet dies in isolierten Prozessen mit unterschiedlichen provider-lokalen Hidden-Memory-Werten.

## Native Provider-Instruktionsdateien

`CLAUDE.md` und `AGENTS.md` sind nicht das Project Brain. Bestehende Dateien bleiben menschlich/projekt-eigen und werden von den aktuellen Resume-Adaptern nicht überschrieben.

Widersprüchlicher Text in diesen Dateien ersetzt im unterstützten Resume-Pfad nicht die kanonische Project-Brain-Wahrheit.

Das bedeutet **nicht**, dass zukünftige Native-Instruction-Integration automatisch sicher ist. Wenn ein zukünftiger Adapter beginnt, diese Dateien zu erzeugen oder abzugleichen, benötigt diese neue Mutationsoberfläche separate Autorisierungs-, Preservation-, Conformance- und adversariale Tests.

## Veralteter Kontext

Resume-Ausgabe ist abgeleitet. Sie besitzt keine Write-back-Autorität, nur weil ein Provider sie zuvor erhalten hat.

Wenn kanonische Project-Brain-Entscheidungen später geändert werden — einschließlich expliziter Supersession — kann eine ältere veraltete Resume-Projektion ihren alten Zustand nicht wieder zur Wahrheit erheben. Neue Resume-Ausgabe wird aus dem aktuellen kanonischen Zustand abgeleitet.
