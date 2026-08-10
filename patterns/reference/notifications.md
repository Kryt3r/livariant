---
type: reusable-pattern
status: accepted
id: notifications
version: 0.1
language: en
owner: framework
foundation: FOUNDATION-06H
---

# Notifications Pattern

## Problem Space

Design user-facing event notifications so important events can be surfaced reliably without coupling product events directly to one delivery channel or creating uncontrolled noise.

## Applicability

Use when notifications are durable, cross-system, preference-aware, multi-channel, retryable, or need read/unread state or delivery tracking.

## Anti-Applicability

Do not introduce a notification subsystem for transient local UI feedback such as an inline validation message or a simple toast that has no durable or cross-system meaning.

## Forces & Trade-offs

- immediacy versus batching,
- reliability versus duplicate delivery,
- relevance versus notification fatigue,
- channel flexibility versus operational complexity,
- durability versus storage and lifecycle cost,
- personalization versus predictable product behavior.

## Solution Space

A useful design commonly separates:

- domain event or product intent,
- notification decision and audience,
- notification record where durability is required,
- channel delivery such as in-app, email, push, or external messaging.

The amount of separation should remain proportional. A small product does not need an event bus merely because notifications exist.

## Pattern Invariants

When durable notifications are selected:

- product state must not depend on successful notification delivery unless explicitly designed that way,
- delivery retries must not silently duplicate irreversible business actions,
- user targeting and visibility must respect applicable authorization boundaries,
- channel failure must remain distinguishable from creation of the underlying product event.

## Failure Modes

- coupling business actions directly to email or push provider calls,
- treating notification delivery as the source of truth for the underlying event,
- retry logic creating duplicate product-side effects,
- ignoring user preferences or scope boundaries,
- introducing queues, buses, and multiple channels before the product needs them,
- flooding users because every technical event becomes a notification.

## Decision Surface

The Pattern does not choose channels, providers, retention periods, batching rules, user preference defaults, urgency levels, or product notification policy. Those remain project decisions.

## Composition Surface

Common interactions include settings/preferences, permissions, messaging, background jobs, audit/event systems, and external delivery providers.

If notification visibility depends on protected data, the relevant authorization concern must be evaluated rather than assumed.

## Verification Guidance

Where material, verify audience correctness, preference handling, duplicate/retry behavior, provider failure paths, unread/read lifecycle, channel degradation, and that failed delivery cannot corrupt the underlying product state.

## Examples & Evidence

Example: a product may persist in-app notifications while treating email as best-effort delivery of the same notification intent. That architecture is a project choice, not a universal requirement of this Pattern.
