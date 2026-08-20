import assert from "node:assert/strict";
import test from "node:test";
import {
  ancestorDirectories,
  bootstrapSourcePathAllowed,
  isProtectedPosixMode,
  productionGuardianBootstrapNodeExecutable,
  productionGuardianBootstrapSourceRoot,
} from "../src/guardian/bootstrap-source.js";

test("Guardian bootstrap source roots are fixed system locations", () => {
  assert.equal(productionGuardianBootstrapSourceRoot("linux"), "/opt/livariant/bootstrap/v1");
  assert.equal(productionGuardianBootstrapSourceRoot("win32"), "C:\\Program Files\\Livariant\\Bootstrap\\v1");
});

test("Guardian Stage-B interpreter locations are fixed protected system paths", () => {
  assert.equal(productionGuardianBootstrapNodeExecutable("linux"), "/usr/bin/node");
  assert.equal(productionGuardianBootstrapNodeExecutable("win32"), "C:\\Program Files\\nodejs\\node.exe");
});

test("requester-controlled Linux package/cache/project paths cannot qualify as bootstrap source", () => {
  assert.equal(bootstrapSourcePathAllowed("/opt/livariant/bootstrap/v1/dist/src/guardian/bootstrap.js", "linux"), true);
  assert.equal(bootstrapSourcePathAllowed("/opt/livariant/bootstrap/v1/dist/src/guardian/protected-helper.js", "linux"), true);
  assert.equal(bootstrapSourcePathAllowed("/home/user/.npm/_npx/livariant/dist/src/guardian/bootstrap.js", "linux"), false);
  assert.equal(bootstrapSourcePathAllowed("/work/project/node_modules/livariant/dist/src/guardian/bootstrap.js", "linux"), false);
  assert.equal(bootstrapSourcePathAllowed("/opt/livariant/bootstrap/v1-evil/bootstrap.js", "linux"), false);
});

test("requester-controlled Windows package/cache/project paths cannot qualify as bootstrap source", () => {
  assert.equal(bootstrapSourcePathAllowed("C:\\Program Files\\Livariant\\Bootstrap\\v1\\dist\\src\\guardian\\bootstrap.js", "win32"), true);
  assert.equal(bootstrapSourcePathAllowed("c:\\program files\\livariant\\bootstrap\\v1\\dist\\src\\guardian\\protected-helper.js", "win32"), true);
  assert.equal(bootstrapSourcePathAllowed("C:\\Users\\Robin\\AppData\\Roaming\\npm\\node_modules\\livariant\\bootstrap.js", "win32"), false);
  assert.equal(bootstrapSourcePathAllowed("D:\\project\\node_modules\\livariant\\bootstrap.js", "win32"), false);
  assert.equal(bootstrapSourcePathAllowed("C:\\Program Files\\Livariant\\Bootstrap\\v1-evil\\bootstrap.js", "win32"), false);
});

test("bootstrap interpreter protection walks every ancestor to the filesystem root", () => {
  assert.deepEqual(ancestorDirectories("/usr/bin/node", "linux"), ["/usr/bin", "/usr", "/"]);
  assert.deepEqual(
    ancestorDirectories("C:\\Program Files\\nodejs\\node.exe", "win32"),
    ["C:\\Program Files\\nodejs", "C:\\Program Files", "C:\\"],
  );
});

test("Linux bootstrap source mode forbids group/other write while allowing protected execute/read modes", () => {
  assert.equal(isProtectedPosixMode(0o755), true);
  assert.equal(isProtectedPosixMode(0o555), true);
  assert.equal(isProtectedPosixMode(0o644), true);
  assert.equal(isProtectedPosixMode(0o775), false);
  assert.equal(isProtectedPosixMode(0o757), false);
  assert.equal(isProtectedPosixMode(0o666), false);
});
