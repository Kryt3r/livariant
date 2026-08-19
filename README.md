<img width="1851" height="737" alt="image" src="https://github.com/user-attachments/assets/e5e1c73b-b4fd-4df4-8b0a-1d278ac12d3e" />

<p align="center">
  <strong>English</strong> · <a href="README.de.md">Deutsch</a>
</p>

<p align="center">
  <a href="https://github.com/Kryt3r/livariant/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Kryt3r/livariant/actions/workflows/ci.yml/badge.svg?branch=main" /></a>
  <a href="https://github.com/Kryt3r/livariant/releases/tag/v0.1.0-rc.3"><img alt="Release" src="https://img.shields.io/badge/release-v0.1.0--rc.3-0ea5e9" /></a>
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-%E2%89%A520-339933?logo=nodedotjs&logoColor=white" />
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-PolyForm%20Perimeter-7c3aed" /></a>
  <img alt="Local-first" src="https://img.shields.io/badge/local--first-default-06b6d4" />
  <img alt="MCP" src="https://img.shields.io/badge/MCP-supported-a855f7" />
</p>

# Livariant

**AI coding agents can be wrong. Livariant is built so their mistakes do not silently become project truth.**

**Preserve what is true. Control what changes. Recover when things go wrong.**

Coding agents are powerful, but they can lose context, act on stale assumptions, contradict earlier decisions, overstate completion, or turn a plausible inference into a durable project mistake.

Livariant does not try to make one model infallible. It gives the **project itself** durable truth, explicit authority boundaries, verification evidence, and recovery semantics that survive individual chats, agents, tools, and providers.

> **The AI may be wrong. Your project should not automatically inherit the mistake.**

## The problem in one example

Imagine this:

```text
Monday
You and one coding agent accept architecture decision A.
The decision becomes durable project state.

Friday
A different agent starts from stale context and confidently proposes B.
B looks locally reasonable, but contradicts the accepted decision.
```

Without a project-owned reliability layer, the new agent can easily turn that stale assumption into another edit, another summary, another persistent memory, and eventually the apparent new reality of the project.

Livariant is built to keep those steps separate:

```text
agent output
   ↓
Evidence
   ↓
current Project Truth + provenance + freshness
   ↓
conflict / drift assessment
   ↓
Proposal
   ↓
Authorization
   ↓
Mutation
   ↓
Verification
   ↓
Durable Project State
```

A useful AI answer is not automatically current truth. A technically possible action is not automatically authorized. A persisted record is not automatically trustworthy.

## What Livariant actually does

Livariant sits between AI-assisted development and the durable state of your software project.

It is designed around four practical responsibilities:

- **Truth** - preserve project-owned goals, decisions, knowledge, provenance, and current context instead of relying on one chat or provider memory.
- **Authority** - keep technical capability separate from permission to turn a suggestion into a consequential project change.
- **Verification** - make completion, integrity, lifecycle, and change claims depend on evidence rather than agent confidence.
- **Recovery** - keep updates, migrations, Runtime activation, and interrupted operations from silently leaving the project in an ambiguous state.

The supported semantic flow on current `main` also includes conflict/drift assessment, provider-return intake as untrusted evidence, proposal-bound authorization, controlled semantic apply paths, guided project understanding, MCP foundations, external-knowledge-source foundations, first-run composition, and autonomy profiles.

## Where Livariant fits

Livariant is not trying to replace every tool an AI coding agent may use.

Different layers answer different questions:

```text
Repository intelligence
"Where should the agent look?"

Memory / Second Brain
"What should the agent remember?"

Livariant
"What does the project actually trust,
 what may change,
 and how is that change verified or recovered?"
```

Repository indexes, code graphs, search tools, external knowledge systems, and provider memory solve adjacent problems and may supply useful information to an AI workflow. Livariant's architectural boundary is that **when derived or retrieved information enters a Livariant-governed flow, it must not silently become canonical Project Truth**.

That is why the core rules are:

```text
Evidence != Truth
Capability != Authority
Proposal != Authorization
Persistence != Trust
Presence != Currency
Derived State != Canonical State
Ambiguous State -> Fail Closed
```

## Try the published Foundation Preview

`v0.1.0-rc.3` is the immutable **Foundation Preview**. It demonstrates the original project-owned continuity and lifecycle foundation.

