export type ConnectorLifecycleState =
  | "disconnected"
  | "configured"
  | "connected"
  | "disabled"
  | "error";

export type ConnectorCapabilityState = "available" | "unknown" | "unavailable";

export type ConnectorProvenance = "framework-bundled" | "custom";

export interface ConnectorDefinition {
  typeId: string;
  displayName: string;
  version: string;
  provenance: ConnectorProvenance;
  declaredCapabilities: readonly string[];
}

export interface ConnectorCredentialReference {
  kind: "local-handle";
  id: string;
}

export interface ConnectorInstance {
  instanceId: string;
  connectorTypeId: string;
  label: string;
  state: ConnectorLifecycleState;
  observedCapabilities: Readonly<Record<string, ConnectorCapabilityState>>;
  roles: readonly string[];
  credential?: ConnectorCredentialReference;
}

const IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9._:-]*$/i;

function requireText(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${field} must not be blank.`);
  }
}

function requireIdentifier(value: string, field: string): void {
  requireText(value, field);
  if (!IDENTIFIER_PATTERN.test(value)) {
    throw new Error(`${field} contains unsupported characters.`);
  }
}

function ensureUnique(values: readonly string[], field: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`${field} must not contain duplicates.`);
  }
}

export function validateConnectorDefinition(definition: ConnectorDefinition): void {
  requireIdentifier(definition.typeId, "connector type id");
  requireText(definition.displayName, "connector display name");
  requireText(definition.version, "connector version");

  if (definition.provenance !== "framework-bundled" && definition.provenance !== "custom") {
    throw new Error("connector provenance is invalid.");
  }

  ensureUnique(definition.declaredCapabilities, "declared capabilities");
  for (const capability of definition.declaredCapabilities) {
    requireIdentifier(capability, "connector capability");
  }
}

export function validateConnectorInstance(
  instance: ConnectorInstance,
  definition: ConnectorDefinition,
): void {
  requireIdentifier(instance.instanceId, "connector instance id");
  requireText(instance.label, "connector instance label");

  if (instance.connectorTypeId !== definition.typeId) {
    throw new Error("connector instance type does not match its definition.");
  }

  if (!(["disconnected", "configured", "connected", "disabled", "error"] as const).includes(instance.state)) {
    throw new Error("connector lifecycle state is invalid.");
  }

  ensureUnique(instance.roles, "connector roles");
  for (const role of instance.roles) {
    requireIdentifier(role, "connector role");
  }

  const declared = new Set(definition.declaredCapabilities);
  for (const [capability, state] of Object.entries(instance.observedCapabilities)) {
    if (!declared.has(capability)) {
      throw new Error(`observed capability '${capability}' was not declared by connector '${definition.typeId}'.`);
    }
    if (state !== "available" && state !== "unknown" && state !== "unavailable") {
      throw new Error(`observed capability '${capability}' has an invalid state.`);
    }
  }

  if (instance.credential !== undefined) {
    if (instance.credential.kind !== "local-handle") {
      throw new Error("connector credential reference kind is invalid.");
    }
    requireIdentifier(instance.credential.id, "connector credential handle");
  }
}

function cloneDefinition(definition: ConnectorDefinition): ConnectorDefinition {
  return {
    ...definition,
    declaredCapabilities: [...definition.declaredCapabilities],
  };
}

function cloneInstance(instance: ConnectorInstance): ConnectorInstance {
  return {
    ...instance,
    observedCapabilities: { ...instance.observedCapabilities },
    roles: [...instance.roles],
    credential: instance.credential === undefined ? undefined : { ...instance.credential },
  };
}

export class ConnectorRegistry {
  readonly #definitions = new Map<string, ConnectorDefinition>();
  readonly #instances = new Map<string, ConnectorInstance>();

  registerDefinition(definition: ConnectorDefinition): void {
    validateConnectorDefinition(definition);
    if (this.#definitions.has(definition.typeId)) {
      throw new Error(`connector definition '${definition.typeId}' already exists.`);
    }
    this.#definitions.set(definition.typeId, cloneDefinition(definition));
  }

  registerInstance(instance: ConnectorInstance): void {
    if (this.#instances.has(instance.instanceId)) {
      throw new Error(`connector instance '${instance.instanceId}' already exists.`);
    }

    const definition = this.#definitions.get(instance.connectorTypeId);
    if (definition === undefined) {
      throw new Error(`connector definition '${instance.connectorTypeId}' is not registered.`);
    }

    validateConnectorInstance(instance, definition);
    this.#instances.set(instance.instanceId, cloneInstance(instance));
  }

  getDefinition(typeId: string): ConnectorDefinition | undefined {
    const definition = this.#definitions.get(typeId);
    return definition === undefined ? undefined : cloneDefinition(definition);
  }

  getInstance(instanceId: string): ConnectorInstance | undefined {
    const instance = this.#instances.get(instanceId);
    return instance === undefined ? undefined : cloneInstance(instance);
  }

  listInstances(): ConnectorInstance[] {
    return [...this.#instances.values()]
      .map(cloneInstance)
      .sort((left, right) => left.instanceId.localeCompare(right.instanceId));
  }

  replaceInstance(instance: ConnectorInstance): void {
    if (!this.#instances.has(instance.instanceId)) {
      throw new Error(`connector instance '${instance.instanceId}' is not registered.`);
    }

    const definition = this.#definitions.get(instance.connectorTypeId);
    if (definition === undefined) {
      throw new Error(`connector definition '${instance.connectorTypeId}' is not registered.`);
    }

    validateConnectorInstance(instance, definition);
    this.#instances.set(instance.instanceId, cloneInstance(instance));
  }

  disconnect(instanceId: string): ConnectorInstance {
    const current = this.#requireInstance(instanceId);
    const disconnectedCapabilities = Object.fromEntries(
      Object.keys(current.observedCapabilities).map((capability) => [capability, "unknown" as const]),
    );
    const disconnected: ConnectorInstance = {
      ...current,
      state: "disconnected",
      observedCapabilities: disconnectedCapabilities,
      credential: undefined,
    };
    this.replaceInstance(disconnected);
    return cloneInstance(disconnected);
  }

  listUsable(options: { capability?: string; role?: string } = {}): ConnectorInstance[] {
    return this.listInstances().filter((instance) => {
      if (instance.state !== "connected") {
        return false;
      }
      if (options.capability !== undefined && instance.observedCapabilities[options.capability] !== "available") {
        return false;
      }
      if (options.role !== undefined && !instance.roles.includes(options.role)) {
        return false;
      }
      return true;
    });
  }

  #requireInstance(instanceId: string): ConnectorInstance {
    const instance = this.#instances.get(instanceId);
    if (instance === undefined) {
      throw new Error(`connector instance '${instanceId}' is not registered.`);
    }
    return cloneInstance(instance);
  }
}
