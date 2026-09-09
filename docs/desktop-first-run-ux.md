# Desktop first-run UX

Livariant Desktop treats first-run setup as a normal product workflow rather than a developer-oriented configuration form.

## Folder selection

The primary path uses the native Windows folder chooser. Manual path entry remains visible for advanced or recovery cases. Choosing a project folder does not authorize any project-file mutation.

Livariant proposes a stable project ID from the selected folder name when the user has not entered one yet. The proposed ID remains editable before it is persisted.

## Repository confirmation

After the project folder is selected, Livariant may inspect Git metadata read-only. When an existing Git checkout is detected, the source step pre-fills observed provider, repository ID, display name, remote URL and local folder where available.

Detected data is never silently accepted as the primary repository. The user must still confirm the primary-repository form explicitly. The project folder and repository binding remain distinct concepts.

## Language

Known canonical project-understanding question IDs are rendered in the current Desktop language. Canonical question IDs and lifecycle state remain unchanged; localization affects presentation only.

The Project Sources & Review surface likewise localizes its visible navigation, status labels, empty states and lifecycle labels. Raw repository IDs, revisions, evidence codes and source-owned evidence remain unchanged.

## Interaction continuity

Local actions such as saving or skipping an understanding answer, confirming a repository or refreshing a provider preserve the current scroll/focus context. Intentional navigation to a different onboarding step may move to the new step start.

## Boundaries

- folder selection and Git inspection are read-only;
- detected source metadata is evidence until explicitly confirmed as configuration;
- connection does not grant Authority;
- onboarding does not grant Self-Hosting mutation Authority or Semantic Apply;
- project-owned files are not changed by these UX improvements.
