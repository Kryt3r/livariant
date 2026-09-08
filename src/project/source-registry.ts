export type RepositoryProvider = "github" | "git";

export interface RepositoryIdentity {
  provider: RepositoryProvider;
  repositoryId: string;
  displayName: string;
  remoteUrl?: string;
}

export interface RepositoryLocalBinding {
  localPath: string;
}

export interface PrimaryProjectRepository {
  kind: "primary";
  identity: RepositoryIdentity;
  local?: RepositoryLocalBinding;
}

export interface AdditionalProjectRepository {
  kind: "additional";
  identity: RepositoryIdentity;
  description: string;
  local?: RepositoryLocalBinding;
}

export interface ProjectSourceRegistry {
  projectId: string;
  primary: PrimaryProjectRepository;
  additional: readonly AdditionalProjectRepository[];
  boundaries: {
    repositoryDescriptionGrantsAuthority: false;
    repositoryAssociationIsProjectTruth: false;
    disconnectDeletesRemoteRepository: false;
    disconnectDeletesLocalCheckout: false;
  };
}

export interface ProjectSourceRegistryChange {
  registry: ProjectSourceRegistry;
  changed: boolean;
  boundaries: {
    projectOwnedFilesChanged: false;
    remoteRepositoryDeleted: false;
    localCheckoutDeleted: false;
    grantsAuthority: false;
    changesProjectTruth: false;
  };
}

function required(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} must not be empty.`);
  return normalized;
}

function normalizeIdentity(identity: RepositoryIdentity): RepositoryIdentity {
  const repositoryId = required(identity.repositoryId, "repositoryId");
  const displayName = required(identity.displayName, "displayName");
  const remoteUrl = identity.remoteUrl?.trim();
  return {
    provider: identity.provider,
    repositoryId,
    displayName,
    ...(remoteUrl ? { remoteUrl } : {}),
  };
}

function identityKey(identity: RepositoryIdentity): string {
  return `${identity.provider}:${identity.repositoryId.trim().toLowerCase()}`;
}

function localBinding(local?: RepositoryLocalBinding): RepositoryLocalBinding | undefined {
  if (!local) return undefined;
  return { localPath: required(local.localPath, "localPath") };
}

function boundaries() {
  return {
    repositoryDescriptionGrantsAuthority: false as const,
    repositoryAssociationIsProjectTruth: false as const,
    disconnectDeletesRemoteRepository: false as const,
    disconnectDeletesLocalCheckout: false as const,
  };
}

function changeBoundaries() {
  return {
    projectOwnedFilesChanged: false as const,
    remoteRepositoryDeleted: false as const,
    localCheckoutDeleted: false as const,
    grantsAuthority: false as const,
    changesProjectTruth: false as const,
  };
}

export function createProjectSourceRegistry(
  projectId: string,
  primary: Omit<PrimaryProjectRepository, "kind">,
): ProjectSourceRegistry {
  return {
    projectId: required(projectId, "projectId"),
    primary: {
      kind: "primary",
      identity: normalizeIdentity(primary.identity),
      ...(primary.local ? { local: localBinding(primary.local) } : {}),
    },
    additional: [],
    boundaries: boundaries(),
  };
}

export function addAdditionalProjectRepository(
  registry: ProjectSourceRegistry,
  repository: Omit<AdditionalProjectRepository, "kind">,
): ProjectSourceRegistryChange {
  const identity = normalizeIdentity(repository.identity);
  const description = required(repository.description, "description");
  const incomingKey = identityKey(identity);

  if (identityKey(registry.primary.identity) === incomingKey) {
    throw new Error("Additional repository duplicates the primary repository identity.");
  }
  if (registry.additional.some((item) => identityKey(item.identity) === incomingKey)) {
    throw new Error("Additional repository identity is already associated with this project.");
  }

  return {
    changed: true,
    registry: {
      ...registry,
      additional: [
        ...registry.additional,
        {
          kind: "additional",
          identity,
          description,
          ...(repository.local ? { local: localBinding(repository.local) } : {}),
        },
      ],
    },
    boundaries: changeBoundaries(),
  };
}

export function disconnectAdditionalProjectRepository(
  registry: ProjectSourceRegistry,
  identity: RepositoryIdentity,
): ProjectSourceRegistryChange {
  const key = identityKey(normalizeIdentity(identity));
  const next = registry.additional.filter((item) => identityKey(item.identity) !== key);

  return {
    changed: next.length !== registry.additional.length,
    registry: next.length === registry.additional.length ? registry : { ...registry, additional: next },
    boundaries: changeBoundaries(),
  };
}
