import test from "node:test";
import assert from "node:assert/strict";
import {
  addAdditionalProjectRepository,
  createProjectSourceRegistry,
  disconnectAdditionalProjectRepository,
  setAdditionalProjectRepositoryLocalBinding,
  setPrimaryProjectRepositoryLocalBinding,
  updateAdditionalProjectRepositoryDescription,
} from "../src/project/source-registry.js";

const primary = {
  identity: {
    provider: "github" as const,
    repositoryId: "1330175059",
    displayName: "Kryt3r/livariant",
    remoteUrl: "https://github.com/Kryt3r/livariant",
  },
  local: { localPath: "C:/src/livariant" },
};

const internal = {
  identity: {
    provider: "github" as const,
    repositoryId: "livariant-internal-id",
    displayName: "Kryt3r/livariant-internal",
    remoteUrl: "https://github.com/Kryt3r/livariant-internal",
  },
  description: "Internal development control plane and governance evidence.",
  local: { localPath: "C:/src/livariant-internal" },
};

test("project source registry has exactly one primary repository and no implicit authority", () => {
  const registry = createProjectSourceRegistry("livariant", primary);

  assert.equal(registry.projectId, "livariant");
  assert.equal(registry.primary.kind, "primary");
  assert.equal(registry.primary.identity.displayName, "Kryt3r/livariant");
  assert.deepEqual(registry.additional, []);
  assert.equal(registry.boundaries.repositoryDescriptionGrantsAuthority, false);
  assert.equal(registry.boundaries.repositoryAssociationIsProjectTruth, false);
  assert.equal(registry.boundaries.disconnectDeletesRemoteRepository, false);
  assert.equal(registry.boundaries.disconnectDeletesLocalCheckout, false);
});

test("additional repositories require an explicit purpose description", () => {
  const registry = createProjectSourceRegistry("livariant", primary);

  assert.throws(
    () => addAdditionalProjectRepository(registry, { ...internal, description: "   " }),
    /description must not be empty/,
  );
});

test("additional repository identity must differ from primary and existing additional repositories", () => {
  const registry = createProjectSourceRegistry("livariant", primary);

  assert.throws(
    () => addAdditionalProjectRepository(registry, {
      identity: { ...primary.identity, displayName: "same repository" },
      description: "Duplicate primary",
    }),
    /duplicates the primary repository identity/,
  );

  const withInternal = addAdditionalProjectRepository(registry, internal).registry;
  assert.throws(
    () => addAdditionalProjectRepository(withInternal, {
      ...internal,
      identity: { ...internal.identity, repositoryId: "LIVARIANT-INTERNAL-ID" },
    }),
    /already associated/,
  );
});

test("local path binding is separate from repository identity", () => {
  const registry = createProjectSourceRegistry("livariant", primary);
  const added = addAdditionalProjectRepository(registry, internal).registry;

  assert.equal(added.additional[0]?.identity.repositoryId, "livariant-internal-id");
  assert.equal(added.additional[0]?.local?.localPath, "C:/src/livariant-internal");
  assert.equal(added.additional[0]?.description, internal.description);
});

test("disconnect removes only the Livariant association and never represents source deletion", () => {
  const initial = createProjectSourceRegistry("livariant", primary);
  const added = addAdditionalProjectRepository(initial, internal).registry;
  const disconnected = disconnectAdditionalProjectRepository(added, internal.identity);

  assert.equal(disconnected.changed, true);
  assert.equal(disconnected.registry.additional.length, 0);
  assert.equal(added.additional.length, 1, "the prior registry snapshot remains unchanged");
  assert.equal(disconnected.boundaries.projectOwnedFilesChanged, false);
  assert.equal(disconnected.boundaries.remoteRepositoryDeleted, false);
  assert.equal(disconnected.boundaries.localCheckoutDeleted, false);
  assert.equal(disconnected.boundaries.grantsAuthority, false);
  assert.equal(disconnected.boundaries.changesProjectTruth, false);
});

test("disconnecting an unknown repository is deterministic and non-destructive", () => {
  const registry = createProjectSourceRegistry("livariant", primary);
  const result = disconnectAdditionalProjectRepository(registry, internal.identity);

  assert.equal(result.changed, false);
  assert.equal(result.registry, registry);
  assert.equal(result.boundaries.remoteRepositoryDeleted, false);
  assert.equal(result.boundaries.localCheckoutDeleted, false);
});


test("primary local binding can be changed without dropping additional repositories", () => {
  const initial = createProjectSourceRegistry("livariant", primary);
  const withInternal = addAdditionalProjectRepository(initial, internal).registry;
  const changed = setPrimaryProjectRepositoryLocalBinding(withInternal, { localPath: "D:/work/livariant" });

  assert.equal(changed.changed, true);
  assert.equal(changed.registry.primary.local?.localPath, "D:/work/livariant");
  assert.equal(changed.registry.additional.length, 1);
  assert.equal(changed.boundaries.localCheckoutDeleted, false);
});

test("additional repository description and local binding are independently editable", () => {
  const initial = addAdditionalProjectRepository(createProjectSourceRegistry("livariant", primary), internal).registry;
  const renamed = updateAdditionalProjectRepositoryDescription(initial, internal.identity, "Second brain and governance.");
  const remoteOnly = setAdditionalProjectRepositoryLocalBinding(renamed.registry, internal.identity, null);
  const relinked = setAdditionalProjectRepositoryLocalBinding(remoteOnly.registry, internal.identity, { localPath: "D:/work/livariant-internal" });

  assert.equal(renamed.registry.additional[0]?.description, "Second brain and governance.");
  assert.equal(remoteOnly.registry.additional[0]?.local, undefined);
  assert.equal(relinked.registry.additional[0]?.local?.localPath, "D:/work/livariant-internal");
  assert.equal(remoteOnly.boundaries.localCheckoutDeleted, false);
  assert.equal(relinked.boundaries.grantsAuthority, false);
});

test("editing an unknown additional repository fails closed", () => {
  const registry = createProjectSourceRegistry("livariant", primary);
  assert.throws(
    () => updateAdditionalProjectRepositoryDescription(registry, internal.identity, "Unknown"),
    /not associated/,
  );
  assert.throws(
    () => setAdditionalProjectRepositoryLocalBinding(registry, internal.identity, null),
    /not associated/,
  );
});
