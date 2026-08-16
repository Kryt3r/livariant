# Historical Security Regression Registry

This registry maps important previously closed Livariant security findings and attack classes to deterministic regression evidence in the canonical repository.

The registry is **evidence, not Authority**. An entry means Livariant currently has a concrete regression check for the named attack class; it does not claim complete security coverage or prove that related classes of bugs are impossible.

## Coverage rules

- Every protected entry must reference deterministic repository evidence.
- If a regression test is removed, renamed, or no longer exercises the attack class, this registry must be updated in the same change.
- Historical findings remain historical; this registry does not rewrite their original severity or review record.
- CI success does not authorize merge, release, or publication.

## Registry v1

| Historical finding / attack class | Protected surface | Deterministic regression evidence | Current invariant |
| --- | --- | --- | --- |
| Recovery Checkpoint Substitution | lifecycle migration/recovery checkpoint identity | `tests/recovery.test.ts`: `tampered operation identity cannot substitute the active Project Brain as a checkpoint` | Recovery fails closed when migration-journal identity/path material is substituted. |
| Stranded Recovery State | lifecycle recovery state transitions | `tests/recovery.test.ts`: `hard interruption between recovery swap renames remains fail-closed and blocks fresh init`; `tests/recovery-cleanup-boundary.test.ts` | Stranded lifecycle artifacts remain recovery-required and cannot be mistaken for a fresh initialization state. |
| Runtime trust / authority substitution | machine-local Runtime trust boundary | `tests/runtime-project-trust-boundary.test.ts`: `project-local Runtime evidence cannot authorize code execution before machine-local trust`; `tests/pretrust-runtime-authorization.test.ts` | Project-local Runtime evidence cannot manufacture machine-local execution trust. |
| Windows `cmd.exe` / metacharacter runtime-installation risk | runtime/package installation process spawning | `tests/windows-runtime-paths.test.ts`: shell-routing prohibition plus Windows literal-metacharacter cases | npm/runtime installation remains shell-free and Windows metacharacters are treated as literal path data. |
| Proposal / Authority replay or substitution | proposal-bound authorization and semantic apply | `tests/proposal-authorization.test.ts`; `tests/semantic-apply-reconciliation.test.ts` | Authorization remains proposal/baseline-bound and may not be replayed or substituted onto different semantic material/state. |
| Material-bound understanding-adoption substitution | guided-understanding candidate selection | `tests/understanding-adoption.test.ts` | Candidate selection remains bound to exact candidate material rather than only a topic/target label. |
| Forged understanding candidate identity | Core controlled-adoption API | `tests/understanding-adoption.test.ts` | Core recomputes candidate material identity instead of trusting caller-supplied candidate identity claims. |
| Canonical semantic-parser bypass from reviewed candidate evidence | controlled adoption into semantic proposal preparation | `tests/understanding-adoption.test.ts`; `tests/semantic-proposal.test.ts` | Selected review material must pass canonical semantic candidate validation before actionable-proposal preparation. |

## Maintenance

When a future security/correctness finding is accepted and fixed, add it here only when a deterministic regression check exists and the mapping is specific enough to be audited.

If an important historical finding cannot be tied to deterministic regression evidence, record that gap rather than claiming protection.
