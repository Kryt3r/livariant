<img width="1376" height="682" alt="Livariant | Living software framework for coherent AI-assisted development" src="https://github.com/user-attachments/assets/16f5afee-a10a-4c79-8bc9-89d23135e0e9" />

<p align="center">
  <strong>English</strong> · <a href="README.de.md">Deutsch</a>
</p>

# Livariant

**A living software framework for AI-assisted development that gives the project its own durable memory, decisions, direction, and safety boundaries.**

AI coding gets much less useful when the project only exists in the current chat.

You make an architectural decision with one agent. A week later a new session suggests the old approach again. You explain the same context for the fifth time. Claude Code understands one version of the project, Codex another, and important decisions slowly turn into scattered chat history.

Livariant is being built so that the project itself, not one AI session, becomes the durable source of continuity.

The current `0.1.0-rc.2` release is the **Foundation Preview**. It already provides the safe project-owned core. The next layer will make that core much more active and natural during day-to-day work.

## The idea in one minute

Today, Livariant gives your project a **Project Brain**:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

It stores confirmed goals, knowledge, decisions, project identity, and lifecycle state in a form the project owns.

That means a later AI session can reconstruct current project truth without depending on an old chat or one provider's memory.

A simple example:

```text
Monday
You decide with Claude Code that authentication will use approach A.
You record the accepted decision through Livariant after reviewing its plan.

Friday
You start a new Codex session.
Livariant reconstructs the current project context from the Project Brain.
Codex can see that approach A is the active decision without the old Claude Code chat.
```

The important part is not just storing text. Livariant treats project truth as managed state. Changes are planned before they are applied, old decisions can remain as history when superseded, and ambiguous or unsafe states fail closed instead of being silently guessed through.

## What exists today

The Foundation Preview already supports a real repeated-use workflow:

```text
inspect project
-> initialize Project Brain deliberately
-> record goals, knowledge, and decisions
-> resume current context in a later session
-> supersede stale decisions without deleting history
-> diagnose problems
-> update and recover through controlled lifecycle paths
```

Useful commands include:

```bash
livariant status
livariant doctor
livariant init
livariant goals
livariant knowledge
livariant decisions
livariant resume
livariant update
livariant recover
```

Mutating operations are plan-first. For example:

```bash
livariant decisions add "Use passkeys for authentication"
```

shows the proposed change. It is not written until you explicitly repeat it with `--apply`.

The current Preview also includes:

- project-owned canonical state instead of provider-owned memory;
- Resume handoff for Claude Code and Codex;
- preservation-first adoption of existing projects;
- decision history and supersession;
- concurrent-write and unsafe-path protection for managed knowledge;
- hardened update, migration, recovery, Runtime trust, and release-authority boundaries;
- local-first operation without Livariant telemetry, automatic Project Brain upload, or a required Livariant cloud account.

## Where Livariant is going

The Foundation Preview is deliberately the safe core, not the end of the product.

The next major layer is **Active Project Intelligence**.

The goal is to make Livariant useful while you work normally with an AI coding agent, instead of making you manually translate every important project event into a CLI command.

A future Livariant-assisted workflow should be able to look more like this:

```text
You: "We are replacing password login with passkeys."

Agent + Livariant:
- detects that this may change durable project truth;
- checks existing goals, decisions, knowledge, and terminology;
- notices conflicts or affected assumptions;
- prepares a semantic change proposal;
- shows what would change and why;
- waits for your approval;
- commits the approved Project Brain change through Livariant;
- verifies the resulting state.
```

That direction includes work such as:

- semantic change proposals from normal agent work;
- conflict and drift detection against existing project truth;
- agent-assisted Project Brain maintenance instead of manual bookkeeping;
- project terminology and provisional-name tracking;
- safer cross-tool continuation between coding agents;
- richer integrations that sit on top of the existing authority and recovery model.

These capabilities are **direction, not current RC2 claims**. The point of the Foundation Preview is to make sure the durable core is trustworthy before more automation is allowed to act on it.

## Why build the foundation first?

An AI agent can already edit files. Giving it more automation is easy.

Giving it more automation **without losing project truth, overwriting human work, trusting project-controlled executable code, or guessing through broken state** is the harder problem.

Livariant therefore separates:

```text
Inspect -> Plan -> Authorize -> Mutate -> Verify
                                  |
                                  +-> Recover explicitly if interrupted
```

> [!IMPORTANT]
> **Capability is not authority.**

The more active Livariant becomes, the more important that rule becomes.

