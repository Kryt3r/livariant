# Project source registry

Livariant projects have one primary repository and may associate zero or more additional repositories.

The registry is a Livariant-managed project-source association model. It does not make repository content Project Truth and it does not grant Trust or Authority.

## Primary repository

Each project has exactly one primary repository. Its repository identity is distinct from an optional local checkout path.

The primary repository does not require a purpose description because it defines the repository that owns the main project identity.

## Additional repositories

Additional repositories must include a non-empty user-supplied purpose description. The description explains why the repository belongs to the project, for example documentation, infrastructure, or an internal development-control plane.

The description is semantic context only:

- it is not an Authority record;
- it does not create source precedence;
- it does not promote repository content to Project Truth;
- it does not allow automatic conflict resolution.

Duplicate repository identities are rejected, including attempts to add the primary repository again as an additional source.

## Local bindings

Remote repository identity and local filesystem binding are separate concepts. A repository may have a local checkout path, but the local path is not used as the repository's canonical identity.

This separation allows future onboarding/settings flows to bind or replace local checkouts without changing the logical remote repository association.

## Disconnect semantics

Disconnecting an additional repository removes only its association from Livariant's project source registry.

Disconnect does **not**:

- delete or modify the remote repository;
- delete or modify the local checkout;
- mutate project-owned files;
- change Project Truth;
- grant or consume Authority.

The source-registry domain functions are intentionally side-effect free so UI/onboarding/settings layers can reuse the same deterministic safety contract.
