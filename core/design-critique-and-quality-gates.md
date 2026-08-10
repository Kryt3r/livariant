---
type: standard
status: baseline
domain: core
language: en
owner: framework
created: 2026-08-09
updated: 2026-08-09
---

# Design Critique, Anti-Slop & Quality Gates

## Purpose

Design critique exists to distinguish merely polished output from design that is purposeful, coherent, usable, extensible, and aligned with product identity.

> Anti-slop is the rejection of unreasoned design, not a ban on popular patterns.

Cards, gradients, glassmorphism, large typography, asymmetry, minimalism, and other familiar patterns are not inherently good or bad. Their legitimacy depends on purpose, context, coherence, and product fit.

## Evaluation dimensions

Relevant designs should be assessed across at least these dimensions:

- **Identity Fit** — does the design belong to this product, or could it be rebranded for many unrelated products without meaningful change?
- **Functional Clarity** — is hierarchy understandable, interaction discoverable, and the next useful action clear?
- **Visual Coherence** — do typography, spacing, shape language, imagery, motion, hierarchy, and density form one system?
- **Distinctiveness** — does the design contain deliberate product-specific logic instead of relying almost entirely on generic conventions?
- **System Compatibility** — does the design fit existing product patterns and remain extensible as the product grows?

A design may be visually attractive and still fail these tests.

## Anti-slop heuristics

The Design Critic should treat common patterns as prompts for investigation rather than automatic failures.

Potential warning signs include:

- many equally weighted cards without meaningful hierarchy,
- oversized empty hero regions without functional or identity purpose,
- generic premium-looking gradients,
- glassmorphism without spatial or interaction meaning,
- decorative badge pills without semantic value,
- excessive rounding that flattens hierarchy,
- interchangeable stock or generated imagery,
- identical component treatment for meaningfully different content,
- decoration that competes with the product's primary content,
- motion without interaction or information value,
- dashboard layouts used where the underlying mental model is not a dashboard.

The decisive question is always: **why does this element exist here?**

## Replaceability test

For identity-relevant surfaces, ask:

> If the logo, name, and palette were replaced, could this design plausibly serve an unrelated product without structural change?

A positive answer is a warning that product identity may be too weak.

Utility interfaces may legitimately use more conventional patterns. The test is strongest for signature and identity-defining experiences.

## Purpose test

Dominant visual decisions should be explainable in terms of purpose.

Valid purposes may include creating focus, communicating hierarchy, improving orientation, carrying atmosphere, differentiating state, reducing cognitive load, integrating interface and world, or strengthening product identity.

"It looks modern" is not sufficient reasoning by itself.

## Removal test

When an element is suspected of being decorative noise, ask what is lost if it is removed.

If comprehension, hierarchy, atmosphere, identity, or meaningful interaction does not weaken, the element may not justify its presence.

Decoration is not forbidden. It should be intentional.

## Consistency versus repetition

> Consistency means shared logic, not repeated layouts.

A coherent product may use different compositions for different contexts while preserving consistent typography, interaction principles, hierarchy logic, spacing philosophy, motion behavior, and visual language.

Uniform layout repetition is not a substitute for design-system coherence.

## Design importance

The quality bar should scale with the importance of the surface.

Indicative importance classes:

- **LOW** — utility or internal surfaces,
- **MEDIUM** — regular product surfaces,
- **HIGH** — core user flows,
- **SIGNATURE** — identity-defining or product-defining experiences.

Not every screen should attempt to become a signature experience.

## Quality gates

### Q0 — Acceptable
Functionally usable with no serious design defects. Appropriate for low-importance or internal surfaces.

### Q1 — Coherent
Clear hierarchy, consistent design logic, and good usability.

### Q2 — Distinctive
Q1 plus recognizable product identity and deliberate visual logic beyond generic defaults.

### Q3 — Signature
A product-defining experience with strong identity, high coherence, excellent function, and meaningful distinctiveness.

The required gate should follow product importance and project context rather than visual ambition alone.

## Evidence and preference

Design critique must distinguish between functional/evidence-based issues, system issues, identity issues, and preference. Preferences may be discussed but must not be disguised as objective defects.

Use the framework's existing review finding levels where applicable rather than creating a separate parallel severity system.

## Signature elements

Strong products often rely on a small set of characteristic design decisions rather than constant novelty. These may include spatial composition, navigation models, typographic hierarchy, transition principles, material language, or consistent interface/world integration.

These may be recorded as **Signature Elements** when they carry durable product identity.

## Convention and originality

> Use convention for comprehension; spend originality where identity matters.

Common interaction patterns should remain familiar when familiarity improves usability. Originality should be concentrated where it strengthens product identity, mental models, atmosphere, or differentiation.

Avoid reinventing controls merely to appear unique.

## Accessibility

Accessibility is part of design quality, not a post-processing step.

Relevant concerns may include contrast, keyboard access, focus visibility, semantic structure, reduced motion, understandable states, touch target size, responsive behavior, and assistive-technology compatibility.

Profiles may define concrete requirements and standards for specific product domains.

## Visual explanation

For important surfaces, the designer should be able to explain why the hierarchy, composition, and dominant visual choices exist.

Explanations should connect to user need, product identity, system behavior, or known constraints rather than relying on empty style adjectives such as "clean", "modern", "premium", or "immersive".

## Critique loop

```text
Design Direction
      ↓
Identity Review
      ↓
Functional Review
      ↓
Anti-Slop Review
      ↓
Accessibility / System Review
      ↓
Findings
      ↓
Refine
      ↓
Re-review
      ↓
Quality Gate
      ↓
Accept
```

The loop should scale with design importance and should not create unnecessary ceremony for trivial visual work.

## Core principles

> **Anti-slop is the rejection of unreasoned design, not a ban on popular patterns.**

> **Convention should serve comprehension; originality should serve identity.**

> **A visually attractive design may still fail if it weakens usability, coherence, or product identity.**

> **Design critique must distinguish evidence-based problems from personal preference.**

> **Signature quality should be demanded only where product importance justifies it.**

> **Every dominant visual decision should be explainable in terms of purpose.**

> **Consistency means shared logic, not repeated layouts.**
