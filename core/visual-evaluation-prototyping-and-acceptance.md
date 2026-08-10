---
type: standard
status: baseline
domain: core
language: en
owner: framework
created: 2026-08-09
updated: 2026-08-09
---

# Visual Evaluation, Prototyping & Acceptance Criteria

## Purpose

Design acceptance should be evidence-informed without pretending that all design quality can be reduced to precise numerical scores. The framework distinguishes functional, structural, behavioral, and perceptual evidence while preserving legitimate human judgment inside a valid design space.

> Design acceptance needs evidence, but not false precision.

## Design acceptance criteria

Relevant design work should define acceptance criteria before final implementation where practical. Criteria should state what must be true without unnecessarily prescribing one implementation.

Examples may include:
- the primary action is discoverable without overpowering the environment,
- the interface preserves visible world presence,
- primary navigation is distinguishable from secondary controls,
- the layout remains usable at realistic content density.

Acceptance criteria describe the required outcome, not the chosen visual solution.

## Intent criteria

Some important design requirements are qualitative by nature. They may describe intended atmosphere, identity, or perception rather than directly measurable behavior.

Examples include:
- the experience should feel exploratory rather than administrative,
- the product should not resemble a generic SaaS dashboard,
- progression should feel embedded in the world rather than attached as an external control panel.

Such criteria should be treated explicitly as qualitative intent criteria and evaluated through identity reasoning, references, comparison, prototype feedback, and other appropriate evidence.

## Evidence classes

### Structural Evidence
Evidence about observable visual and interaction structure, including hierarchy, contrast, responsiveness, focus treatment, state visibility, touch targets, accessibility structure, and layout stability.

### Behavioral Evidence
Evidence from actual interaction or task completion, such as whether users can find an action, understand navigation, recover from errors, or complete a flow successfully.

### Perceptual Evidence
Evidence about perceived identity, distinctiveness, atmosphere, and product fit. Perceptual evidence is qualitative but still meaningful when grounded in stated intent, comparison, references, and repeated feedback.

These evidence classes answer different questions and should not be treated as interchangeable.

## Prototype fidelity matches uncertainty

> Prototype fidelity should match the uncertainty being tested.

Use the cheapest fidelity that can answer the relevant question reliably.

Low-fidelity prototypes are appropriate for structure, navigation, prioritization, and flow. Mid-fidelity prototypes are appropriate for composition, information density, interaction behavior, and realistic content relationships. High-fidelity prototypes are appropriate when uncertainty concerns visual identity, typography, materiality, motion, emotional effect, or other properties that cannot be judged meaningfully in abstract wireframes.

The framework should not demand high-fidelity work merely to make an exploration appear complete.

## Validate before expensive commitment

Where a significant design assumption is uncertain and expensive to reverse after implementation, validate it before substantial engineering commitment when practical.

Prototyping is most valuable where it reduces decision risk, not where it simply produces presentation artifacts.

## Realistic and adversarial content

> Design should be tested against realistic and adversarial content, not only ideal mock data.

Relevant cases may include short and long content, empty states, loading states, error states, success states, dense states, missing media, localized text expansion, narrow and wide viewports, and unusual but valid user-generated values.

This is the design equivalent of negative-path verification: the design should hold under plausible stress, not only in showcase conditions.

## Localization and expansion

Design validation should account for the localization policy where applicable. A layout that works only for concise source-language strings is not robust.

Profiles may define stronger localization requirements, but the baseline should consider text expansion and typography variation before declaring a relevant surface complete.

## State completeness

A component or flow is incomplete when material user states remain accidentally undesigned.

Relevant states may include default, hover, focus, active, disabled, loading, empty, error, and success. Only states that genuinely exist need design treatment. The purpose is completeness, not checklist inflation.

## Interaction before decorative refinement

When unresolved interaction behavior determines the structure of a design, resolve that uncertainty before spending heavily on decorative refinement.

A visually polished state model that still lacks coherent interaction logic is not a completed design.

## Motion criteria

Motion should serve a purpose such as explaining relationships between states, directing attention, providing feedback, preserving spatial orientation, or supporting atmosphere or identity.

Motion must also respect accessibility needs, including reduced-motion preferences where applicable, and should not carry essential information exclusively through movement.

## Evaluation context

Design should be reviewed at the context depth appropriate to its importance.

- **ISOLATED** — the component or artifact alone.
- **CONTEXTUAL** — the artifact inside its actual product surface.
- **SYSTEMIC** — the artifact considered alongside surrounding screens, flows, and shared design logic.

Important design decisions should increasingly move toward contextual and systemic review because isolated quality does not guarantee product coherence.

## Visual regression

Automated screenshot or visual regression tools may protect known rendered state and detect unintended pixel-level change.

> Visual regression protects known state; it does not replace design judgment.

A changed screenshot does not by itself prove improvement or regression. Human or agent design reasoning remains necessary for qualitative evaluation.

## Acceptance verdicts

### ACCEPT
Relevant intent and acceptance criteria are satisfied and no blocking issues remain.

### ACCEPT_WITH_FOLLOWUP
The design is acceptable for the current decision or implementation step, with only explicit non-blocking follow-up remaining.

### REFINE
The core direction remains viable, but meaningful criteria are not yet satisfied.

### REJECT
The direction itself does not solve the design problem well enough or conflicts materially with identity, system, or product requirements.

### BLOCK
Critical accessibility, usability, governance, or systemic issues prevent acceptance.

## Human taste inside the valid design space

> Evidence narrows the valid design space; human taste may choose within it.

When several options satisfy the relevant functional, accessibility, coherence, and identity requirements, human preference is a legitimate final differentiator.

The framework does not attempt to eliminate taste. It prevents taste from silently hiding material quality failures.

## Evaluation without stylistic normalization

Evaluation should protect quality without normalizing style.

The framework should judge a design against its own declared intent and fundamental usability, accessibility, and system constraints rather than against one universal aesthetic ideal.

A deliberately minimal, brutalist, ornate, playful, atmospheric, or information-dense product may all be valid when the chosen style is purposeful and coherent.

## Design acceptance report

For identity-defining or otherwise significant work, a concise acceptance record may capture intent criteria, structural evidence, behavioral evidence, perceptual evidence, open follow-up, and a verdict.

This level of reporting is intended for meaningful decisions, not routine micro-adjustments.

## Core principles

> **Design acceptance needs evidence, but not false precision.**

> **Prototype fidelity should match the uncertainty being tested.**

> **Design should be tested against realistic and adversarial content.**

> **Material user states must not remain accidentally undesigned.**

> **Visual regression protects known state; it does not replace design judgment.**

> **Evidence narrows the valid design space; human taste may choose within it.**

> **Evaluation should protect quality without normalizing style.**
