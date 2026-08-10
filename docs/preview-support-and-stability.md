# Public Preview Support & Stability

Livariant Public Preview is an evidence-backed preview, not a promise of API or behavior freeze.

## What Preview means

Supported Preview paths are expected to preserve the framework's protected properties:

- project-owned state is not silently overwritten;
- mutation authority remains explicit;
- release and installed Runtime integrity are verified on supported paths;
- migrations use declared compatibility and checkpoint semantics;
- ambiguous interrupted state narrows to diagnosis/recovery rather than guessed repair;
- supported provider Resume handoff reconstructs canonical Project Brain state without requiring hidden provider memory.

A Preview limitation may exist when it is explicit and bounded. A known data-loss, authority-escalation, migration-integrity, or release-trust bypass on a supported path is not an acceptable Preview limitation.

## Stability expectations

Before a stable 1.0 contract, Livariant may change:

- CLI details and flags;
- release-manifest fields;
- adapter capabilities;
- Project Brain schema through explicit supported migrations;
- internal framework layout;
- Preview compatibility ranges;
- installation/distribution mechanics.

Such changes should be reflected in release notes and migration/required-action information. A breaking change is not permission to bypass project preservation or silently reinterpret old canonical state.

## Supported provider scope

The first Preview support claim for Claude Code and Codex is deliberately limited to Project Brain Resume handoff. It is not a guarantee that every provider feature, authentication method, tool invocation, model option, or native instruction mechanism is managed by Livariant.

## Migration scope

Only explicitly declared migration paths are supported. The current executable baseline proves Project Brain schema `1 → 2`; the existence of the migration engine does not imply arbitrary schema-to-schema migration support.

## Support model

Public Preview is community/maintainer supported and has no paid SLA unless a separate agreement says otherwise.

Good bug reports should include version/channel, operating system, Node.js version, command, observed lifecycle state, minimal reproduction, and whether project-owned data was affected.

Security-sensitive reports follow `SECURITY.md` and should not be disclosed first through a public issue.

## Compatibility communication

Every public Preview release should communicate at least:

- Livariant version and channel;
- Project Brain schema compatibility;
- whether migration is required;
- supported source-version range;
- known issues/limitations;
- required user actions;
- recovery considerations for schema-changing releases.

## Deprecation

Preview features may be deprecated or withdrawn when they cannot meet the framework's safety or maintenance bar. Withdrawal should be explicit rather than leaving a broken path nominally supported.

## Stable-release boundary

Public Preview success does not automatically define the eventual 1.0 compatibility promise. A separate stable-release readiness review must define the longer-term compatibility and support policy before 1.0.
