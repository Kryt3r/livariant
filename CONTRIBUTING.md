# Contributing to Livariant

Livariant is in Public Preview preparation. Contributions are welcome when they preserve the framework's accepted ownership, authority, lifecycle, and compatibility boundaries.

## Before contributing

Please read:

- `README.md`;
- `docs/architecture-and-safety.md`;
- `docs/preview-scope.md`;
- `core/charter.md`;
- `distribution/public-preview-readiness.md`.

The framework is intentionally past its Foundation-expansion phase. New ideas should be classified as a Preview blocker, a bounded Preview limitation, or post-Preview work rather than silently expanding architecture.

## Contribution license

The repository is licensed under the Apache License 2.0. Unless explicitly stated otherwise, intentionally submitted contributions are provided under the same license terms described by the repository `LICENSE`.

No separate Contributor License Agreement (CLA) or Developer Certificate of Origin (DCO) is required for the current Preview contribution process. If that policy ever changes, the change must be announced before it applies to new contributions.

Do not submit code, documentation, assets, or other material that you do not have the right to contribute.

## Pull requests

Prefer focused changes with a clear reason and bounded effects. A useful pull request should state:

- the problem being solved;
- the protected behavior or contract involved;
- what changes;
- what intentionally does not change;
- tests or executable evidence added/updated;
- compatibility, migration, authority, privacy, or security implications when relevant.

For changes touching existing projects or lifecycle behavior, preservation and recovery behavior should be explicit rather than assumed.

## Required quality bar

Before requesting review:

```bash
npm ci
npm run build
npm test
npm run test:package
```

Changes that alter a supported public path should include executable evidence at the same boundary users rely on. Library-only tests are not enough when the change affects the installed CLI or packaged distribution path.

## Compatibility and migrations

Do not silently reinterpret an existing Project Brain schema, release channel, provider capability, or accepted lifecycle state.

A breaking Project Brain change requires an explicit supported migration path or an explicit unsupported-state classification. A framework update must not use migration as permission to rewrite unrelated project-owned state.

## Security issues

Do not open a public issue containing exploitable vulnerability details. Follow `SECURITY.md`.

## AI-assisted contributions

AI tools may be used to help create contributions, but the contributor remains responsible for reviewing the submitted material, ensuring they have the right to contribute it, and verifying that tests and claims are accurate.

Provider-generated text, hidden session state, or native agent instruction files do not outrank canonical repository contracts merely because an AI tool produced them.

## Conduct

Be specific, technical, and respectful. Critique designs and evidence rather than people. Deliberate disagreement is acceptable; harassment, threats, discriminatory abuse, or deliberate disruption are not.