Read [Architecture & Safety](docs/architecture-and-safety.md) for the deeper model.

## Five-minute start

Requirements for the current Preview:

- Node.js 20 or newer;
- a local software project;
- the verified Livariant Preview release tarball from the canonical GitHub Release once published.

Install Livariant as machine or user tooling. It is not installed as a Claude Code or Codex plugin and it is not added to your project's `package.json`.

```bash
npm install --global --ignore-scripts ./livariant-0.1.0-rc.2.tgz
livariant version
```

Open your project root and inspect first:

```bash
livariant status
livariant doctor
livariant init
```

`livariant init` is read-only by default. If the plan is correct:

```bash
livariant init --apply
```

Then record durable project truth. Without `--apply`, each command only prepares a plan:

```bash
livariant goals add "Ship the first public preview"
livariant knowledge add "Preview distribution uses GitHub Releases"
livariant decisions add "Use GitHub Releases for Preview distribution"
```

After review, repeat the correct command with `--apply`.

To reconstruct current project context later:

```bash
livariant resume
```

For Claude Code or Codex specifically:

```bash
LIVARIANT_PROVIDER_ENV=claude-code livariant resume --provider claude-code
LIVARIANT_PROVIDER_ENV=codex livariant resume --provider codex
```

Read [Installation & First Project](docs/installation.md) for the complete setup and [Five-Minute Quickstart](docs/quickstart.md) for the shorter operational path.

## What normal use looks like

The current Foundation Preview does not watch every conversation automatically. You decide which confirmed state belongs in the Project Brain.

A normal cycle is:

```text
1. Open the project.
2. Resume current Project Brain context when useful.
3. Work normally with your coding agent.
4. Record a confirmed goal, fact, or accepted decision when it becomes durable project truth.
5. Review Livariant's plan.
6. Apply explicitly.
7. Resume the updated truth in a later session or supported provider.
```

Supported semantic operations include:

```text
livariant goals [list]
livariant goals add <goal> [--apply]
livariant knowledge [list]
livariant knowledge add <fact> [--apply]
livariant decisions [list]
livariant decisions add <decision> [--apply]
livariant decisions supersede <id> <replacement> [--reason <reason>] [--apply]
```

Decision supersession keeps the old decision as history instead of silently deleting it.

## Existing projects

Livariant does not require a new repository or a preferred project template.

Start inside the project you already have:

```bash
livariant status
livariant doctor
livariant init
```

Existing project-owned files are protected by default. Ambiguous state leads to diagnosis instead of heuristic rewriting.

Read the [Existing Project Guide](docs/existing-projects.md).

## Updates and recovery

Livariant's lifecycle is intentionally stricter than copying files around by hand.

Inspect first:

```bash
livariant update --manifest ./release-manifest.json
livariant recover
```

Apply only after review and when Livariant reports a supported path.

Executable updates additionally require independent machine-local authority for the exact release artifact before candidate Runtime code can execute. Project-controlled files cannot create that authority for themselves.

Read [Updates, Migrations & Recovery](docs/lifecycle-guide.md).

## Privacy

The current Runtime is designed for local project operation:

- no Livariant analytics or usage telemetry;
- no automatic Project Brain upload;
- no Livariant cloud account required for local operation;
- no automatic remote update check;
- Resume output is rendered locally.

If you give Resume context to an external AI provider, that provider's own terms and settings apply.

Read [Privacy & Network Behavior](docs/privacy-and-network.md).

## Foundation Preview status

`0.1.0-rc.2` is the current Foundation Preview release candidate.

The supported baseline is exercised in CI on Ubuntu and Windows. Preview means the supported behavior is evidence-backed, while interfaces and product scope can still evolve before 1.0.

Known data-loss, authority-escalation, migration-integrity, or release-trust bypasses on supported paths are not treated as acceptable Preview limitations.

The larger Active Project Intelligence direction is intentionally not presented as implemented RC2 behavior.

Read [Public Preview Support & Stability](docs/preview-support-and-stability.md) and [Public Preview Scope & Limitations](docs/preview-scope.md).

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

External code contributions are currently gated until contributor-rights terms compatible with the source-available and future commercial-licensing model are finalized. Bug reports, documentation feedback, questions, and design discussion are welcome through the repository's community paths.

- [Licensing](LICENSING.md)
- [Security Policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Third-Party Notices](THIRD_PARTY_NOTICES.md)

---

**Livariant starts with a simple rule: the project should own the truth needed to continue its work. The next step is making that truth actively useful while you build.**
