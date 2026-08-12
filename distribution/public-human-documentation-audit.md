# Public Human Documentation and Repository Acceptance Audit

Status: **IN PROGRESS, final host checks remain**

Scope: final pre-public acceptance of Livariant's public-facing documentation, beginner usability, writing style, GitHub community surface, and repository presentation.

This audit is separate from Runtime and Security acceptance. A technically safe release candidate is not enough if unfamiliar users cannot understand the product, complete the core workflow, or find the correct support channel.

## Acceptance goal

A first-time visitor should be able to answer these questions without prior Livariant knowledge:

1. What problem does Livariant solve?
2. How can it help me if I am new to AI-assisted development?
3. How can it help me if I already use Claude Code, Codex, or another coding agent?
4. What is a Project Brain in plain language?
5. What does Livariant change in my project, and what does it deliberately not change?
6. How do I install it safely?
7. How do I add it to an existing project?
8. How do I record goals, confirmed facts, and accepted decisions after initialization?
9. What does a normal repeated work cycle look like?
10. How do provider handoff, updates, migration, and recovery work at the level needed for safe use?
11. Where do I ask a question, report a bug, suggest an idea, or report a security problem?

The documentation must work for three audiences:

- a developer who is just starting to use AI for coding;
- a developer who already uses coding agents but has never used Livariant;
- an experienced developer or reviewer who needs precise architecture, lifecycle, and security details.

## Current acceptance result

### AI-assisted coding beginner

**Status: PASS for documented product workflow**

The public entry path now explains the problem before internal architecture. It describes session loss, repeated explanations, provider changes, and project-owned knowledge in ordinary language before introducing deeper authority concepts.

The beginner path now covers:

- what Livariant is useful for;
- what the Project Brain is;
- installing the CLI;
- opening an existing or new project;
- inspection and plan-first initialization;
- explicit `init --apply`;
- reading goals, knowledge, and decisions;
- planning and applying durable semantic changes;
- superseding an accepted decision without deleting history;
- using Resume context in later sessions;
- where to go for help.

The former end-to-end Product Utility gap was a real blocker: the executable RC2 originally lacked the repeated-use semantic editing surface described by the product model. PR #29 implemented `goals`, `knowledge`, and `decisions`, including plan-first mutation, explicit `--apply`, decision supersession history, ProjectBrainStore persistence, concurrency checks, post-write verification, and Resume/provider projection coverage. PR #29 merged as `c613662e9572f9a78cf98d11483be292b2cbb52f`. Post-merge Hardening CI #133 passed on Ubuntu and Windows.

### Existing Claude Code or Codex user

**Status: PASS for the current Preview support claim**

The documentation now makes the integration boundary explicit:

- Livariant is not installed as a Claude Code or Codex plugin;
- the CLI is installed separately and run from the project directory;
- confirmed project truth is recorded through Livariant rather than copied from hidden provider memory;
- provider-specific Resume context is generated from the current Project Brain;
- Claude Code and Codex support is limited to the documented Resume handoff;
- provider selection does not grant Project Brain mutation authority.

The Provider Handoff guides include the complete flow from a decision in one session, through explicit Project Brain recording, to Resume context in a later provider session.

### Experienced developer or security reviewer

**Status: PASS for public documentation depth**

The public path links to deeper architecture, privacy, lifecycle, release authority, migration, recovery, licensing, and support documents. The technical detail was preserved rather than removed from the repository.

The current user-facing documentation explains the important boundaries without making a beginner read the full security model before first use. Deep contract material remains available for reviewers who need it.

## Finding status

### H-01: README started too far inside the architecture

**Status: CLOSED**

README EN/DE now leads with the user problem and practical value, then introduces Project Brain and the authority model.

### H-02: Beginner path was not explicit enough

**Status: CLOSED**

Installation, Quickstart, Existing Project, and README paths now explain the first-use journey in normal language.

### H-03: Day-to-day usage was under-explained

**Status: CLOSED**

README, Quickstart, Installation, Existing Project, Provider Handoff, and Preview Scope now explain repeated use with `goals`, `knowledge`, `decisions`, `resume`, plan-first review, and explicit `--apply`.

### H-04: Human writing pass required

**Status: CLOSED for the current user-facing set**

Public EN/DE user documentation received a human-writing pass. The public documentation CI rejects en dash and em dash punctuation in the covered public Markdown surfaces, checks relative Markdown links, and verifies the intended EN/DE guide parity.

This audit label predates the separate Product Utility blocker that was also referred to as H-04 during the later implementation review. The Product Utility blocker is closed by PR #29 as described above.

### H-05: German text contained avoidable English-heavy jargon

**Status: CLOSED for the current beginner path**

Technical product terms remain where useful, but the German beginner path explains them in natural sentences instead of assuming expert vocabulary.

### H-06: Public status wording needed a publication-state pass

**Status: CLOSED for pre-public state**

Current-facing documents distinguish the release candidate and private pre-public preparation from an already-live Public Preview. A final live-public wording check is still required after the repository and release are actually published.

### H-07: GitHub issue intake was not configured

**Status: CLOSED in repository files**

PR #28 includes:

- Bug report Issue Form;
- Documentation problem Issue Form;
- `.github/ISSUE_TEMPLATE/config.yml`;
- explicit routing for usage questions, ideas, and security reports;
- blank issue creation disabled.

