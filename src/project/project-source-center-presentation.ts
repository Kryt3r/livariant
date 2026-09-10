import type { AdoptionDesktopPresentation } from "./adoption-desktop-presentation.js";
import type { ProjectSourceRegistry, RepositoryIdentity } from "./source-registry.js";

export type ProjectSourceReachability = "unknown" | "reachable" | "unreachable";
export type ProjectSourceRemoteState = "recorded" | "not-recorded";
export type ProjectSourceLocalState = "linked" | "not-linked";

export interface ProjectSourceObservation {
  identity: RepositoryIdentity;
  reachability: Exclude<ProjectSourceReachability, "unknown">;
  branch?: string;
  revision?: string;
  observedAt: string;
  stale: boolean;
  attention?: readonly string[];
}

export interface ProjectSourceCenterItem {
  kind: "primary" | "additional";
  identity: RepositoryIdentity;
  description: string | null;
  localPath: string | null;
  remoteState: ProjectSourceRemoteState;
  localState: ProjectSourceLocalState;
  reachability: ProjectSourceReachability;
  branch: string | null;
  revision: string | null;
  observedAt: string | null;
  stale: boolean;
  attention: string[];
  boundaries: {
    descriptionGrantsAuthority: false;
    observationIsProjectTruth: false;
    observationGrantsAuthority: false;
    remoteIdentityGrantsAuthority: false;
    localBindingGrantsAuthority: false;
  };
}

export interface ProjectSourceCenterPresentation {
  schemaVersion: 1;
  projectId: string;
  sources: ProjectSourceCenterItem[];
  review: AdoptionDesktopPresentation | null;
  summary: {
    sourceCount: number;
    additionalSourceCount: number;
    remoteOnlyCount: number;
    localCheckoutCount: number;
    unavailableCount: number;
    staleCount: number;
    reviewAttentionCount: number;
    reviewBlockerCount: number;
  };
  boundaries: {
    repositoryDescriptionIsProjectTruth: false;
    repositoryDescriptionGrantsAuthority: false;
    sourceObservationIsProjectTruth: false;
    sourceObservationGrantsAuthority: false;
    remoteIdentityIsProjectTruth: false;
    remoteIdentityGrantsAuthority: false;
    localBindingGrantsAuthority: false;
    reviewPresentationGrantsAuthority: false;
    hiddenConflictResolution: false;
    changesMade: 0;
  };
}

function identityKey(identity: RepositoryIdentity): string {
  return `${identity.provider}:${identity.repositoryId.trim().toLowerCase()}`;
}

function normalizeObservationMap(observations: readonly ProjectSourceObservation[]): Map<string, ProjectSourceObservation> {
  const result = new Map<string, ProjectSourceObservation>();
  for (const observation of observations) {
    const key = identityKey(observation.identity);
    if (result.has(key)) throw new Error(`Duplicate project source observation for ${key}.`);
    result.set(key, observation);
  }
  return result;
}

function item(
  kind: "primary" | "additional",
  identity: RepositoryIdentity,
  description: string | null,
  localPath: string | null,
  observation: ProjectSourceObservation | undefined,
): ProjectSourceCenterItem {
  const attention = [...(observation?.attention ?? [])].map((value) => value.trim()).filter(Boolean).sort();
  const remoteState: ProjectSourceRemoteState = identity.remoteUrl?.trim() ? "recorded" : "not-recorded";
  const localState: ProjectSourceLocalState = localPath?.trim() ? "linked" : "not-linked";

  if (observation?.reachability === "unreachable") attention.unshift("Source is currently unreachable.");
  if (observation?.stale) attention.unshift("Source observation is stale and should be refreshed.");
  if (localState === "not-linked") attention.unshift("No local checkout is linked. Local inspection is unavailable until a checkout is associated.");

  return {
    kind,
    identity,
    description,
    localPath,
    remoteState,
    localState,
    reachability: observation?.reachability ?? "unknown",
    branch: observation?.branch?.trim() || null,
    revision: observation?.revision?.trim() || null,
    observedAt: observation?.observedAt ?? null,
    stale: observation?.stale ?? false,
    attention,
    boundaries: {
      descriptionGrantsAuthority: false,
      observationIsProjectTruth: false,
      observationGrantsAuthority: false,
      remoteIdentityGrantsAuthority: false,
      localBindingGrantsAuthority: false,
    },
  };
}

export function buildProjectSourceCenterPresentation(
  registry: ProjectSourceRegistry,
  observations: readonly ProjectSourceObservation[] = [],
  review: AdoptionDesktopPresentation | null = null,
): ProjectSourceCenterPresentation {
  const observationByIdentity = normalizeObservationMap(observations);
  const configuredKeys = new Set<string>();

  const primaryKey = identityKey(registry.primary.identity);
  configuredKeys.add(primaryKey);
  const sources: ProjectSourceCenterItem[] = [
    item(
      "primary",
      registry.primary.identity,
      null,
      registry.primary.local?.localPath ?? null,
      observationByIdentity.get(primaryKey),
    ),
  ];

  for (const additional of registry.additional) {
    const key = identityKey(additional.identity);
    if (configuredKeys.has(key)) throw new Error(`Duplicate configured project source identity: ${key}.`);
    configuredKeys.add(key);
    sources.push(item(
      "additional",
      additional.identity,
      additional.description,
      additional.local?.localPath ?? null,
      observationByIdentity.get(key),
    ));
  }

  for (const [key] of observationByIdentity) {
    if (!configuredKeys.has(key)) throw new Error(`Project source observation refers to an unconfigured source: ${key}.`);
  }

  return {
    schemaVersion: 1,
    projectId: registry.projectId,
    sources,
    review,
    summary: {
      sourceCount: sources.length,
      additionalSourceCount: sources.filter((source) => source.kind === "additional").length,
      remoteOnlyCount: sources.filter((source) => source.remoteState === "recorded" && source.localState === "not-linked").length,
      localCheckoutCount: sources.filter((source) => source.localState === "linked").length,
      unavailableCount: sources.filter((source) => source.reachability === "unreachable").length,
      staleCount: sources.filter((source) => source.stale).length,
      reviewAttentionCount: review?.attention.length ?? 0,
      reviewBlockerCount: review?.blockers.length ?? 0,
    },
    boundaries: {
      repositoryDescriptionIsProjectTruth: false,
      repositoryDescriptionGrantsAuthority: false,
      sourceObservationIsProjectTruth: false,
      sourceObservationGrantsAuthority: false,
      remoteIdentityIsProjectTruth: false,
      remoteIdentityGrantsAuthority: false,
      localBindingGrantsAuthority: false,
      reviewPresentationGrantsAuthority: false,
      hiddenConflictResolution: false,
      changesMade: 0,
    },
  };
}
