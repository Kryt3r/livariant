<img width="1376" height="682" alt="Livariant | Reliability and governance for AI-assisted software development" src="https://github.com/user-attachments/assets/16f5afee-a10a-4c79-8bc9-89d23135e0e9" />

<p align="center">
  <strong>English</strong> · <a href="README.de.md">Deutsch</a>
</p>

# Livariant

**A project-owned reliability and governance layer for serious AI-assisted software development.**

AI coding agents are powerful, but they are still probabilistic systems. They can lose context, hallucinate project facts, forget earlier decisions, contradict other agents, overstate completion, act on stale information, or make locally plausible changes that damage the project over time.

Livariant is built around one simple idea:

> **AI can be wrong. Your project should not automatically inherit the mistake.**

Instead of trying to make one model infallible, Livariant gives the **project itself** durable truth, continuity, controlled mutation paths, safety boundaries, verification evidence, and recovery semantics that survive individual chats, agents, tools, and providers.

## What Livariant actually does

Livariant sits between AI-assisted development and the durable state of your software project.

```text
AI agent
   ↓
observation / suggestion / proposed change
   ↓
Livariant
├─ reconstructs current project context
├─ preserves durable goals, decisions, and knowledge
├─ detects conflicts and stale baselines
├─ separates evidence from accepted truth
├─ separates capability from authority
├─ prepares bounded project changes
├─ requires the appropriate authorization
├─ verifies resulting state
└─ preserves history, lifecycle evidence, and recovery paths
   ↓
project
```

Core rules include:

```text
Evidence != Truth
Capability != Authority
Proposal != Authorization
Persistence != Trust
Presence != Currency
Derived State != Canonical State
Ambiguous State -> Fail Closed
```

These rules exist because an AI-generated answer can be useful without automatically being correct, current, trusted, authorized, or safe to persist.

## Is Livariant a Second Brain?

**No.**

A Second Brain primarily stores and retrieves information. Livariant uses durable project knowledge too, but its job is broader: it governs how AI agents **interpret, trust, use, and change** project state.

Livariant is concerned with questions such as:

- Where did this information come from?
- Is it confirmed project truth, evidence, history, or an AI inference?
- Is it still current?
- Does it conflict with an existing decision?
- Is the agent allowed to turn it into a durable project change?
- What exactly would be changed?
- Was that change actually verified?
- Can the project recover if something goes wrong?

External knowledge systems such as Obsidian are not something Livariant needs to replace. The long-term direction is to let existing knowledge sources remain where they are while Livariant can use them as **provenance-aware external evidence** without silently turning them into canonical Project Truth.

## The problem Livariant is designed around

Livariant is designed to reduce project-level AI failure modes such as:

- context loss between chats and sessions;
- forgotten or superseded architectural decisions;
- hallucinated or stale project facts becoming durable assumptions;
- different agents working from different versions of project reality;
- architecture drift across many individually reasonable changes;
- untrusted repository or external content influencing agent behavior;
- technical capability being confused with user authorization;
- interrupted updates or migrations leaving ambiguous state;
- agents claiming work is complete without sufficient verification;
- persistent AI-generated state reinforcing an earlier mistake;
- the same project failures being rediscovered repeatedly.

Livariant does **not** claim to eliminate hallucinations, bugs, prompt injection, or incorrect reasoning inside the model itself.

Its goal is different:

> **Keep the software project coherent, inspectable, recoverable, and governed even when individual AI agents make mistakes.**

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

## Active Project Intelligence

The published `v0.1.0-rc.3` Foundation Preview established the original project-owned continuity and lifecycle foundation.

The repository has moved significantly beyond that release. Current `main` contains post-RC3 Active Project Intelligence capabilities including:

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
- autonomy profiles.

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

The architectural rule remains the same: **AI/provider output is evidence or projection until it passes an explicit supported authority path.**

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

## External knowledge

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

## Self-Integrity

Livariant applies its own philosophy to itself.

A system designed to mitigate AI failures must not slowly institutionalize those same failures inside its own memory, derived intelligence, authority model, or agent handoffs.

Examples of paths Livariant treats as long-term integrity risks include:

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

## Guardian authority hardening

Current `main` includes the protected Guardian trust-root foundation introduced after RC3.

The next hardening step is migrating consequential trust consumers onto Guardian-origin Authority so that same-user writable records are no longer treated as independent hard authority.

That migration is **still in active development and acceptance**. It is not yet a completed release claim.

Repository presence is therefore not the same as release qualification.

## Published release vs. current development

### Published release

`v0.1.0-rc.3` is the immutable **Foundation Preview**.

### Current repository `main`

Contains significant post-RC3 capabilities and additional Guardian/Self-Integrity hardening that are not part of RC3.

### Active development

Further Guardian consumer migration and Self-Integrity remediation are still being implemented and adversarially verified before the next qualified release.

### Next qualified release

Will receive its own exact-candidate CI/security qualification, release-wide review, and explicit release authorization.

## Five-minute Foundation Preview start

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

To reconstruct current Project Brain context later:

```bash
livariant resume
```

For the complete supported release workflow, see:

- [Installation & First Project](docs/installation.md)
- [Five-Minute Quickstart](docs/quickstart.md)
- [Existing Project Guide](docs/existing-projects.md)

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

Current Guardian work continues to strengthen the independent Authority boundary.

See [Updates, Migrations & Recovery](docs/lifecycle-guide.md) and [Architecture & Safety](docs/architecture-and-safety.md).

## Where Livariant is going

Livariant's long-term direction is not simply "store more context." The architecture is converging around six mutually reinforcing pillars:

- **Memory** — preserve validated project experience across agents and sessions.
- **Epistemics** — know why the project believes something, where it came from, and whether it is current, inferred, stale, or disputed.
- **Relationships** — represent meaningful dependencies between decisions, requirements, components, evidence, and changes.
- **Governance** — keep capability, Authority, risk, and irreversible action separate.
- **Verification** — make completion and safety claims traceable to evidence rather than agent confidence.
- **Learning** — turn validated failures into durable project knowledge and regression protection.

Future capabilities such as richer external knowledge integration, graph-assisted retrieval, context-budget optimization, change-impact analysis, risk-adaptive autonomy, and multi-agent coordination are intended to build on these foundations when their prerequisites and real product need justify them.

## Why this matters

AI development tools are becoming better at generating and modifying software. That also means a wrong assumption can have a larger blast radius.

Livariant is being built around the idea that serious AI-assisted development needs something between:

```text
"the model suggested this"
```

and:

```text
"the project now believes and acts on this"
```

That layer should preserve context, challenge assumptions, constrain authority, verify changes, retain history, and help the project learn from previous failures.

For a hobby project, that can mean fewer confusing restarts and fewer accidental mistakes. For professional software, the same principles can provide stronger traceability, governance, safety, and release confidence.

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
