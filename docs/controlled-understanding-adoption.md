# Controlled starting understanding adoption

`livariant adopt-understanding` bridges selected Guided Project Understanding Review input into Livariant's existing hardened proposal and authorization path.

It does **not** accept the whole review, does not treat review input as Project Truth, and does not mutate Project Brain by itself.

## Supported v1 flow

```text
current project discovery
-> guided understanding review input
-> explicit candidate selection
-> actionable proposal
-> separate `authorize`
-> separate `apply`
-> verified Project Brain mutation
```

Command:

```text
livariant adopt-understanding --input <review.json> --select <candidate-target> [--json]
```

The review input uses the same bounded schema as `livariant understand --input`.

V1 deliberately supports only two unambiguous response mappings:

- `unknown:project-goals` -> `project-goal`;
- `unknown:project-purpose` -> `project-knowledge`.

Corrections, current-product-direction answers, technical-direction answers, rules and other ambiguous material remain candidate evidence. Livariant does not guess them into a canonical domain.

Exactly one current response must exist for the selected target. Missing or duplicate responses fail closed.

## Trust boundary

Selection expresses user intent; it is **not** mutation Authority.

The command reconstructs current Bootstrap Discovery and Guided Understanding Review from the current project plus the supplied review input. It then routes the selected supported statement through the existing Semantic Proposal / Actionable Proposal machinery.

The resulting actionable proposal still requires the existing proposal-bound authorization and apply path. No matching Authority is searched for or consumed implicitly.

`adopt-understanding` introduces no direct Project Brain writer and no new Authority class.

## External knowledge

This command does not connect, import, index or synchronize an external Second Brain. Future External Knowledge Source adapters remain evidence sources and must not bypass this controlled adoption boundary.

## Release boundary

This capability exists only when present on the canonical repository state. The immutable `v0.1.0-rc.3` release predates it.