Requirements:

- Node.js 20 or newer;
- a local software project;
- the official `v0.1.0-rc.3` release artifact.

Install Livariant as machine/user tooling rather than a normal application dependency:

```bash
npm install --global --ignore-scripts ./livariant-0.1.0-rc.3.tgz
livariant version
```

Inside your project:

```bash
livariant status
livariant doctor
livariant init
```

Later, reconstruct the current Project Brain context with:

```bash
livariant resume
```

For the complete supported release workflow, see:

- [Installation & First Project](docs/installation.md)
- [Five-Minute Quickstart](docs/quickstart.md)
- [Existing Project Guide](docs/existing-projects.md)

## Current `main` goes beyond RC3

The public repository has moved significantly beyond the Foundation Preview.

Current `main` contains post-RC3 Active Project Intelligence capabilities including:

- coherent Project Context snapshots;
- semantic change proposals;
- conflict / drift assessment;
- provider-targeted context generation;
- provider-return intake as untrusted evidence;
- proposal-bound authorization and semantic apply paths;
- provider-neutral semantic maintenance composition;
- local MCP foundations and native setup support for compatible agent environments;
- read-only project discovery;
- guided project-understanding review and controlled adoption;
- an external-knowledge-source foundation;
- first-run composition;
- autonomy profiles;
- protected Guardian-origin Authority for consequential trust consumers on current `main`.

Representative surfaces include:

```bash
livariant context
livariant propose --input candidate.json
livariant drift --input observation.json
livariant provider-context --provider claude-code --task task.txt
livariant provider-return --context provider-context.json --input provider-return.json
livariant maintain --input candidate.json
livariant mcp
livariant discover
livariant understand
livariant adopt-understanding
livariant external-source
livariant first-run
livariant autonomy
```

Repository presence is not the same as release qualification. These post-RC3 capabilities are not part of the published RC3 artifact.

## Project-owned continuity

Livariant maintains a local **Project Brain**:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

It gives the project durable state that does not belong to one chat or one AI provider.

A copied sentence, returned AI result, stale context packet, external note, or reconstructed summary does not become trusted project state merely because it exists.

## Authority and safe mutation

One of Livariant's central rules is:

> **The ability to perform an action is not permission to perform it.**

Livariant separates:

```text
Inspect
   ↓
Understand
   ↓
Propose
   ↓
Authorize
   ↓
Mutate
   ↓
Verify
```

This matters more as coding agents gain filesystem, shell, Git, network, and deployment capabilities.

Current `main` includes Guardian-origin protected Authority for consequential consumers including semantic mutation authorization, Project Brain integrity acceptance/protection, Runtime trust, and release authorization.

Those migrations passed focused pre-merge acceptance and the required canonical-main post-merge Class-D/security qualification. The Guardian/S-03 remediation block is therefore fully closed within the accepted WP-023 threat scope. This is a statement about current development state and does not retroactively expand the published RC3 capability set.

## Existing projects first

Livariant does not require a special project template. It is designed to work with existing software projects.

Adoption follows a preservation-first model:

```text
inspect
-> discover
-> understand
-> review
-> adopt deliberately
```

Livariant should not silently rewrite an existing project because an AI believes it understands what the repository means.

## External knowledge stays external until deliberately adopted

Livariant already contains a foundation for treating external knowledge as a separate evidence source.

The intended model is:

```text
Obsidian / Markdown / other knowledge source
        ↓
read-only source adapter
        ↓
provenance-aware evidence
        ↓
retrieval / understanding
        ↓
review
        ↓
controlled adoption when something should become Project Truth
```

External knowledge remains external knowledge. Future retrieval, relationship, graph, and token-efficiency work is intended to build on explicit provenance and freshness semantics rather than creating hidden secondary truth stores.

## Self-Integrity

Livariant applies its own philosophy to itself.

A system designed to mitigate AI failures must not slowly institutionalize those same failures inside its own memory, derived intelligence, authority model, or agent handoffs.

Examples of paths Livariant treats as integrity risks include:

```text
hallucination -> durable state
stale information -> current truth
AI inference -> Authority
lossy summary -> accepted project belief
wrong persistent belief -> repeated retrieval -> apparent certainty
derived graph/index -> hidden second source of truth
agent-modified guardrail -> weaker future protection
```

