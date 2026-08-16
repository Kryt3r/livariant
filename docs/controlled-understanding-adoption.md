# Controlled starting understanding adoption

`livariant adopt-understanding` bridges selected Guided Project Understanding Review input into Livariant's existing hardened proposal and authorization path.

It does **not** accept the whole review, does not treat review input as Project Truth, and does not mutate Project Brain by itself.

## Supported v1 flow

```text
current project discovery
-> guided understanding review input
-> material-bound candidate id
-> actionable proposal
-> separate `authorize`
-> separate `apply`
-> verified Project Brain mutation
```

Command:

```text
livariant adopt-understanding --input <review.json> --select <candidate-id> [--json]
```

The review input uses the same bounded schema as `livariant understand --input`. Candidate evidence now carries a deterministic `candidateId` bound to its kind, target, normalized statement and candidate-evidence trust class. The human `understand` output shows the same id.

If the statement changes, its candidate id changes. Adoption therefore fails closed instead of silently treating different text under the same review topic as the material the user selected.

V1 deliberately supports only two unambiguous response mappings:

- `unknown:project-goals` -> `project-goal`;
- `unknown:project-purpose` -> `project-knowledge`.

Corrections, current-product-direction answers, technical-direction answers, rules and other ambiguous material remain candidate evidence. Livariant does not guess them into a canonical domain.

## Trust boundary

Selection expresses user intent; it is **not** mutation Authority.

The command reconstructs current Bootstrap Discovery and Guided Understanding Review from the current project plus the supplied review input. The selected candidate id must still exist in that reconstructed review. The selected statement is then passed back through the canonical Semantic Proposal candidate parser, preserving the existing single-line and size bounds, before the existing Actionable Proposal machinery is used.

The resulting actionable proposal still requires the existing proposal-bound authorization and apply path. No matching Authority is searched for or consumed implicitly.

`adopt-understanding` introduces no direct Project Brain writer and no new Authority class.

## External knowledge

This command does not connect, import, index or synchronize an external Second Brain. Future External Knowledge Source adapters remain evidence sources and must not bypass this controlled adoption boundary.

## Release boundary

This capability exists only when present on the canonical repository state. The immutable `v0.1.0-rc.3` release predates it.
