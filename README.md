<img width="1376" height="682" alt="Livariant | Reliability and governance for AI-assisted software development" src="https://github.com/user-attachments/assets/16f5afee-a10a-4c79-8bc9-89d23135e0e9" />

<p align="center">
  <strong>English</strong> · <a href="README.de.md">Deutsch</a>
</p>

# Livariant

**A project-owned reliability and governance layer for serious AI-assisted software development.**

AI agents are getting better at reading repositories, generating code, and navigating large projects.

That still leaves a harder problem:

> **What should the project believe, what may an agent change, and how do you recover when the AI is wrong?**

Livariant gives the project itself durable truth, continuity, explicit authority boundaries, verification evidence, and recovery semantics that survive individual chats, agents, tools, and providers.

> **AI can be wrong. Your project should not automatically inherit the mistake.**

## The failure Livariant is built for

Imagine an agent starts a new session and reconstructs an architectural decision incorrectly.

The mistaken assumption is locally plausible. The code still builds. Another agent later reads the changed repository and treats the new state as evidence that the assumption was correct.

Without a stronger project layer, this can become a loop:

```text
wrong inference
   ↓
plausible change
   ↓
repository now reflects the mistake
   ↓
future agent treats that state as evidence
   ↓
more changes reinforce it
```

The problem is no longer just "the model hallucinated." The project has begun to institutionalize the hallucination.

Livariant is designed to interrupt that path:

```text
AI observation / suggestion / proposed change
   ↓
Evidence
   ↓
Project context + accepted truth
   ↓
Conflict / drift / integrity checks
   ↓
Explicit proposal
   ↓
Required Authority
   ↓
Bounded mutation
   ↓
Verification
   ↓
Durable history + recovery path
```

## What Livariant owns

Many AI-development tools answer questions such as:

- Where should the agent look?
- Which files are relevant?
- What context should be retrieved?
- What should the agent remember?

Livariant is focused on the next layer:

- **What is accepted Project Truth?**
- **What is only evidence, inference, or stale history?**
- **Who or what has Authority to change durable project state?**
- **What exactly is being authorized?**
- **Did the resulting state actually match the intended change?**
- **Can the project recover if the operation is interrupted or wrong?**

That is the core positioning of Livariant: **project reliability and governance, not just repository intelligence or memory.**

## Core rules

```text
Evidence != Truth
Capability != Authority
Proposal != Authorization
Persistence != Trust
Presence != Currency
Derived State != Canonical State
Ambiguous State -> Fail Closed
```

An AI-generated answer can be useful without automatically being correct, current, trusted, authorized, or safe to persist.

## Five-minute Foundation Preview start

The published `v0.1.0-rc.3` release is the immutable **Foundation Preview**.

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

Start with:

- [Installation & First Project](docs/installation.md)
- [Five-Minute Quickstart](docs/quickstart.md)
- [Existing Project Guide](docs/existing-projects.md)

## What current `main` can do

The repository has moved significantly beyond RC3. Current `main` contains post-RC3 Active Project Intelligence and Guardian/Self-Integrity hardening, including:

- coherent Project Context snapshots;
- semantic change proposals;
- conflict and drift assessment;
- provider-targeted context generation;
- provider-return intake as untrusted evidence;
- proposal-bound authorization and Semantic Apply paths;
- provider-neutral semantic maintenance composition;
- local MCP foundations and native setup support for compatible agent environments;
- read-only project discovery;
- guided project-understanding review and controlled adoption;
- an external-knowledge-source foundation;
- First-Run composition;
- Autonomy Profiles;
- canonical Project Brain integrity acceptance;
- protected Guardian Authority for consequential trust consumers, including semantic mutation authorization, Project Brain integrity, Runtime trust, and release authorization.

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

The architectural rule remains the same:

> **AI/provider output is evidence or projection until it passes an explicit supported Authority path.**

## Published release vs. current development

### Published release

