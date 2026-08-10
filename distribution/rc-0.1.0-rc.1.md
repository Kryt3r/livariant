---
type: release-candidate-record
status: candidate
version: 0.1.0-rc.1
channel: preview
project-brain-schema: 1
source-id: github:Kryt3r/livariant
---

# Livariant 0.1.0-rc.1 Candidate Record

## Purpose

This record establishes the first private Livariant Release Candidate identity for Public Preview preparation. It does not publish a GitHub Release and does not make the repository public.

## Candidate identity

- Product/runtime version: `0.1.0-rc.1`
- Update channel: `preview`
- Project Brain schema: `1`
- Canonical intended release source: `github:Kryt3r/livariant`
- Repository visibility during candidate validation: private
- Public release status: not published

## Required validation

Before this candidate may be merged as the selected RC baseline, the repository CI must pass on the Preview test baseline for both Ubuntu and Windows with Node 24, including:

- locked dependency installation;
- TypeScript build;
- full executable hardening suite;
- clean-consumer package smoke;
- manifest- and checksum-bound release-bundle smoke.

## Scope boundary

This candidate record does not resolve or approve the later public-launch gates for README presentation, licensing, repository settings, security reporting, contribution policy, branding/trademark presentation, or final GitHub Release publication. Those remain separate pre-publication decisions.

## Compatibility note

The private candidate bundle smoke currently uses `0.1.0-rc.1` as its compatibility evidence source to validate release-manifest mechanics without asserting a public upgrade path from an unpublished development build. Actual supported upgrade compatibility for the first published Preview must be fixed in the release notes and release manifest before publication.
