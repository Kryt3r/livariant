---
type: core-policy
status: accepted
domain: security
language: en
owner: framework
---

# Secure Defaults, Failure Modes & Abuse Resistance

**Foundation:** FOUNDATION-05F

## Purpose

Systems should remain safe not only when used correctly, but also when misconfigured, partially unavailable, or deliberately abused.

## Secure by default

New functionality should begin from a safe state. Privileged capabilities, public exposure, broad access, or other materially risky behavior should require explicit activation or authorization rather than being enabled implicitly.

> Secure behavior should be the default, not an optional hardening step.

## Fail securely

When a security-critical decision cannot be made reliably, the system must not silently weaken the relevant protection boundary.

For privileged effects, inability to establish required authority should normally block or defer the effect unless a deliberately designed availability requirement justifies another behavior.

## Abuse resistance

Security reasoning must consider adversarial use of otherwise valid functionality. A feature may work as designed while still permitting spam, amplification, resource exhaustion, privilege abuse, or harmful automation.

## Resource protection

Rate limits, quotas, workload isolation, bounded retries, queue controls, or similar protections should be considered where one actor or workload can materially degrade availability for others.

Resource exhaustion and amplification become security concerns when abuse can cross isolation or availability boundaries.

## Graceful degradation

Partial failures should degrade functionality without unnecessarily expanding privileges, exposing sensitive information, or collapsing unrelated security boundaries.

## No insecure fallback

If a secure mechanism becomes unavailable, the runtime must not silently replace it with a weaker mechanism merely to preserve convenience.

Any designed fallback that changes security assumptions must be explicit, reviewed, and reflected in risk reasoning.

## Error handling

Failure responses should support recovery without unnecessarily exposing secrets, internal architecture, stack traces, sensitive identifiers, or other attack-relevant detail.

## Recovery paths

Recovery, maintenance, break-glass, or emergency paths must not become undocumented bypasses around normal trust and authorization rules.

Where exceptional authority is necessary, it must remain explicit, scoped, auditable, and subject to applicable runtime authority rules.

> Recovery paths must not become bypass paths.

## Core principles

> **Secure behavior should be the default, not an optional hardening step.**

> **Failure must not silently weaken security boundaries.**

> **Abuse resistance considers adversarial use of otherwise valid functionality.**

> **Resource exhaustion and amplification are security concerns when one actor can harm others.**

> **Graceful degradation must preserve security properties where feasible.**

> **Recovery paths must not become bypass paths.**
