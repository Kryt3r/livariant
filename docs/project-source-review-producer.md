# Project Source & Review producer

The Project Source & Review producer is the canonical composition seam between accepted project-source state, explicit source observations, the canonical Existing-Project-Adoption review lifecycle and the Desktop presentation surface.

`produceProjectSourceReviewPresentation(...)` composes `buildProjectSourceCenterPresentation(...)` with the existing `buildAdoptionDesktopPresentation(...)`. It does not implement a second adoption engine and does not reinterpret repository evidence.

The producer may include source observations and current review lifecycle evidence only when that evidence is explicitly supplied. Missing observations remain unknown. Review decisions, authorization or Semantic Apply evidence are rejected when no current review is supplied.

The produced presentation remains presentation data only. It is not Project Truth, does not grant Authority, does not mutate project-owned files and does not itself perform Semantic Apply. Serialized output is suitable for the bounded Desktop bridge snapshot only after the caller stores it through an authorized host-side persistence path.

This producer does not authorize Self-Hosting mutation and does not add any release, publication or updater capability.
