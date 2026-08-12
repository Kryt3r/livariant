# Public Human Documentation and Repository Acceptance Audit

Status: **OPEN**

Scope: final pre-public acceptance of Livariant's public-facing documentation, beginner usability, writing style, GitHub community surface, and repository presentation.

This audit is intentionally separate from Runtime and Security acceptance. The current RC2 implementation may be technically release-ready while the public repository still needs work before unfamiliar users can understand and use it confidently.

## Acceptance goal

A first-time visitor should be able to answer these questions without prior Livariant knowledge:

1. What problem does Livariant solve?
2. How can it help me if I am new to AI-assisted development?
3. How can it help me if I already use Claude Code, Codex, or another coding agent?
4. What is a Project Brain in plain language?
5. What does Livariant change in my project, and what does it deliberately not change?
6. How do I install it safely?
7. How do I add it to an existing project?
8. What does a normal day-to-day workflow look like?
9. How do provider handoff, updates, migration, and recovery work at the level I need to use them safely?
10. Where do I ask a question, report a bug, suggest an idea, or report a security problem?

The documentation must work for three audiences:

- a developer who is just starting to use AI for coding;
- a developer who already uses coding agents but has never used Livariant;
- an experienced developer or reviewer who needs precise architecture, lifecycle, and security details.

## Initial findings

### H-01: README starts too far inside the architecture

**Status: OPEN**

The current README opens with terms such as persistent project-owned source of truth, Project Brain, provider changes, capability, authority, mutation, and verification before a beginner has been shown a simple real-world problem.

Required change:

- lead with a concrete AI-development problem in ordinary language;
- explain the practical benefit before introducing internal terminology;
- add a short example showing what happens across sessions or provider changes;
- introduce Project Brain only after the reader understands why persistent project knowledge matters;
- retain the precise authority model, but move deeper security detail below the first-use explanation.

### H-02: Beginner path is not yet explicit enough

**Status: OPEN**

The existing installation and Quickstart guides are operationally detailed, but they still assume familiarity with concepts such as coding agents, provider handoff, canonical state, source IDs, Runtime authority, and release manifests.

Required change:

- add a beginner-friendly explanation of coding agents and sessions where needed;
- explain what Livariant does during ordinary use before advanced lifecycle operations;
- clearly distinguish the beginner path from advanced update/security administration;
- add a simple "Is Livariant useful for me?" section with concrete use cases.

### H-03: Day-to-day usage is under-explained

**Status: OPEN**

Installation, initialization, update, and recovery are documented, but the public journey needs a clearer explanation of normal repeated use after setup.

Required change:

- show what the user does at the start of a new AI session;
- show when `livariant resume` is useful;
- explain how decisions and knowledge become durable project state;
- explain what Livariant does not automatically infer or rewrite;
- provide one small end-to-end example from project setup through a later resumed session.

### H-04: Human writing pass required across public text

**Status: OPEN**

The current public text is precise but often reads like contract or generated technical prose rather than documentation written for ordinary developers.

House style for the public pass:

- prefer direct, natural sentences;
- avoid repeated formulaic contrasts and symmetrical multi-part phrasing unless technically necessary;
- avoid marketing filler;
- explain specialist terms at first use;
- prefer concrete examples over abstract noun chains;
- preserve exact security and lifecycle semantics;
- do not use typographic em dash or en dash characters as prose punctuation. Use normal sentence structure, commas, colons, parentheses, or an ASCII hyphen where appropriate;
- do not mechanically remove punctuation from code, filenames, command flags, standards, quotations, or externally defined names where it is semantically required.

A repository check should eventually enforce the public-text punctuation rule so it does not drift back.

### H-05: German text contains avoidable English-heavy jargon

**Status: OPEN**

The German README currently mixes terms such as Living Software Framework, Coding-Agents, Provider-Memory, First-Class, discovery-first, preservation-first, Machine-/User-Tooling, read-only, plan-first, mutation-first, Resume Handoff, Authority, Candidate Runtime, Attestation, and Lifecycle into introductory prose.

Some product or technical terms need to remain stable, but the beginner-facing German path should explain them in natural German before using shorthand.

Required change:

- retain product names and commands;
- translate or explain general concepts where that improves comprehension;
- avoid forced pseudo-German technical compounds when a normal sentence is clearer;
- keep EN/DE semantics aligned rather than translating word-for-word.

### H-06: Public status wording needs a publication-state pass

**Status: OPEN**

Several documents currently say that Livariant "is in Public Preview" while the canonical repository remains private and the Public Preview has not yet been published.

Required change:

