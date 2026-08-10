# Third-Party Notices

Livariant's packed Runtime currently declares **no runtime package dependencies**.

The repository uses third-party development/build tooling that is not shipped as a runtime dependency of the packed Livariant package:

| Component | Role | License recorded by the locked dependency metadata |
| --- | --- | --- |
| TypeScript | compiler / development dependency | Apache-2.0 |
| `@types/node` | Node.js type definitions / development dependency | MIT |
| `undici-types` | transitive type dependency of `@types/node` | MIT |

The authoritative versions and integrity metadata are recorded in `package-lock.json`.

This notice summarizes the current JavaScript dependency surface for Public Preview preparation. It does not replace the license texts or notices supplied by upstream projects, and it must be reviewed again if runtime dependencies, bundled third-party code, generated assets, or other redistributable components are added.

## Runtime package boundary

The package allowlist is intentionally narrow (`dist/src` plus package metadata). Tests, fixtures, repository documentation, and development dependencies are not intentionally included as runtime payload.

The package smoke test verifies the packaged file boundary before installing the artifact into a clean consumer project.
