import assert from "node:assert/strict";
import test from "node:test";
import { resolveCodexCommand } from "../src/connectors/codex-command.js";

test("non-Windows Codex resolution keeps the direct path command", () => {
  assert.deepEqual(resolveCodexCommand({ platform: "linux" }), {
    command: "codex",
    argsPrefix: [],
    source: "path-command",
  });
});

test("Windows prefers an official standalone Codex install even when PATH exposes only a shim", () => {
  const standalone = "C:\\Users\\Robin\\AppData\\Local\\Programs\\OpenAI\\Codex\\bin\\codex.exe";
  assert.deepEqual(resolveCodexCommand({
    platform: "win32",
    arch: "x64",
    pathCandidates: ["C:\\Users\\Robin\\AppData\\Roaming\\npm\\codex.cmd"],
    env: { LOCALAPPDATA: "C:\\Users\\Robin\\AppData\\Local" },
    fileExists: (path) => path.toLowerCase() === standalone.toLowerCase(),
  }), {
    command: standalone,
    argsPrefix: [],
    source: "native-executable",
  });
});

test("Windows resolves the actual npm Codex package entry from the shim without invoking cmd.exe", () => {
  const shim = "D:\\Tools\\global-bin\\codex.cmd";
  const entry = "D:\\Tools\\runtime\\node_modules\\@openai\\codex\\bin\\codex.js";
  const node = "C:\\Program Files\\Livariant\\livariant-node.exe";
  const shimContent = '@ECHO off\r\n"%dp0%\\..\\runtime\\node_modules\\@openai\\codex\\bin\\codex.js" %*\r\n';
  const existing = new Set([shim.toLowerCase(), entry.toLowerCase()]);
  assert.deepEqual(resolveCodexCommand({
    platform: "win32",
    arch: "x64",
    pathCandidates: [shim],
    nodeExecutable: node,
    fileExists: (path) => existing.has(path.toLowerCase()),
    readTextFile: (path) => path === shim ? shimContent : "",
    env: {},
  }), {
    command: node,
    argsPrefix: [entry],
    source: "npm-package",
    shimPath: shim,
  });
});

test("Windows keeps compatibility with older known npm native layouts", () => {
  const shim = "C:\\Users\\Robin\\AppData\\Roaming\\npm\\codex.cmd";
  const native = "C:\\Users\\Robin\\AppData\\Roaming\\npm\\node_modules\\@openai\\codex\\node_modules\\@openai\\codex-win32-x64\\vendor\\x86_64-pc-windows-msvc\\codex\\codex.exe";
  const resolution = resolveCodexCommand({
    platform: "win32",
    arch: "x64",
    pathCandidates: [shim],
    fileExists: (path) => path.toLowerCase() === native.toLowerCase(),
    readTextFile: () => "",
    env: {},
  });
  assert.deepEqual(resolution, {
    command: native,
    argsPrefix: [],
    source: "npm-native-package",
    shimPath: shim,
  });
});

test("Windows rejects an arbitrary executable as a native Codex candidate", () => {
  const executable = "C:\\Windows\\System32\\notepad.exe";
  assert.equal(resolveCodexCommand({
    platform: "win32",
    arch: "x64",
    pathCandidates: [executable],
    fileExists: (path) => path === executable,
    env: {},
  }), undefined);
});

test("Windows fails closed when only an unresolved command shim is present", () => {
  assert.equal(resolveCodexCommand({
    platform: "win32",
    arch: "x64",
    pathCandidates: ["C:\\Users\\Robin\\AppData\\Roaming\\npm\\codex.cmd"],
    fileExists: (path) => path.toLowerCase().endsWith("codex.cmd"),
    readTextFile: () => "@echo off\r\nnode missing.js %*\r\n",
    env: {},
  }), undefined);
});
