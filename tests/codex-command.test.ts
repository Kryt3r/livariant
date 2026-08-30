import assert from "node:assert/strict";
import test from "node:test";
import { resolveCodexCommand } from "../src/connectors/codex-command.js";

test("non-Windows Codex resolution keeps the direct path command", () => {
  assert.deepEqual(resolveCodexCommand({ platform: "linux" }), {
    command: "codex",
    source: "path-command",
  });
});

test("Windows prefers a real Codex executable without a shell", () => {
  const executable = "C:\\Tools\\codex.exe";
  assert.deepEqual(resolveCodexCommand({
    platform: "win32",
    arch: "x64",
    pathCandidates: ["C:\\Users\\Robin\\AppData\\Roaming\\npm\\codex.cmd", executable],
    fileExists: (path) => path === executable,
  }), {
    command: executable,
    source: "native-executable",
  });
});

test("Windows rejects an arbitrary executable as a native Codex candidate", () => {
  const executable = "C:\\Windows\\System32\\notepad.exe";
  assert.equal(resolveCodexCommand({
    platform: "win32",
    arch: "x64",
    pathCandidates: [executable],
    fileExists: (path) => path === executable,
  }), undefined);
});

test("Windows resolves the official npm Codex cmd shim to its native optional-dependency binary", () => {
  const shim = "C:\\Users\\Robin\\AppData\\Roaming\\npm\\codex.cmd";
  const native = "C:\\Users\\Robin\\AppData\\Roaming\\npm\\node_modules\\@openai\\codex-win32-x64\\vendor\\x86_64-pc-windows-msvc\\bin\\codex.exe";
  const resolution = resolveCodexCommand({
    platform: "win32",
    arch: "x64",
    pathCandidates: [shim],
    fileExists: (path) => path.toLowerCase() === native.toLowerCase(),
  });
  assert.deepEqual(resolution, {
    command: native,
    source: "npm-native-package",
    shimPath: shim,
  });
});

test("Windows resolves an extensionless npm Codex shim to the nested native package without a shell", () => {
  const shim = "C:\\Users\\Robin\\AppData\\Roaming\\npm\\codex";
  const native = "C:\\Users\\Robin\\AppData\\Roaming\\npm\\node_modules\\@openai\\codex\\node_modules\\@openai\\codex-win32-x64\\vendor\\x86_64-pc-windows-msvc\\bin\\codex.exe";
  const resolution = resolveCodexCommand({
    platform: "win32",
    arch: "x64",
    pathCandidates: [shim],
    fileExists: (path) => path.toLowerCase() === native.toLowerCase(),
  });
  assert.deepEqual(resolution, {
    command: native,
    source: "npm-native-package",
    shimPath: shim,
  });
});

test("Windows fails closed when only an unresolved command shim is present", () => {
  assert.equal(resolveCodexCommand({
    platform: "win32",
    arch: "x64",
    pathCandidates: [
      "C:\\Users\\Robin\\AppData\\Roaming\\npm\\codex",
      "C:\\Users\\Robin\\AppData\\Roaming\\npm\\codex.cmd",
    ],
    fileExists: () => false,
  }), undefined);
});
