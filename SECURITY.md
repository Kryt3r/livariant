# Livariant Security Policy

Livariant treats project ownership, mutation authority, release integrity, migration safety, and recovery evidence as security boundaries.

## Reporting a suspected vulnerability

**Do not post vulnerability or exploit details in a public Issue or Discussion.**

For the Public Preview, the intended reporting path is GitHub Private Vulnerability Reporting / Security Advisories on the canonical Livariant repository.

That host-side feature must be enabled and verified before the public Preview is launched. Until that check has actually passed, this policy does not pretend that private reporting is already available.

If the private reporting option is unavailable on the repository you are viewing, do not publish exploit details just to get attention. Contact the maintainer through an available private GitHub channel and reference this policy.

## What a useful report contains

When known, include:

- affected Livariant version and release channel;
- operating system and Node.js version;
- affected command or lifecycle path;
- whether the project already had a Project Brain;
- minimal reproduction steps;
- expected and observed behavior;
- whether project data, authority boundaries, release trust, migration state, or recovery evidence may be affected;
- a proof of concept when it can be shared safely.

Do not include unrelated secrets, credentials, private project contents, or personal data.

## Examples of security-sensitive problems

Security reports may include problems such as:

- path traversal or symlink escape outside managed boundaries;
- project mutation without required authority;
- release source or integrity verification bypass;
- execution of an untrusted or drifted Runtime;
- migration replay or checkpoint-integrity bypass;
- recovery that can overwrite valid project-owned state;
- provider or native-instruction behavior that silently becomes canonical project truth;
- secret ingestion or unintended disclosure during discovery or Resume.

This list is not exhaustive.

## Preview response expectations

Public Preview security handling is maintainer-supported and does not include a paid response-time SLA unless separately agreed.

Reports are triaged according to severity, impact, and reproducibility. Acknowledgement and remediation time may vary.

A confirmed Critical or Major issue on a supported lifecycle path blocks subsequent Preview release work until it is fixed, safely bounded, or the affected path is explicitly withdrawn from support.

## Safe research

Test only systems and projects you own or are authorized to test.

Avoid destructive testing against third-party infrastructure, denial of service, credential theft, privacy violations, and access to data you are not authorized to view.

## Coordinated disclosure

Please allow reasonable time for validation and remediation before public disclosure. Disclosure timing can be coordinated for a confirmed issue.
