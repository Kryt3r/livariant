# Public Preview Support & Stability

Livariant `0.1.0-rc.2` is a Preview candidate. Preview means supported behavior is backed by evidence, but the product is not yet under a final 1.0 compatibility freeze.

## What you should be able to rely on

On supported Preview paths, Livariant is expected to preserve these properties:

- project-owned state is not silently overwritten;
- project-changing actions require explicit authority;
- release artifacts and installed Runtime state are checked for integrity;
- schema migrations use declared compatibility and checkpoint rules;
- interrupted or ambiguous lifecycle state leads to diagnosis and recovery instead of guessed repair;
- supported provider Resume handoff reconstructs Project Brain context without depending on hidden provider memory.

Preview does not mean that serious safety problems are acceptable. A known data-loss path, authority bypass, migration-integrity failure, or release-trust bypass on a supported workflow is a release blocker, not a normal Preview limitation.

## What can still change before 1.0

Before Livariant reaches a stable 1.0 contract, releases may still change:

- CLI details and flags;
- release-manifest fields;
- adapter capabilities;
- Project Brain schema through explicit supported migrations;
- internal framework layout;
- Preview compatibility ranges;
- installation and distribution mechanics.

Breaking changes must still respect project preservation. A new release cannot use "Preview" as permission to reinterpret old Project Brain state silently or skip a required migration.

Changes that affect users should be called out in release notes together with any migration or required-action information.

## Current provider scope

The current support claim for Claude Code and Codex is limited to Project Brain Resume handoff.

Livariant does not promise to manage every provider feature, authentication method, tool invocation, model option, or native instruction mechanism.

## Current migration scope

Only declared migration paths are supported.

The current executable baseline proves Project Brain schema `1 -> 2`. The existence of a migration engine does not mean Livariant can safely migrate between arbitrary schema versions.

## Getting support

Public Preview support is provided by the maintainer and community. There is no paid SLA unless a separate agreement says otherwise.

Use [SUPPORT.md](../SUPPORT.md) to choose the right place for a usage question, bug, documentation problem, feature idea, or security report.

A useful bug report normally includes:

- Livariant version and channel;
- operating system;
- Node.js version;
- affected command or workflow;
- observed lifecycle state;
- minimal reproduction steps;
- whether project-owned data was affected.

Do not disclose suspected vulnerability details in a public Issue. Follow [SECURITY.md](../SECURITY.md).

## What each Preview release should communicate

A public Preview release should state at least:

- Livariant version and channel;
- Project Brain schema compatibility;
- whether migration is required;
- supported source-version range;
- known issues and limitations;
- required user actions;
- recovery considerations for schema-changing releases.

## Deprecation

Preview features may be changed or withdrawn if they cannot meet Livariant's safety or maintenance bar.

If a supported path is withdrawn, that should be stated clearly rather than leaving a broken path nominally supported.

## 1.0 is a separate stability decision

A successful Public Preview does not automatically define Livariant's eventual 1.0 compatibility promise.

Before 1.0, a separate stable-release readiness review must define the longer-term compatibility and support policy.
