import { mountGitHubSourcePicker, type GitHubRepositorySummary } from "./github-source-picker.js";

const mounted = new WeakSet<HTMLElement>();

function fillRepositoryForm(form: HTMLFormElement, repository: GitHubRepositorySummary): void {
  const set = (name: string, value: string) => {
    const field = form.elements.namedItem(name);
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
      field.value = value;
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };
  set("provider", "github");
  set("repositoryId", repository.repositoryId);
  set("displayName", repository.displayName);
  set("remoteUrl", repository.remoteUrl);

  let selected = form.querySelector<HTMLElement>("[data-gh-selected]");
  if (!selected) {
    selected = document.createElement("div");
    selected.dataset.ghSelected = "true";
    selected.className = "fr-detected";
    form.prepend(selected);
  }
  selected.innerHTML = `<strong>GitHub</strong><span>${repository.repositoryId}${repository.private ? " · 🔒 Privat" : " · Öffentlich"} · ${repository.defaultBranch}</span>`;
}

function install(): void {
  const form = document.querySelector<HTMLFormElement>("form[data-fr-primary], form[data-fr-additional]");
  if (!form || mounted.has(form)) return;
  mounted.add(form);

  const container = document.createElement("div");
  container.dataset.frGithubSourcePicker = "true";
  form.before(container);
  void mountGitHubSourcePicker(container, (repository) => fillRepositoryForm(form, repository));
}

const observer = new MutationObserver(() => install());
observer.observe(document.body, { childList: true, subtree: true });
install();
