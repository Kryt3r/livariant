# First-run Project Source & Review configuration projection

Livariant can project the accepted `FirstRunOnboardingState` into the bounded Project Sources & Review configuration shape used by the Desktop configuration writer.

The projection requires an explicit onboarding `projectId`, a source registry, and an explicit local binding on the primary repository. The onboarding `localRoot` is not silently reused as a repository binding because project root and repository binding are separate facts.

Additional repositories preserve their configured identity, mandatory purpose description and optional explicit local binding. Selected review paths and review decisions remain explicit inputs to the projection; decisions are not accepted without selected review material.

The projection does not create reachability, branch, revision or stale observations. Those facts remain the responsibility of the separate accepted source-observation path.

The projection is configuration plumbing only. It does not become Project Truth, grant Authority, perform Semantic Apply, change project-owned files or authorize Self-Hosting mutation.
