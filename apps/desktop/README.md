# Livariant Desktop Foundation

This directory contains Livariant's Windows-first Tauri Desktop surface.

## Current purpose

The Desktop is the normal product surface for:

- first-run project setup;
- project/source review;
- connections;
- updates;
- settings;
- diagnostics.

It is not a second source of Authority and must not invent a lifecycle separate from Livariant Core / protected security components.

## Technology direction

The Desktop uses Tauri 2 with a framework-light TypeScript/CSS frontend.

Reasons for this foundation choice:

- Windows-first without making Windows the application architecture;
- later Linux and macOS desktop targets;
- credible Android/iOS companion-client path;
- native Rust/platform integration where required;
- small runtime footprint by using the host webview;
- full control over Livariant's visual system.

Platform-specific security, installer, ownership/ACL and update behavior remain behind explicit platform adapters. The renderer is never a root of trust.

## Development

From `apps/desktop`:

```bash
npm install
npm run tauri:dev
```

`npm run tauri:dev` first builds the current Livariant Core and stages a local, non-authoritative development runtime beside the native debug executable. This mirrors the installed runtime layout closely enough for first-run, connector and Project Sources & Review host bridges to work during native development. The development runtime records its exact Core source SHA and explicitly carries `authorityIssued: false`; it is not a release artifact and does not replace the pinned production runtime qualification.

If the repository-level dependencies are missing, the staging step installs them from the root lockfile before building Core. It does not infer project Authority, Project Truth or mutation permission.

A production build uses the separately qualified pinned runtime/bundle path:

```bash
npm run tauri:build
```

## Scope boundary

Do not treat a development runtime, renderer state or repository content as verified Authority. Evidence remains Evidence; project-owned mutation and publication require their separate accepted boundaries.
