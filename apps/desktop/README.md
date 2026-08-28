# Livariant Desktop Foundation

This directory contains the deliberately small first desktop shell for Livariant.

## Current purpose

The Desktop Foundation is the preferred future normal-user surface for:

- installation/security health;
- protected component and Guardian readiness;
- project selection;
- First Steps;
- updates;
- settings;
- diagnostics.

It is not a second source of Authority and must not invent a lifecycle separate from Livariant Core / protected security components.

## Technology direction

The initial shell uses Tauri 2 with a framework-light TypeScript/CSS frontend.

Reasons for this foundation choice:

- Windows-first without making Windows the application architecture;
- later Linux and macOS desktop targets;
- credible Android/iOS companion-client path;
- native Rust/platform integration where required;
- small runtime footprint by using the host webview;
- full control over Livariant's visual system.

Platform-specific security, installer, ownership/ACL and update behavior must remain behind explicit platform adapters. The renderer is never a root of trust.

## First Steps UX

First Steps is intentionally not a one-shot wizard. Project questions should be answerable one at a time and may be skipped, revisited, corrected or extended later.

The current UI is a foundation preview. Its answers are in-memory UI state only. Before persistence is introduced, the implementation must preserve Livariant's Evidence -> Review -> Project Truth boundaries and distinguish unanswered, deferred, discovered evidence, user candidate input and confirmed Project Truth.

## Development

From `apps/desktop`:

```bash
npm install
npm run tauri:dev
```

A production build will eventually use:

```bash
npm run tauri:build
```

The Desktop Foundation is not yet wired to live Guardian/runtime state and must not display placeholder state as verified security truth.

## Scope boundary

Do not expand this milestone into a marketplace, plugin browser, large dashboard, remote server, mobile runtime or background auto-updater. Those are later concerns.
