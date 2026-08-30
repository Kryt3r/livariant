import assert from "node:assert/strict";
import test from "node:test";
import {
  ConnectorRegistry,
  type ConnectorDefinition,
  type ConnectorInstance,
  validateConnectorInstance,
} from "../src/connectors/connector-registry.js";

const definition: ConnectorDefinition = {
  typeId: "livariant.example.agent",
  displayName: "Example Agent",
  version: "1",
  provenance: "framework-bundled",
  declaredCapabilities: [
    "resume.context.project",
    "task.execute",
    "telemetry.usage.provider-owned",
  ],
};

function instance(overrides: Partial<ConnectorInstance> = {}): ConnectorInstance {
  return {
    instanceId: "example-primary",
    connectorTypeId: definition.typeId,
    label: "Primary Example Agent",
    state: "connected",
    observedCapabilities: {
      "resume.context.project": "available",
      "task.execute": "available",
      "telemetry.usage.provider-owned": "unknown",
    },
    roles: ["primary-execution"],
    credential: { kind: "local-handle", id: "credentials.example-primary" },
    ...overrides,
  };
}

test("registry supports multiple providers and multiple instances of one connector type", () => {
  const registry = new ConnectorRegistry();
  registry.registerDefinition(definition);
  registry.registerDefinition({
    typeId: "custom.local.agent",
    displayName: "Local Agent",
    version: "2026.08",
    provenance: "custom",
    declaredCapabilities: ["task.execute"],
  });

  registry.registerInstance(instance());
  registry.registerInstance(instance({
    instanceId: "example-review",
    label: "Review Example Agent",
    roles: ["independent-review"],
  }));
  registry.registerInstance({
    instanceId: "local-classifier",
    connectorTypeId: "custom.local.agent",
    label: "Local Classifier",
    state: "configured",
    observedCapabilities: { "task.execute": "unknown" },
    roles: ["classification"],
  });

  assert.deepEqual(
    registry.listInstances().map((entry) => entry.instanceId),
    ["example-primary", "example-review", "local-classifier"],
  );
});

test("usable selection requires connected state plus observed capability and optional role", () => {
  const registry = new ConnectorRegistry();
  registry.registerDefinition(definition);
  registry.registerInstance(instance());
  registry.registerInstance(instance({
    instanceId: "review-only",
    label: "Review Only",
    roles: ["independent-review"],
    observedCapabilities: {
      "resume.context.project": "available",
      "task.execute": "unavailable",
      "telemetry.usage.provider-owned": "available",
    },
  }));
  registry.registerInstance(instance({
    instanceId: "disabled-primary",
    label: "Disabled Primary",
    state: "disabled",
  }));

  assert.deepEqual(
    registry.listUsable({ capability: "task.execute" }).map((entry) => entry.instanceId),
    ["example-primary"],
  );
  assert.deepEqual(
    registry.listUsable({ role: "independent-review" }).map((entry) => entry.instanceId),
    ["review-only"],
  );
  assert.deepEqual(
    registry.listUsable({ capability: "telemetry.usage.provider-owned" }).map((entry) => entry.instanceId),
    ["review-only"],
  );
});

test("declared capability is not silently upgraded to observed availability", () => {
  const registry = new ConnectorRegistry();
  registry.registerDefinition(definition);
  registry.registerInstance(instance({
    observedCapabilities: {
      "resume.context.project": "available",
      "task.execute": "unknown",
      "telemetry.usage.provider-owned": "unknown",
    },
  }));

  assert.equal(registry.listUsable({ capability: "task.execute" }).length, 0);
});

test("undeclared observed capabilities fail closed", () => {
  assert.throws(
    () => validateConnectorInstance(
      instance({
        observedCapabilities: {
          "resume.context.project": "available",
          "task.execute": "available",
          "telemetry.usage.provider-owned": "unknown",
          "authority.project.write": "available",
        },
      }),
      definition,
    ),
    /was not declared/i,
  );
});

test("disconnect removes the credential handle and invalidates observed availability", () => {
  const registry = new ConnectorRegistry();
  registry.registerDefinition(definition);
  registry.registerInstance(instance());

  const disconnected = registry.disconnect("example-primary");

  assert.equal(disconnected.state, "disconnected");
  assert.equal(disconnected.credential, undefined);
  assert.deepEqual(disconnected.observedCapabilities, {
    "resume.context.project": "unknown",
    "task.execute": "unknown",
    "telemetry.usage.provider-owned": "unknown",
  });
  assert.equal(registry.listUsable().length, 0);
});

test("duplicate instance identity and raw secret-shaped credential data are not accepted by the contract", () => {
  const registry = new ConnectorRegistry();
  registry.registerDefinition(definition);
  registry.registerInstance(instance());

  assert.throws(() => registry.registerInstance(instance()), /already exists/i);

  const malformed = {
    ...instance({ instanceId: "secret-bearing" }),
    credential: { kind: "raw-token", id: "secret-value" },
  } as unknown as ConnectorInstance;

  assert.throws(() => validateConnectorInstance(malformed, definition), /credential reference kind/i);
});
