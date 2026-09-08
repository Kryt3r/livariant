# Existing-project adoption end-to-end qualification

This qualification exercises the normal Existing-Project-Adoption lifecycle on the repository's pre-existing `existing-small` project fixture.

The acceptance path covers:

- read-only discovery and adoption inventory;
- bounded content review with provenance-bearing evidence;
- explicit material-bound review decisions;
- deterministic adoption proposal construction;
- Desktop-facing lifecycle presentation without granting Authority;
- proposal-bound authorization evidence;
- protected Guardian-backed canonical Semantic Apply;
- completed-state presentation;
- replay refusal after completion;
- preservation of project-owned repository files;
- visible unresolved overlapping guidance without automatic precedence or conflict resolution.

The test does not create a second adoption engine or alternate Authority store. The CI-only harness seeds the exact canonical audit/recovery binding and a protected already-consumed Guardian one-shot so the production recovery/apply path can be exercised non-interactively. That seeded evidence is test setup, not a new product mutation path.

Evidence remains distinct from Project Truth. Proposal remains distinct from Authorization. Authorization remains distinct from completed Semantic Apply.

Self-Hosting is not part of this qualification.
