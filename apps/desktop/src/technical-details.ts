import "./technical-details.css";
import { getLanguage } from "./i18n/runtime.js";

const esc = (value: string): string => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character] ?? character);

export function renderTechnicalDetails(detail: string | null | undefined): string {
  const value = detail?.trim();
  if (!value) return "";
  const summary = getLanguage() === "de" ? "Technische Details anzeigen" : "Show technical details";
  return `<details class="lv-technical-details"><summary>${summary}</summary><pre>${esc(value)}</pre></details>`;
}