Where practical, critical invariants should be enforced by deterministic software and explicit state transitions rather than asking an AI model to remember a rule correctly.

## Published release vs. current development

### Published release

`v0.1.0-rc.3` is the immutable **Foundation Preview**.

### Current repository `main`

Contains significant post-RC3 Active Project Intelligence and Guardian/Self-Integrity hardening that are not part of RC3.

### Current Guardian qualification status

The consequential Guardian consumer migrations are merged to `main` and passed both focused pre-merge acceptance and the required canonical-main post-merge Class-D/security verification. The associated Guardian/Self-Integrity remediation block is fully closed within the accepted WP-023 threat scope.

### Next qualified release

Will receive its own exact-candidate CI/security qualification, release-wide review, and explicit release authorization.

## Local-first by default

Current Livariant project operation is designed around a local-first model:

- no Livariant cloud account required for normal local use;
- no automatic Project Brain upload;
- no Livariant usage telemetry in the current Runtime;
- no automatic remote update check.

If project context is sent to an external AI provider, that provider's own terms, retention settings, and security model apply.

See [Privacy & Network Behavior](docs/privacy-and-network.md).

## Updates, lifecycle, and recovery

Livariant treats software lifecycle operations separately from ordinary project-context mutation.

Update, migration, Runtime activation, recovery, release identity, artifact integrity, and authorization are distinct concerns.

The project has already undergone focused hardening around interrupted migrations, recovery checkpoint substitution, stranded lifecycle state, Runtime trust, release artifact identity, Windows shell execution behavior, stale semantic baselines, and proposal-bound authorization.

See [Updates, Migrations & Recovery](docs/lifecycle-guide.md) and [Architecture & Safety](docs/architecture-and-safety.md).

## Where Livariant is going

Livariant's long-term direction is not simply "store more context." The architecture is converging around six mutually reinforcing pillars:

- **Memory** - preserve validated project experience across agents and sessions.
- **Epistemics** - know why the project believes something, where it came from, and whether it is current, inferred, stale, or disputed.
- **Relationships** - represent meaningful dependencies between decisions, requirements, components, evidence, and changes.
- **Governance** - keep capability, Authority, risk, and irreversible action separate.
- **Verification** - make completion and safety claims traceable to evidence rather than agent confidence.
- **Learning** - turn validated failures into durable project knowledge and regression protection.

Future capabilities such as richer external knowledge integration, graph-assisted retrieval, context-budget optimization, change-impact analysis, risk-adaptive autonomy, and multi-agent coordination are intended to build on these foundations when their prerequisites and real product need justify them.

The strategic boundary remains the same: **intelligence can come from many tools; Project Truth and consequential Authority must remain explicit.**

## Documentation

Start here:

1. [Installation & First Project](docs/installation.md)
2. [Five-Minute Quickstart](docs/quickstart.md)
3. [Existing Project Guide](docs/existing-projects.md)
4. [Provider Handoff](docs/provider-handoff.md)
5. [Updates, Migrations & Recovery](docs/lifecycle-guide.md)

Deeper references:

- [Architecture & Safety](docs/architecture-and-safety.md)
- [Privacy & Network Behavior](docs/privacy-and-network.md)
- [Public Preview Scope & Limitations](docs/preview-scope.md)
- [Public Preview Support & Stability](docs/preview-support-and-stability.md)
- [License, Warranty & Liability](docs/license-and-warranty.md)

German documentation starts at [README.de.md](README.de.md).

## Licensing, security, and contributions

Livariant is source-available, not OSI-approved Open Source. It is licensed under the [PolyForm Perimeter License 1.0.1](LICENSE).

Do not post suspected vulnerability details in a public issue. Follow [SECURITY.md](SECURITY.md).

External code contributions are currently gated while contributor-rights terms compatible with the source-available and future commercial-licensing model are finalized. Bug reports, documentation feedback, questions, and design discussion are welcome.

- [Licensing](LICENSING.md)
- [Security Policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Third-Party Notices](THIRD_PARTY_NOTICES.md)

---

> **Livariant does not need the AI to be perfect. It needs the project to remain trustworthy when the AI is not.**