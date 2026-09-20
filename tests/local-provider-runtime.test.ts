import assert from "node:assert/strict";
import test from "node:test";
import { resolveLocalCli, launchWithManualPath } from "../src/connectors/local-cli-command.js";
import {
  inspectBundledLocalProvider,
  inspectCustomLocalProvider,
  type LocalProviderProbe,
} from "../src/connectors/local-provider-runtime.js";

test("windows npm Gemini shim resolves to package entry through node without shell execution", () => {
  const shim = "C:\\Users\\Robin\\AppData\\Roaming\\npm\\gemini.cmd";
  const entry = "C:\\Users\\Robin\\AppData\\Roaming\\npm\\node_modules\\@google\\gemini-cli\\bundle\\gemini.js";
  const resolved = resolveLocalCli({
    commandName: "gemini",
    platform: "win32",
    pathCandidates: [shim],
    npmPackages: [{ packagePath: ["@google", "gemini-cli"], entrypoints: ["bundle\\gemini.js"] }],
    nodeExecutable: "C:\\Livariant\\livariant-node.exe",
    fileExists: (path) => path === entry,
  });
  assert.deepEqual(resolved, {
    command: "C:\\Livariant\\livariant-node.exe",
    argsPrefix: [entry],
    source: "npm-package",
    shimPath: shim,
  });
});

test("manual shell shims fail closed", () => {
  assert.throws(() => launchWithManualPath("C:\\Users\\Robin\\bin\\provider.cmd"), /shell script shims/i);
});

test("Claude inspection uses auth status and only reports authenticated on successful auth probe", () => {
  const calls: string[][] = [];
  const probe: LocalProviderProbe = (_command, args) => {
    calls.push([...args]);
    if (args.at(-1) === "--version") return { status: 0, stdout: "2.1.220\n", stderr: "" };
    return { status: 0, stdout: '{"loggedIn":true}\n', stderr: "" };
  };
  const inspected = inspectBundledLocalProvider({
    provider: "claude",
    manualPath: "/usr/local/bin/claude",
    probe,
  });
  assert.equal(inspected.installationState, "available");
  assert.equal(inspected.authState, "authenticated");
  assert.equal(inspected.version, "2.1.220");
  assert.deepEqual(calls, [["--version"], ["auth", "status"]]);
});

test("Gemini inspection does not overclaim authenticated state from installation alone", () => {
  const inspected = inspectBundledLocalProvider({
    provider: "gemini",
    manualPath: "/usr/local/bin/gemini",
    probe: () => ({ status: 0, stdout: "0.61.0\n", stderr: "" }),
  });
  assert.equal(inspected.installationState, "available");
  assert.equal(inspected.authState, "configured");
  assert.match(inspected.detail ?? "", /verified when the user starts/i);
});

test("custom provider requires the bounded Livariant probe schema", () => {
  const ready = inspectCustomLocalProvider(
    "/opt/custom-provider",
    (_command, args) => {
      assert.deepEqual(args, ["--livariant-provider-probe"]);
      return {
        status: 0,
        stdout: JSON.stringify({ schemaVersion: 1, ready: true, displayName: "Local Bridge", version: "1.2.3" }),
        stderr: "",
      };
    },
  );
  assert.equal(ready.installationState, "available");
  assert.equal(ready.authState, "configured");
  assert.equal(ready.version, "1.2.3");

  const malformed = inspectCustomLocalProvider(
    "/opt/custom-provider",
    () => ({ status: 0, stdout: '{"ready":true}', stderr: "" }),
  );
  assert.equal(malformed.installationState, "unusable");
  assert.match(malformed.detail ?? "", /schema/i);
});