Feature and design ideas are intentionally routed to Discussions instead of creating a second competing feature-request queue in Issues.

### H-08: Pull request community surface was incomplete

**Status: CLOSED in repository files**

A pull request template is present and matches the current contribution gate. External code incorporation remains gated until contributor-rights terms are finalized.

### H-09: Discussions needed a defined purpose and launch setup

**Status: PARTIALLY CLOSED, host verification remains**

Repository files define the intended split:

- Announcements: maintainer communication;
- Q&A: usage questions;
- Ideas: feature and design discussion;
- Show and tell: projects and workflows;
- General: community discussion that does not fit the other categories.

Q&A and Ideas Discussion forms are prepared under `.github/DISCUSSION_TEMPLATE/`. `SUPPORT.md` explains the routing boundary between Discussions, Issues, and private security reporting.

The repository has Discussions enabled. The current GitHub integration cannot read Discussion category configuration for this private repository, so the actual category names/slugs and launch-state presentation must still be verified directly in GitHub before PR #28 leaves Draft.

### H-10: Repository metadata and visible tabs needed final review

**Status: MOSTLY CLOSED**

Verified host state:

- repository remains PRIVATE;
- Issues enabled;
- Discussions enabled;
- Projects disabled;
- Wiki disabled;
- Pages disabled;
- Downloads disabled;
- squash merge enabled;
- merge commits disabled;
- rebase merges disabled;
- merged branches are deleted automatically;
- repository description is set;
- topics cover AI, AI agents, coding agents, context management, developer experience, developer tools, framework, project context, software architecture, software development, and TypeScript.

Host protections that depend on the public repository state remain part of the separate PUBLIC gate.

### H-11: Support routing needed one obvious front door

**Status: CLOSED in repository files**

`SUPPORT.md` routes:

- usage question -> Discussions Q&A;
- feature or design idea -> Discussions Ideas;
- reproducible product bug -> Bug report Issue Form;
- documentation problem -> Documentation problem Issue Form;
- suspected vulnerability -> private security reporting;
- project or workflow sharing -> Discussions Show and tell;
- code contribution -> currently gated.

### H-12: Full public documentation inventory and navigation acceptance

**Status: CLOSED for current user-facing EN/DE guides**

The CI-enforced public set verifies intended EN/DE guide parity and relative-link integrity. README navigation separates beginner use, operational guides, and deeper architecture/security material.

The repository still contains extensive design contracts under Core, Project Brain, Runtime, adapters, initialization, and distribution. These are deeper technical references and are not presented as the required beginner reading path.

### H-13: Default repository labels are still generic

**Status: OPEN, non-code host setup**

The current repository still uses the default GitHub label set. The prepared Issue Forms work because `bug` and `documentation` already exist, but the final public triage policy should decide whether additional labels are useful before launch.

Do not add labels merely to make the repository look busy. Add only labels with a clear triage purpose.

## Community intake acceptance

### Bugs

**PASS**

The Bug report form asks for version, OS, Node.js version, affected command/workflow, expected behavior, actual behavior, minimal reproduction, and safe additional context. It explicitly blocks security vulnerability details and secrets from the public issue path.

### Documentation problems

**PASS**

The Documentation problem form covers incorrect instructions, unclear explanations, missing beginner guidance, broken links, EN/DE disagreement, outdated commands, and missing information.

### Questions and ideas

**PASS in repository routing, pending host category verification**

`config.yml` and `SUPPORT.md` route questions to Q&A and ideas to Ideas. The referenced Discussion category slugs must be verified in the GitHub host UI before launch.

### Security

**PASS for documented routing, pending public host capability verification**

Public Issue/Discussion paths tell users not to disclose vulnerability details there. `SECURITY.md` remains the authoritative reporting surface. Private vulnerability reporting and other public-state host protections are verified only after the relevant PUBLIC-state capability exists.

## Writing and documentation regression gates

The public documentation CI now checks:

- required public Truth Surfaces;
- EN/DE user-guide parity;
- relative Markdown-link integrity;
- prohibited en dash and em dash punctuation in the covered public Markdown set.

Hardening CI also now uses per-ref concurrency with `cancel-in-progress: true`. A newer PR head cancels stale runs for the same ref instead of consuming Actions time on obsolete commits.

## Remaining work before this audit can close

1. confirm the latest full Hardening CI on the final PR #28 head;
2. verify the actual GitHub Discussion categories and their slugs, especially `q-a` and `ideas`;
3. decide whether the default label set is sufficient or whether a small purpose-driven triage set should be added;
4. verify the final Issues/Discussions presentation in the GitHub UI;
5. mark PR #28 Ready only after those checks pass;
6. merge PR #28 and verify post-merge Hardening CI;
7. rebuild the RC2 tarball after all packaged public text is stable;
8. record the new final source and SHA-256 binding;
9. perform the separately authorized publication and PUBLIC-state host checks only after explicit approval.

## Publication boundary

This audit does not authorize:

- creation or movement of a release tag;
- creation or publication of a GitHub Release;
- npm publication;
- PRIVATE to PUBLIC visibility change;
- unrelated Runtime or Security hardening without a concrete finding.
