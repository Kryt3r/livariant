import { getLanguage } from "./i18n/runtime.js";

export type FirstRunQuestionPresentation = { topic: string; prompt: string; reason: string };

const KNOWN_QUESTION_COPY: Record<string, { en: FirstRunQuestionPresentation; de: FirstRunQuestionPresentation }> = {
  "unknown:project-purpose": {
    en: {
      topic: "Project purpose",
      prompt: "What is this project for? Describe it in 1–3 sentences.",
      reason: "Livariant could not determine the project purpose clearly enough from the available files.",
    },
    de: {
      topic: "Projektzweck",
      prompt: "Wofür ist dieses Projekt gedacht? Beschreibe es in 1–3 Sätzen.",
      reason: "Livariant konnte den Projektzweck aus den vorhandenen Dateien nicht eindeutig genug bestimmen.",
    },
  },
  "unknown:current-product-direction": {
    en: {
      topic: "Current direction",
      prompt: "What is the current product direction or next meaningful outcome?",
      reason: "Livariant could not determine the current direction clearly enough from the available files.",
    },
    de: {
      topic: "Aktuelle Ausrichtung",
      prompt: "Was ist die aktuelle Produktrichtung oder das nächste sinnvolle Ergebnis?",
      reason: "Livariant konnte die aktuelle Ausrichtung aus den vorhandenen Dateien nicht eindeutig genug bestimmen.",
    },
  },
  "unknown:non-negotiable-project-rules": {
    en: {
      topic: "Rules and constraints",
      prompt: "Which project rules or constraints must not be violated?",
      reason: "Livariant could not prove which rules are non-negotiable from the available files.",
    },
    de: {
      topic: "Regeln und Grenzen",
      prompt: "Welche Projektregeln oder Einschränkungen dürfen nicht verletzt werden?",
      reason: "Livariant konnte aus den vorhandenen Dateien nicht eindeutig ableiten, welche Regeln zwingend gelten.",
    },
  },
  "unknown:project-goals": {
    en: {
      topic: "Project goals",
      prompt: "What are the most important current project goals?",
      reason: "Livariant could not determine the current goals clearly enough from the available files.",
    },
    de: {
      topic: "Projektziele",
      prompt: "Was sind die derzeit wichtigsten Ziele des Projekts?",
      reason: "Livariant konnte die aktuellen Ziele aus den vorhandenen Dateien nicht eindeutig genug bestimmen.",
    },
  },
  "unknown:preferred-technical-direction": {
    en: {
      topic: "Technical direction",
      prompt: "Is there a preferred technical direction or stack that should guide future work?",
      reason: "Livariant could not determine a preferred technical direction clearly enough from the available files.",
    },
    de: {
      topic: "Technische Ausrichtung",
      prompt: "Gibt es eine bevorzugte technische Richtung oder einen Stack, der zukünftige Arbeit leiten soll?",
      reason: "Livariant konnte eine bevorzugte technische Ausrichtung aus den vorhandenen Dateien nicht eindeutig genug bestimmen.",
    },
  },
};

export function presentFirstRunQuestion(question: FirstRunQuestionPresentation & { id: string }): FirstRunQuestionPresentation {
  const known = KNOWN_QUESTION_COPY[question.id];
  if (!known) return question;
  return getLanguage() === "de" ? known.de : known.en;
}

export function suggestProjectIdFromPath(path: string): string {
  const name = path.trim().replace(/[\\/]+$/, "").split(/[\\/]/).filter(Boolean).at(-1) ?? "project";
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "project";
}
