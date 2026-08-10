---
type: core-policy
status: accepted
domain: security
language: en
owner: framework
---

# Secrets, Sensitive Data & Privacy-Aware Handling

**Foundation:** FOUNDATION-05D

## Purpose

The framework must minimize unnecessary exposure of secrets and sensitive information across project knowledge, runtime state, agents, tools, logs, and external providers.

> Information should only cross a boundary when its purpose justifies the exposure.

## Secrets are not project knowledge

Secret values must never become ordinary durable Project Brain knowledge. Project intelligence may reference the existence or identifier of a secret, such as `DISCORD_BOT_TOKEN`, without storing its value.

> Secrets are referenced capabilities, not project knowledge.

## Data classification

Projects should be able to distinguish information by sensitivity. A simple model may include categories such as:

- `PUBLIC`
- `INTERNAL`
- `SENSITIVE`
- `SECRET`

The exact taxonomy may be extended by profiles or projects. Classification should influence persistence, context routing, logging, tooling, and external disclosure.

When information may be sensitive but its classification is unknown or disputed, the runtime must not treat that uncertainty as permission for broader disclosure. Until resolved, handling should prefer the more restrictive plausible classification when the consequence of exposure is material.

## Need-to-know context

Agents, specialists, tools, and providers should receive only the sensitive context necessary for their assigned responsibility. Access to a broad project context does not imply a need for production credentials, personal data, or unrelated confidential information.

## Logs, traces, and runtime state

Observability and recovery systems are potential disclosure surfaces. Secrets and unnecessary sensitive values must not be persisted in logs, traces, checkpoints, error reports, or runtime records.

Redaction and omission should occur before sensitive information reaches durable or externally visible telemetry where practical.

## Data minimization

Systems should collect, persist, process, and transmit only information that has a justified purpose.

Data minimization reduces both privacy exposure and security blast radius.

## Retention

Sensitive information should not remain indefinitely merely because it was once useful. Retention should reflect purpose, operational requirements, recovery needs, and applicable project constraints.

Temporary sensitive context should be discarded when its purpose has ended where feasible.

## Secret lifecycle

Secrets should be treated as lifecycle-managed security assets:

```text
Create / Provision
↓
Store securely
↓
Use within intended scope
↓
Rotate when appropriate
↓
Revoke when compromised or obsolete
↓
Remove when no longer required
```

Rotation and revocation are normal design concerns rather than exceptional recovery mechanisms.

## External tools and providers

External tools, models, APIs, integrations, and providers form data boundaries. Sensitive project information must not automatically be forwarded merely because a tool is technically available.

Routing decisions should consider what information the destination requires and what exposure the project permits.

## Privacy-aware handling

Security and privacy overlap but are not identical. A system may protect data well while collecting or retaining more personal information than necessary.

The Core therefore requires minimization and purpose-aware handling while leaving jurisdiction-specific legal obligations to appropriate profiles and project requirements.

## Core principles

> **Secrets must never become ordinary durable project knowledge.**

> **Sensitive information requires explicit scope and purpose.**

> **Uncertain classification must not silently broaden disclosure.**

> **Agents and tools receive the minimum sensitive context necessary.**

> **Logs and runtime state must be treated as potential data-exposure surfaces.**

> **Data minimization reduces both privacy risk and security blast radius.**

> **Secret rotation and revocation are part of normal lifecycle design.**

> **Information should only cross a boundary when its purpose justifies the exposure.**
