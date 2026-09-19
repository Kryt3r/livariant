import "./about-support-settings.css";
import { invoke } from "@tauri-apps/api/core";
import { getLanguage } from "./i18n/runtime.js";

type DesktopPublicIdentity = {
  version: string;
  releaseChannel: string;
  repository: string;
};

type RuntimeHealth = {
  state: string;
  coreVersion: string | null;
  coreSourceSha: string | null;
  nodeVersion: string | null;
  authorityIssued: boolean;
  detail: string;
};

let identity: DesktopPublicIdentity | null = null;
let runtime: RuntimeHealth | null = null;
let loading = false;
let error: string | null = null;

const text = (en: string, de: string) => getLanguage() === "de" ? de : en;
const esc = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character] ?? character);

const shortSha = (value: string | null | undefined) => value?.trim() ? value.trim().slice(0, 12) : "—";

const resourceButton = (resource: string, labelEn: string, labelDe: string) =>
  `<button class="button secondary about-resource-button" type="button" data-public-resource="${resource}">${text(labelEn, labelDe)} <span aria-hidden="true">↗</span></button>`;

export async function refreshAboutSupportSettings(): Promise<void> {
  loading = true;
  error = null;
  try {
    [identity, runtime] = await Promise.all([
      invoke<DesktopPublicIdentity>("desktop_public_identity"),
      invoke<RuntimeHealth>("runtime_health"),
    ]);
  } catch (cause) {
    error = String(cause);
  } finally {
    loading = false;
  }
}

