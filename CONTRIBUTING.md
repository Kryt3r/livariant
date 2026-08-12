# Contributing to Livariant

Livariant is preparing its Public Preview. Questions, bug reports, documentation feedback, and design discussion are welcome. External code contributions are currently handled differently, as explained below.

## Current code-contribution gate

**External code contributions are not yet accepted for incorporation into Livariant.**

The project is still finalizing contributor terms that must work with Livariant's source-available license and possible separate commercial licensing in the future. Until those terms are published, please do not open a pull request containing code intended for incorporation.

This is a temporary licensing and ownership safeguard. It does not mean community code contributions will never be accepted.

## What you can contribute now

You are welcome to:

- report a reproducible bug;
- report a documentation problem;
- ask a usage question;
- suggest or discuss a product idea;
- share how you are using Livariant;
- challenge an architecture or design decision with concrete reasoning and evidence.

Use [SUPPORT.md](SUPPORT.md) to choose the right GitHub channel.

Do not post security vulnerability details publicly. Follow [SECURITY.md](SECURITY.md).

## Before submitting feedback

For most users, start with:

- `README.md`;
- `SUPPORT.md`;
- `docs/preview-scope.md`.

For deeper technical discussion, these documents are also useful:

- `docs/architecture-and-safety.md`;
- `LICENSING.md`;
- `core/charter.md`.

New ideas should identify whether they address a current supported-path problem, a bounded Preview limitation, or future work. A feature request should not silently redefine current product behavior just by being proposed.

## License

Livariant is source-available under the **PolyForm Perimeter License 1.0.1** by default. It is not offered as OSI-approved Open Source.

`LICENSE` contains the authoritative terms. `LICENSING.md` explains the project's intended licensing model in more practical language.

Do not submit code, documentation, assets, or other material that you do not have the right to share.

## Future code contributions

Before external code contributions are opened, Livariant will publish contributor terms that define what rights accompany an accepted contribution and how those rights relate to the default source-available license and possible separate commercial licensing.

Do not assume that merely opening a pull request grants Livariant extra relicensing or commercial rights beyond whatever contributor terms are explicitly in force at that time.

## What future pull requests should contain

Once code contributions are opened, focused changes with a clear reason and bounded effects will be preferred.

A useful pull request should explain:

- the problem being solved;
- the protected behavior or contract involved;
- what changes;
- what intentionally stays unchanged;
- tests or executable evidence added or updated;
- compatibility, migration, authority, privacy, licensing, or security implications when relevant.

Changes that affect existing projects or lifecycle behavior should explain preservation and recovery behavior rather than leaving those effects implicit.

## Verification bar for future code contributions

The baseline verification commands are:

```bash
npm ci
npm run build
npm test
npm run test:package
```

Changes to a supported public workflow should include evidence at the same boundary users rely on. Library-only tests are not sufficient when a change affects the installed CLI or packaged distribution path.

## Compatibility and migrations

Do not propose silently reinterpreting an existing Project Brain schema, release channel, provider capability, or accepted lifecycle state.

A breaking Project Brain change needs either an explicit supported migration path or an explicit unsupported-state classification. Migration is not permission to rewrite unrelated project-owned state.

> [!IMPORTANT]
> Capability is not authority. Adding a technical capability must not silently expand what Livariant is allowed to inspect, mutate, migrate, repair, or publish.

## AI-assisted participation

Using an AI tool to help prepare a report, documentation suggestion, or future contribution is fine. The person submitting the material remains responsible for reviewing it, checking that they have the right to submit it, and verifying that factual claims are accurate.

Generated text, hidden provider memory, and native agent instruction files do not outrank canonical repository contracts simply because an AI tool produced them.

## Conduct

Beginners and experienced developers should both be able to participate without being talked down to.

Be specific and respectful. Critique designs, behavior, and evidence rather than people. Technical disagreement is welcome when it stays constructive.

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for the community rules.
