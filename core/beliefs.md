---
type: reference
status: baseline
domain: core
language: en
owner: framework
created: 2026-08-09
updated: 2026-08-09
---

# Beliefs

These beliefs are not executable policies. They explain the reasoning behind the framework's governance, standards, and processes. They are expected to evolve when experience reveals better formulations, as long as changes are deliberate and justified.

## Truth and understanding

### Context beats prompt length
Better outcomes come from relevant, structured context, not from endlessly expanding prompts.

### Uncertainty should be visible
An explicit “we do not know yet” is more valuable than a plausible invention. Uncertainty is information, not a failure state.

### Evidence is stronger than confidence
Tests, measurements, source inspection, reproducible behavior, and verifiable sources outweigh how certain a person or model sounds.

### AI should not be trusted merely because it was useful yesterday
Models, tools, context, and tasks change. Important outputs remain subject to verification appropriate to their risk, regardless of previous reliability.

### Reflection should precede standardization
A bad standard applied consistently is worse than an unresolved question. Rules should emerge only after their purpose and consequences are understood.

## Responsibility and decisions

### Human ownership is non-negotiable
AI may analyze, design, implement, critique, and recommend. Product intent, hard-to-reverse directional decisions, and subjective value judgments remain human responsibilities.

### Decisions need rationale, not just outcomes
Knowing what was chosen is insufficient when future maintainers need to understand why alternatives were rejected.

### Independent criticism improves important work
The creator of a solution is not automatically the best final reviewer of it. As risk increases, the value of an independent perspective increases as well.

### Specialized perspectives beat one undifferentiated agent
Security, architecture, UX, design, operations, and product ask different questions. These perspectives remain valuable even when one model performs them sequentially.

## Coherence and knowledge

### Architecture outlives models
The strongest current model is temporary. Clear boundaries, strong project structure, and understandable decisions endure.

### Process should outlive tools
A project's operating model should survive changes in agents, IDEs, providers, and model generations.

### Knowledge should compound
A mature project should become easier to understand over time, not harder. Meaningful discoveries and decisions should reduce future uncertainty.

### Project intelligence compounds through active use
A Project Brain does not reach its full value at setup time. Its usefulness grows when real work produces decisions, failures, corrections, reviews, design judgments, operational lessons, and other meaningful experience—and that experience is deliberately converted into durable project knowledge.

Time alone does not improve the framework. Active operation, reflection, correction, and selective documentation do.

### Documentation is infrastructure
Durable project context is part of the system. Documentation that merely duplicates code or grows without purpose creates entropy instead of reducing it.

### Brain maintenance is part of engineering work
When a task creates durable knowledge that should influence future decisions, preserving that knowledge is part of completing the task—not optional cleanup for later.

This remains subject to the anti-bloat principle: not every action deserves documentation. Only knowledge with future decision value should persist.

### Every relevant fact or rule needs one source of truth
Copied truths drift. Other documents should reference the canonical source instead of restating it independently.

### Every important decision must be discoverable
No “we discussed that somewhere in a chat”. A future human or agent should be able to deliberately find the reasoning behind important choices.

## Engineering, risk, and quality

### Complexity must earn its existence
Every abstraction, dependency, role, rule, and document imposes a maintenance cost. Add complexity only when its benefit exceeds that cost.

### Risk matters more than diff size
Ten lines touching authentication may be more dangerous than ten thousand low-risk lines. Process rigor should follow potential impact, not visual change size.

### Security is a property of the process
Security does not emerge from one late-stage audit. It must shape design, implementation, data models, review, deployment, and operations.

### Faster is not automatically better
Development speed has value only while coherence, security, maintainability, and product quality remain intact.

### The strongest model is not always the right model
Model selection should match task capability, risk, cost, latency, and actual availability instead of defaulting to maximum capability.

### Good defaults are useful; generic defaults are dangerous
Reuse proven patterns when they genuinely fit the problem. Reject patterns used only because they are statistically common.

## Design, identity, and evolution

### Design requires judgment
A functional interface is not automatically a good interface. Visual quality requires references, comparison, critique, iteration, and human taste.

### Consistency is not sameness
A coherent product may still be surprising, creative, and distinct. Governance should prevent accidental drift, not intentional evolution.

### Design ownership must not depend on mental visualization
People should be able to make strong design decisions without first holding a complete visual image in their mind. The framework externalizes design through references, alternatives, mockups, and comparison.

### Standards are allowed to age
A rule that no longer reduces risk or improves decisions should be challenged, revised, deprecated, or removed.

### The framework serves the project, never the reverse
If a process creates bureaucracy without reducing risk or improving decisions, it has lost its justification.

## Unifying belief

> **Projects should accumulate wisdom, not entropy.**

Every meaningful cycle of work should leave a project more understandable, more deliberate, and better able to benefit from what it has already learned.