export function renderAboutSupportSettingsView(): string {
  const version = identity?.version ?? "—";
  const channel = identity?.releaseChannel ?? text("Preview", "Vorschau");
  const sourceSha = runtime?.coreSourceSha ?? null;
  const runtimeState = runtime?.state ?? "unknown";

  return `
    <section class="settings-panel about-support-settings" data-about-support-settings>
      <div class="about-support-heading">
        <div>
          <span class="eyebrow">${text("About & support", "Über Livariant & Hilfe")}</span>
          <h2>${text("Livariant, help and legal information", "Livariant, Hilfe und rechtliche Informationen")}</h2>
          <p>${text(
            "Public project links, support, privacy and release identity in one predictable place.",
            "Projektlinks, Support, Datenschutz und Release-Identität an einem festen Ort.",
          )}</p>
        </div>
        <div class="about-app-mark" aria-hidden="true">L</div>
      </div>

      <section class="about-identity-card">
        <div>
          <span class="eyebrow">${text("Installed identity", "Installierte Identität")}</span>
          <h3>Livariant Desktop</h3>
          <p>${text(
            "This identifies the installed Desktop build. Repository main may be newer than a published Preview.",
            "Diese Angaben identifizieren den installierten Desktop-Build. Repository-main kann neuer als ein veröffentlichtes Preview sein.",
          )}</p>
        </div>
        <dl class="about-identity-grid">
          <div><dt>${text("Version", "Version")}</dt><dd>${esc(version)}</dd></div>
          <div><dt>${text("Channel", "Kanal")}</dt><dd>${esc(channel)}</dd></div>
          <div><dt>${text("Source SHA", "Quell-SHA")}</dt><dd title="${esc(sourceSha ?? "")}">${esc(shortSha(sourceSha))}</dd></div>
          <div><dt>${text("Runtime", "Runtime")}</dt><dd>${esc(runtimeState)}</dd></div>
        </dl>
      </section>

      <div class="about-support-grid">
        <article class="about-support-card">
          <div class="about-card-icon" aria-hidden="true">GH</div>
          <div>
            <span class="eyebrow">GitHub</span>
            <h3>${text("Project & source code", "Projekt & Source-Code")}</h3>
            <p>${text(
              "Open the canonical Livariant repository. Social and Discord destinations will only appear here once real public destinations exist.",
              "Öffne das kanonische Livariant-Repository. Social- und Discord-Ziele erscheinen hier erst, wenn echte öffentliche Ziele existieren.",
            )}</p>
          </div>
          <div class="about-card-actions">${resourceButton("repository", "Open repository", "Repository öffnen")}</div>
        </article>

        <article class="about-support-card">
          <div class="about-card-icon" aria-hidden="true">!</div>
          <div>
            <span class="eyebrow">${text("Support", "Support")}</span>
            <h3>${text("Report a problem", "Problem melden")}</h3>
            <p>${text(
              "Use GitHub Issues for reproducible bugs and product feedback. Do not publish security vulnerabilities as ordinary issues.",
              "Nutze GitHub Issues für reproduzierbare Fehler und Produktfeedback. Sicherheitslücken gehören nicht in normale Issues.",
            )}</p>
          </div>
          <div class="about-card-actions">
            ${resourceButton("issues", "Open Issues", "Issues öffnen")}
            ${resourceButton("security", "Security reporting", "Security melden")}
          </div>
        </article>
      </div>

      <section class="about-legal-section">
        <div class="about-section-heading">
          <div><span class="eyebrow">${text("Privacy & legal", "Datenschutz & Rechtliches")}</span><h3>${text("Public information", "Öffentliche Informationen")}</h3></div>
        </div>

        <div class="about-legal-list">
          <article>
            <div><strong>${text("Privacy", "Datenschutz")}</strong><p>${text(
              "Livariant currently has no usage telemetry or automatic Project Brain upload. The Desktop does perform bounded operator-safety polling; GitHub and AI-provider traffic only occurs through their documented connection paths.",
              "Livariant besitzt derzeit keine Nutzungstelemetrie und keinen automatischen Project-Brain-Upload. Der Desktop führt einen begrenzten Operator-Sicherheitsabruf aus; GitHub- und KI-Provider-Verkehr erfolgt nur über die dokumentierten Verbindungspfade.",
            )}</p></div>
            ${resourceButton("privacy", "Privacy details", "Datenschutzdetails")}
          </article>

          <article>
            <div><strong>${text("Imprint / provider information", "Impressum / Anbieterangaben")}</strong><p>${text(
              "The official provider information is maintained on the maintainer's website. Livariant opens that fixed official destination.",
              "Die offiziellen Anbieterangaben werden auf der Website des Maintainers gepflegt. Livariant öffnet dieses fest hinterlegte offizielle Ziel.",
            )}</p></div>
            ${resourceButton("imprint", "Open imprint", "Impressum öffnen")}
          </article>

          <article>
            <div><strong>${text("Software license", "Software-Lizenz")}</strong><p>${text(
              "Review Livariant's software license before redistribution or other use that depends on license terms.",
              "Prüfe Livariants Software-Lizenz vor Weiterverteilung oder anderer Nutzung, die von Lizenzbedingungen abhängt.",
            )}</p></div>
            ${resourceButton("license", "Open license", "Lizenz öffnen")}
          </article>

          <article>
            <div><strong>${text("Third-party notices", "Drittanbieter-Hinweise")}</strong><p>${text(
              "Third-party redistribution notices are part of the public-release audit and will be completed before the first official public release.",
              "Drittanbieter-Hinweise zur Weiterverteilung sind Teil des Public-Release-Audits und werden vor dem ersten offiziellen öffentlichen Release vervollständigt.",
            )}</p></div>
            ${resourceButton("third-party", "Open notices", "Hinweise öffnen")}
          </article>
        </div>
      </section>

      <footer class="about-support-boundary">
        <strong>${text("Links do not grant Authority.", "Links vergeben keine Authority.")}</strong>
        <span>${text(
          "Opening a public resource cannot change project files, repositories or release state.",
          "Das Öffnen einer öffentlichen Ressource kann weder Projektdateien noch Repositories oder Release-State verändern.",
        )}</span>
      </footer>

      ${loading ? `<div class="about-support-status">${text("Loading installed identity…", "Installierte Identität wird geladen…")}</div>` : ""}
      ${error ? `<div class="about-support-status error"><strong>${text("Installed build details could not be loaded.", "Details zum installierten Build konnten nicht geladen werden.")}</strong><details><summary>${text("Show technical details", "Technische Details anzeigen")}</summary><pre>${esc(error)}</pre></details></div>` : ""}
    </section>
  `;
}

export function bindAboutSupportSettingsEvents(rerender: () => void): void {
  document.querySelectorAll<HTMLButtonElement>("[data-public-resource]").forEach((button) => {
    button.addEventListener("click", async () => {
      const resource = button.dataset.publicResource;
      if (!resource) return;
      button.disabled = true;
      try {
        await invoke("open_public_resource", { resource });
      } catch (cause) {
        error = String(cause);
        rerender();
      } finally {
        button.disabled = false;
      }
    });
  });
}
