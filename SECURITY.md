# Livariant Security Policy

Livariant treats project ownership, mutation authority, release integrity, migration safety, and recovery evidence as security-relevant boundaries.

## Supported security-reporting path

Do **not** disclose a suspected vulnerability through a public issue before the maintainer has had a reasonable opportunity to assess it.

For the Public Preview, the intended private reporting path is GitHub Private Vulnerability Reporting / Security Advisories on the canonical Livariant repository.

**Operational release gate:** the canonical public Livariant repository must have a working private vulnerability-reporting path enabled before the first Public Preview release is published. Until that host-side configuration is verified, this document does not claim that private reporting is already available.

If private vulnerability reporting is unavailable on the repository you are viewing, do not post exploit details publicly. Contact the repository maintainer through an available private GitHub channel and reference this policy.

## What to include

A useful report should include, when known:

- affected Livariant version / release channel;
- operating system and Node.js version;
- affected command or lifecycle path;
- whether a Project Brain already existed;
- minimal reproduction steps;
- expected versus observed behavior;
- whether project-owned data, authority boundaries, release trust, migration state, or recovery evidence may be affected;
- any proof-of-concept that can be shared safely.

Do not include unrelated secrets, credentials, private project contents, or personal data.

## Security-sensitive classes

Examples include:

- path traversal or symlink escape outside managed boundaries;
- mutation without explicit authority;
- release/source/integrity verification bypass;
- execution of an untrusted or drifted Runtime;
- migration replay or checkpoint-integrity bypass;
- recovery that can overwrite valid project-owned state;
- provider/native-instruction behavior that silently becomes canonical truth;
- secret ingestion or unintended disclosure during discovery or Resume.

## Response expectations for Preview

Public Preview is not a paid support SLA. Security reports are triaged according to severity and reproducibility. Acknowledgement and remediation timing may vary.

A confirmed Critical or Major issue affecting a supported lifecycle path is a release blocker for subsequent Preview releases until it is fixed, safely bounded, or the affected path is explicitly withdrawn from support.

## Safe research

Good-faith testing should stay within systems and projects you own or are authorized to test. Avoid destructive testing against third-party infrastructure, denial of service, credential theft, privacy violations, or access to data you are not authorized to access.

## Disclosure

Please allow time for validation and remediation before public disclosure. Coordinated disclosure details can be agreed for a confirmed issue.
