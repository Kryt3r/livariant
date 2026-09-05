import { invoke } from "@tauri-apps/api/core";
import {
  germanToKey,
  messageFor,
  sourceToKey,
  type DesktopLanguage,
  type MessageKey,
} from "./catalog.js";

const STORAGE_KEY = "livariant.desktop.language.v1";
const sourceText = new WeakMap<Text, string>();
const sourceAttributes = new WeakMap<Element, Map<string, string>>();
const listeners = new Set<() => void>();

const readStoredLanguage = (): DesktopLanguage | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "de" || stored === "en" ? stored : null;
  } catch {
    return null;
  }
};

const systemLanguage = (): DesktopLanguage =>
  navigator.language.toLowerCase().startsWith("de") ? "de" : "en";

let language: DesktopLanguage = readStoredLanguage() ?? systemLanguage();
document.documentElement.lang = language;

export const getLanguage = (): DesktopLanguage => language;
export const t = (key: MessageKey): string => messageFor(language, key);

const canonicalSource = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const key = germanToKey.get(trimmed);
  return key ? value.replace(trimmed, messageFor("en", key)) : value;
};

const translateSource = (source: string): string => {
  const trimmed = source.trim();
  if (!trimmed) return source;
  const key = sourceToKey.get(trimmed);
  if (!key) return source;
  return source.replace(trimmed, messageFor(language, key));
};

const shouldIgnore = (element: Element | null): boolean => Boolean(element?.closest(
  "[data-i18n-ignore], textarea, input, code, pre, script, style, svg, .truth-formatted-value, .truth-review-source-text, .truth-source-rendered, .truth-source-raw",
));

const localizeText = (node: Text) => {
  if (shouldIgnore(node.parentElement)) return;
  let source = sourceText.get(node);
  if (source === undefined) {
    source = canonicalSource(node.data);
    sourceText.set(node, source);
  }
  const next = translateSource(source);
  if (node.data !== next) node.data = next;
};

const localizeAttribute = (element: Element, name: "placeholder" | "title" | "aria-label") => {
  if (shouldIgnore(element)) return;
  const current = element.getAttribute(name);
  if (current === null) return;
  let attributes = sourceAttributes.get(element);
  if (!attributes) {
    attributes = new Map();
    sourceAttributes.set(element, attributes);
  }
  let source = attributes.get(name);
  if (source === undefined) {
    source = canonicalSource(current);
    attributes.set(name, source);
  }
  const next = translateSource(source);
  if (current !== next) element.setAttribute(name, next);
};

const localizeElement = (element: Element) => {
  if (shouldIgnore(element)) return;
  element.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) localizeText(child as Text);
  });
  localizeAttribute(element, "placeholder");
  localizeAttribute(element, "title");
  localizeAttribute(element, "aria-label");
  element.querySelectorAll<Element>("*").forEach((child) => {
    if (shouldIgnore(child)) return;
    child.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) localizeText(node as Text);
    });
    localizeAttribute(child, "placeholder");
    localizeAttribute(child, "title");
    localizeAttribute(child, "aria-label");
  });
};

export const localize = (root: ParentNode = document.body) => {
  if (root instanceof Element) localizeElement(root);
  else root.querySelectorAll<Element>("*").forEach(localizeElement);
};

const languageCopy = () => ({
  eyebrow: t("settings.language"),
  title: t("settings.appLanguage"),
  detail: t("settings.languageDetail"),
});

const ensureLanguageControl = () => {
  const panel = [...document.querySelectorAll<HTMLElement>(".settings-content-body .settings-panel")].find((candidate) => {
    const title = candidate.querySelector("h2")?.textContent?.trim();
    return title === messageFor(language, "settings.general");
  });
  if (!panel) return;

  let card = panel.querySelector<HTMLElement>(".language-setting-card");
  if (!card) {
    card = document.createElement("div");
    card.className = "language-setting-card";
    card.dataset.i18nIgnore = "true";
    const firstSettingsCard = panel.querySelector<HTMLElement>(".settings-card");
    if (firstSettingsCard) firstSettingsCard.insertAdjacentElement("beforebegin", card);
    else panel.append(card);
  }

  const copy = languageCopy();
  if (card.dataset.language !== language) {
    card.dataset.language = language;
    card.innerHTML = `
      <div class="language-setting-copy">
        <small>${copy.eyebrow}</small>
        <strong>${copy.title}</strong>
        <span>${copy.detail}</span>
      </div>
      <div class="language-setting-options" role="group" aria-label="${copy.title}">
        <button class="language-setting-option ${language === "de" ? "active" : ""}" type="button" data-language="de">Deutsch</button>
        <button class="language-setting-option ${language === "en" ? "active" : ""}" type="button" data-language="en">English</button>
      </div>`;
  }

  card.querySelectorAll<HTMLButtonElement>("[data-language]").forEach((button) => {
    if (button.dataset.i18nBound === "true") return;
    button.dataset.i18nBound = "true";
    button.addEventListener("click", () => {
      const next = button.dataset.language;
      if (next === "de" || next === "en") setLanguage(next);
    });
  });
};

const applyLanguage = () => {
  document.documentElement.lang = language;
  localize(document.body);
  ensureLanguageControl();
  listeners.forEach((listener) => listener());
};

export const setLanguage = (next: DesktopLanguage) => {
  if (language === next) return;
  language = next;
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Preference persistence must not block UI. */ }
  applyLanguage();
};

export const onLanguageChange = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const observer = new MutationObserver((records) => {
  // MutationObserver callbacks run in the same microtask checkpoint, before the next paint.
  // Localize only newly inserted subtrees; no requestAnimationFrame and no whole-page rescans.
  records.forEach((record) => {
    record.addedNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) localizeText(node as Text);
      else if (node instanceof Element) localizeElement(node);
    });
  });
  ensureLanguageControl();
});
observer.observe(document.documentElement, { childList: true, subtree: true });

const hydrateInstallerLanguage = async () => {
  if (readStoredLanguage()) return;
  try {
    const installerLanguage = await invoke<string | null>("installer_language");
    if (installerLanguage !== "de" && installerLanguage !== "en") return;
    if (readStoredLanguage()) return;
    language = installerLanguage;
    try { localStorage.setItem(STORAGE_KEY, installerLanguage); } catch { /* Best effort first-run seed. */ }
    applyLanguage();
  } catch {
    // Dev/non-Windows environments may not provide an installer preference.
  }
};

applyLanguage();
void hydrateInstallerLanguage();
