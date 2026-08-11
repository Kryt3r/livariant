# Contributing to Livariant

Livariant is in Public Preview. Community participation is welcome when it preserves the framework's accepted ownership, authority, lifecycle, and compatibility boundaries.

## Current contribution gate

**External code contributions are not yet accepted for incorporation into Livariant.**

The project is finalizing contributor terms that must remain compatible with Livariant's source-available licensing model and its ability to offer separate commercial licenses in the future. Until those terms are published, please do not open a pull request containing code intended for incorporation.

Bug reports, reproducible issue reports, documentation feedback, design discussion, and other non-code participation are still welcome.

This is a temporary ownership/licensing safeguard, not a statement that community code contributions will never be accepted.

## Before contributing feedback

Please read:

- `README.md`;
- `LICENSING.md`;
- `docs/architecture-and-safety.md`;
- `docs/preview-scope.md`;
- `core/charter.md`.

The framework is intentionally past its Foundation-expansion phase. New ideas should be classified as a Preview blocker, a bounded Preview limitation, or post-Preview work rather than silently expanding architecture.

## License

Livariant is source-available under the **PolyForm Perimeter License 1.0.1** by default. It is not offered as OSI-approved Open Source.

See `LICENSE` for the authoritative terms and `LICENSING.md` for the project's practical licensing explanation and commercial-licensing boundary.

Do not submit code, documentation, assets, or other material that you do not have the right to share.

## Future code contributions

Before external code contributions are opened, Livariant will publish contributor terms that define the rights granted with accepted contributions and their relationship to the default source-available license and possible separate commercial licensing.

No assumption should be made that merely opening a pull request grants Livariant additional relicensing or commercial-licensing rights beyond whatever contributor terms are explicitly in force at that time.

## Future pull requests

When code contributions are opened, focused changes with a clear reason and bounded effects will be preferred. A useful pull request should state:

- the problem being solved;
- the protected behavior or contract involved;
- what changes;
- what intentionally does not change;
- tests or executable evidence added/updated;
- compatibility, migration, authority, privacy, licensing, or security implications when relevant.

For changes touching existing projects or lifecycle behavior, preservation and recovery behavior should be explicit rather than assumed.

## Required quality bar

For future code contributions, the baseline verification commands are:

```bash
npm ci
npm run build
npm test
npm run test:package
```

Changes that alter a supported public path should include executable evidence at the same boundary users rely on. Library-only tests are not enough when the change affects the installed CLI or packaged distribution path.

## Compatibility and migrations

Do not propose silently reinterpreting an existing Project Brain schema, release channel, provider capability, or accepted lifecycle state.

A breaking Project Brain change requires an explicit supported migration path or an explicit unsupported-state classification. A framework update must not use migration as permission to rewrite unrelated project-owned state.

> [!IMPORTANT]
> Capability is not authority. A contribution that adds a technical capability must not silently expand what Livariant is authorized to inspect, mutate, migrate, repair, or publish.

## Security issues

Do not open a public issue containing exploitable vulnerability details. Follow `SECURITY.md`.

## AI-assisted participation

AI tools may be used to help prepare reports, documentation feedback, or future contributions, but the participant remains responsible for reviewing the submitted material, ensuring they have the right to submit it, and verifying that claims are accurate.

Provider-generated text, hidden session state, or native agent instruction files do not outrank canonical repository contracts merely because an AI tool produced them.

## Conduct

Be specific, technical, and respectful. Critique designs and evidence rather than people. Deliberate disagreement is acceptable; harassment, threats, discriminatory abuse, or deliberate disruption are not.
