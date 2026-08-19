# Reproducible Failure-Containment Proof

This post-RC3 proof makes one Livariant reliability boundary directly observable without adding new Runtime behavior.

It demonstrates this sequence:

```text
accepted Project Truth exists
-> an agent/provider returns a durable candidate
-> the candidate has no explicit authorization
-> semantic mutation remains zero
-> canonical Project Truth remains byte-for-byte unchanged
-> canonical state later advances
-> the old provider context becomes stale
-> replaying the same candidate is classified as stale-context
-> semantic mutation remains zero
-> current canonical Project Truth remains byte-for-byte unchanged
```

The proof is intentionally narrow. It does not claim that Livariant makes AI output correct. It proves that, for this existing provider-return path, plausible agent output does not gain durable Project Truth or mutation Authority merely by being returned.

## Run it

From a checkout of current repository `main` or a candidate that contains this proof:

```bash
npm run build
node --test dist/tests/failure-containment-proof.test.js
```

Expected result:

```text
ok ... proof: stale agent evidence cannot silently become Project Truth or self-authorize mutation
```

The test itself asserts two containment points:

1. **No self-authorization** — a coherent returned candidate without explicit authorization reaches the existing maintenance path as `authorization-required`, with `semanticChangesMade === 0`, and all managed Project Brain files remain byte-for-byte unchanged.
2. **No stale rebinding** — after canonical Project Truth advances, replaying the same older provider context/candidate becomes `stale-context`, with `semanticChangesMade === 0`, and the newer canonical Project Brain remains byte-for-byte unchanged.

## What this proves

For the exact source under test:

- provider/agent output is evidence, not Project Truth;
- a candidate cannot authorize its own durable mutation;
- an older context packet is not silently rebound to newer canonical state;
- the tested failure paths make zero semantic changes;
- the managed Project Brain files remain unchanged across the blocked attempts.

## What this does not prove

This proof does not claim:

- that all possible AI failures are contained;
- that every Livariant surface is covered by this one scenario;
- that provider output is authenticated merely because it correlates with a context packet;
- that a future release is qualified or authorized;
- that `v0.1.0-rc.3` contains this post-RC3 capability.

The broader safety model still depends on the exact Truth, Authority, Verification, Recovery, Guardian and Self-Integrity contracts implemented by the source being tested.

## Why the proof is executable

The scenario reuses the same Runtime functions and Project Brain files exercised by the existing provider-return tests. It does not simulate a success by changing production semantics or by treating prose as evidence.

Relevant implementation documentation:

- [Provider Roundtrip Evidence Intake](provider-roundtrip-evidence.md)
- [Agent-Assisted Semantic Maintenance](semantic-maintenance.md)
- [Proposal-bound Authorization Foundation](proposal-bound-authorization.md)
- [Semantic Apply](semantic-apply.md)