- before publication, distinguish RC preparation from an already-live Public Preview;
- at publication, switch only the intended current-facing surfaces to live Public Preview wording;
- do not leave contradictory private/pre-public and already-public statements in the same user journey.

### H-07: GitHub issue intake is not configured

**Status: OPEN**

The repository `.github` directory currently contains workflows only. There are no issue forms or issue-template routing files.

Required public setup:

- bug report issue form;
- documentation problem issue form;
- feature / improvement request issue form or route to Discussions, depending on final community policy;
- `.github/ISSUE_TEMPLATE/config.yml` with clear security and support routing;
- wording that prevents vulnerability details from being submitted through public issue forms.

### H-08: Pull request community surface is incomplete

**Status: OPEN**

There is no pull request template. External code contributions are currently gated, so the repository must not invite code PRs accidentally.

Required change:

- add a PR template that matches the current contribution gate, or deliberately disable/redirect public code contribution expectations;
- keep contributor-rights/licensing language consistent with `CONTRIBUTING.md`;
- when code contributions open later, update the template and contribution terms together.

### H-09: Discussions needs a defined purpose and launch setup

**Status: OPEN**

Discussions is not useful merely because the tab exists. It needs a clear division of responsibility relative to Issues.

Proposed categories:

- Announcements;
- Q&A;
- Ideas;
- Show and tell;
- General.

Required launch work:

- enable Discussions only when the welcome/category setup is ready;
- add a concise welcome post;
- state what belongs in Discussions versus Issues versus Security reporting;
- seed at least the essential pinned guidance so the space does not open empty and ambiguous.

### H-10: Repository metadata and visible tabs need final public review

**Status: OPEN**

Required review:

- repository description;
- topics;
- homepage link if one is intentionally available;
- Issues enabled;
- Discussions enabled only after setup;
- Projects/Wiki visibility based on actual use;
- Security tab and private vulnerability reporting after public visibility allows the intended host-side configuration;
- branch/ruleset behavior after visibility change.

### H-11: Support routing needs one obvious front door

**Status: OPEN**

A user should never have to guess whether a question belongs in an Issue, Discussion, or security report.

Required change:

Create one short public support map, linked from README and community templates:

- usage question -> Discussions Q&A;
- idea / design suggestion -> Discussions Ideas;
- reproducible product bug -> Issue;
- documentation error -> Issue;
- suspected vulnerability -> private security reporting;
- code contribution -> currently not accepted unless the contribution gate changes.

### H-12: Full public documentation inventory and navigation acceptance remains open

**Status: OPEN**

The repository contains extensive documentation beyond the user-facing `docs/` set, including Core, Project Brain, Runtime, adapter, distribution, and initialization contracts. This depth is valuable, but public navigation must distinguish:

- start here / user documentation;
- operational guides;
- advanced architecture and security;
- internal design contracts and reference material.

The final audit must verify:

- no current-facing broken links;
- no stale product naming or removed commands;
- EN/DE parity for the intended user-facing set;
- no internal-only instructions presented as normal user steps;
- no accidental contradiction between high-level docs and executable behavior;
- clear navigation back to the main user path from deep reference material.

## Current positives

The current repository already has strong foundations that should be preserved:

- complete EN/DE installation and Quickstart paths;
- explicit existing-project adoption guidance;
- provider handoff documentation;
- detailed architecture and safety documentation;
- lifecycle, migration, and recovery guidance;
- privacy and network behavior documentation;
- `SECURITY.md`, `CONTRIBUTING.md`, licensing, and third-party notices;
- executable CI checks for current truth-surface consistency and package behavior.

The goal of this pass is not to simplify away the architecture. It is to add a clear human entry path and make the existing depth easier to navigate.

## Planned implementation order

1. complete the public documentation inventory and classify every public Markdown surface by audience and purpose;
2. rewrite README EN/DE entry sections for beginner comprehension and concrete value;
3. add a beginner-oriented "How Livariant helps" and normal-workflow explanation;
4. perform the human-writing and punctuation pass across current-facing EN/DE user documentation;
5. add support/community routing documentation;
6. add Issue Forms, issue config, and PR/community templates;
7. configure repository metadata and Discussions host settings once the repository is authorized for the relevant public-state change;
8. run a three-persona acceptance review: AI beginner, experienced coding-agent user, and advanced technical/security reviewer;
9. rebuild the final RC2 tarball after all packaged public-text changes are complete and record the new final digest.

## Publication boundary

This audit does not authorize:

- creation or movement of a release tag;
- creation or publication of a GitHub Release;
- npm publication;
- PRIVATE to PUBLIC visibility change;
- new Runtime/Security hardening without a concrete finding.