`v0.1.0-rc.3` is the immutable **Foundation Preview**.

### Current repository `main`

Current `main` includes substantial post-RC3 capabilities and the merged Guardian Consumer Migration from WP-027.

The migration moves consequential trust consumers away from ordinary same-user persisted evidence and onto protected Guardian-origin Authority.

### Qualification boundary

Merged code is not automatically a qualified release.

WP-027/S-03 has passed its focused pre-merge acceptance and is present on canonical `main`, but the required canonical-main post-merge Class-D/security verification must still be treated as a separate gate before the remediation block is classified fully closed.

No later release claim should be inferred from repository presence alone.

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

A copied sentence, provider return, stale context packet, external note, or reconstructed summary does not become trusted project state merely because it exists.

## Is Livariant a Second Brain?

**No.**

A Second Brain primarily stores and retrieves information. Livariant can use durable project knowledge, but its job is broader: it governs how AI agents **interpret, trust, use, and change** project state.

External systems such as Obsidian do not need to be replaced. Livariant's direction is to use external knowledge as **provenance-aware evidence** without silently turning it into canonical Project Truth.

## External knowledge

The current foundation keeps external knowledge explicitly separate from canonical project state:

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

Future retrieval, relationship, graph, and token-efficiency work is intended to build on explicit provenance and freshness semantics rather than creating a hidden second source of truth.

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

## Self-Integrity and Guardian Authority

Livariant applies its own philosophy to itself.

A reliability system should not slowly institutionalize AI mistakes inside its own memory, derived intelligence, authority model, or agent handoffs.

Examples of dangerous transitions include:

```text
hallucination -> durable state
stale information -> current truth
AI inference -> Authority
lossy summary -> accepted project belief
wrong persistent belief -> repeated retrieval -> apparent certainty
derived graph/index -> hidden second source of truth
agent-modified guardrail -> weaker future protection
```

Where practical, critical invariants are enforced by deterministic software and explicit state transitions rather than relying on an AI model to remember a rule correctly.

The Guardian foundation adds a protected trust root and protected Authority records for consequential trust decisions. Ordinary same-user writable evidence must not silently become independent hard Authority.

## Local-first by default

Current Livariant project operation is designed around a local-first model:

- no Livariant cloud account required for normal local use;
- no automatic Project Brain upload;
- no Livariant usage telemetry in the current Runtime;
- no automatic remote update check.

If project context is sent to an external AI provider, that provider's own terms, retention settings, and security model apply.

See [Privacy & Network Behavior](docs/privacy-and-network.md).

## Updates, lifecycle, and recovery

Livariant treats update, migration, Runtime activation, recovery, release identity, artifact integrity, and authorization as distinct concerns.

The project has undergone focused hardening around interrupted migrations, recovery checkpoint substitution, stranded lifecycle state, Runtime trust, release artifact identity, Windows shell execution, stale semantic baselines, proposal-bound authorization, canonical Project Brain integrity, and protected Guardian Authority.

See [Updates, Migrations & Recovery](docs/lifecycle-guide.md) and [Architecture & Safety](docs/architecture-and-safety.md).

## Where Livariant is going

Livariant's long-term direction is not simply "store more context." The architecture is converging around six mutually reinforcing pillars:

- **Memory** — preserve validated project experience across agents and sessions.
- **Epistemics** — know why the project believes something, where it came from, and whether it is current, inferred, stale, or disputed.
- **Relationships** — represent meaningful dependencies between decisions, requirements, components, evidence, and changes.
- **Governance** — keep capability, Authority, risk, and irreversible action separate.
- **Verification** — make completion and safety claims traceable to evidence rather than agent confidence.
- **Learning** — turn validated failures into durable project knowledge and regression protection.

Future capabilities such as richer external-knowledge integration, graph-assisted retrieval, context-budget optimization, change-impact analysis, risk-adaptive autonomy, and multi-agent coordination are intended to build on these foundations only when their prerequisites and real product need justify them.

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