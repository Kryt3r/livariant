import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  PROTECTED_BOOTSTRAP_RELEASE_DESCRIPTOR,
  verifyProtectedBootstrapReleaseDescriptor,
} from "../src/guardian/bootstrap-release.js";

const SOURCE_SHA = "0123456789abcdef0123456789abcdef01234567";

function sha256(bytes: string | Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), "livariant-protected-bootstrap-release-"));
  const files = new Map<string, string>([
    ["dist/src/guardian/bootstrap.js", "export const bootstrap = true;\n"],
    ["dist/src/guardian/protected-helper.js", "export const helper = true;\n"],
    ["guardian-bootstrap-entry.mjs", "console.log('bootstrap');\n"],
  ]);
  for (const [relative, bytes] of files) {
    const path = resolve(root, ...relative.split("/"));
    await mkdir(resolve(path, ".."), { recursive: true });
    await writeFile(path, bytes, "utf8");
  }
  const descriptor = {
    schemaVersion: 1,
    kind: "livariant-protected-bootstrap-release",
    version: "0.1.0-rc.5",
    channel: "preview",
    sourceId: "github:Kryt3r/livariant",
    sourceSha: SOURCE_SHA,
    files: [...files].map(([path, bytes]) => ({ path, sha256: sha256(bytes) })),
  };
  await writeFile(resolve(root, PROTECTED_BOOTSTRAP_RELEASE_DESCRIPTOR), `${JSON.stringify(descriptor, null, 2)}\n`, "utf8");
  return { root, descriptor };
}

async function rewriteDescriptor(root: string, mutate: (value: any) => void): Promise<void> {
  const path = resolve(root, PROTECTED_BOOTSTRAP_RELEASE_DESCRIPTOR);
  const parsed = JSON.parse(await readFile(path, "utf8"));
  mutate(parsed);
  await writeFile(path, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
}

test("protected bootstrap descriptor binds required exact release files", async () => {
  const { root } = await fixture();
  try {
    const result = await verifyProtectedBootstrapReleaseDescriptor(root);
    assert.equal(result.descriptor.version, "0.1.0-rc.5");
    assert.equal(result.descriptor.sourceSha, SOURCE_SHA);
    assert.equal(result.descriptor.sourceId, "github:Kryt3r/livariant");
    assert.equal(result.descriptor.files.length, 3);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("protected bootstrap descriptor rejects tampered protected bytes", async () => {
  const { root } = await fixture();
  try {
    await writeFile(resolve(root, "dist", "src", "guardian", "bootstrap.js"), "attacker-controlled\n", "utf8");
    await assert.rejects(
      verifyProtectedBootstrapReleaseDescriptor(root),
      /digest mismatch.*dist\/src\/guardian\/bootstrap\.js/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("protected bootstrap descriptor rejects traversal and duplicate paths", async () => {
  const traversal = await fixture();
  try {
    await rewriteDescriptor(traversal.root, (descriptor) => {
      descriptor.files[0].path = "../outside.js";
    });
    await assert.rejects(verifyProtectedBootstrapReleaseDescriptor(traversal.root), /file path is unsafe/i);
  } finally {
    await rm(traversal.root, { recursive: true, force: true });
  }

  const duplicate = await fixture();
  try {
    await rewriteDescriptor(duplicate.root, (descriptor) => {
      descriptor.files[1].path = descriptor.files[0].path;
      descriptor.files[1].sha256 = descriptor.files[0].sha256;
    });
    await assert.rejects(verifyProtectedBootstrapReleaseDescriptor(duplicate.root), /duplicate file path/i);
  } finally {
    await rm(duplicate.root, { recursive: true, force: true });
  }
});

test("protected bootstrap descriptor rejects missing required release material", async () => {
  const { root } = await fixture();
  try {
    await rewriteDescriptor(root, (descriptor) => {
      descriptor.files = descriptor.files.filter((item: { path: string }) => item.path !== "guardian-bootstrap-entry.mjs");
    });
    await assert.rejects(verifyProtectedBootstrapReleaseDescriptor(root), /missing required file: guardian-bootstrap-entry\.mjs/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("protected bootstrap descriptor rejects schema expansion and invalid source identity", async () => {
  const schema = await fixture();
  try {
    await rewriteDescriptor(schema.root, (descriptor) => {
      descriptor.attacker = true;
    });
    await assert.rejects(verifyProtectedBootstrapReleaseDescriptor(schema.root), /unsupported field/i);
  } finally {
    await rm(schema.root, { recursive: true, force: true });
  }

  const source = await fixture();
  try {
    await rewriteDescriptor(source.root, (descriptor) => {
      descriptor.sourceSha = "not-a-source-sha";
    });
    await assert.rejects(verifyProtectedBootstrapReleaseDescriptor(source.root), /source SHA is invalid/i);
  } finally {
    await rm(source.root, { recursive: true, force: true });
  }
});

test("protected bootstrap descriptor rejects symlink substitution where supported", { skip: process.platform === "win32" }, async () => {
  const { root } = await fixture();
  try {
    const target = resolve(root, "attacker-bootstrap.js");
    const protectedPath = resolve(root, "dist", "src", "guardian", "bootstrap.js");
    await writeFile(target, "export const bootstrap = true;\n", "utf8");
    await rm(protectedPath);
    await symlink(target, protectedPath);
    await assert.rejects(verifyProtectedBootstrapReleaseDescriptor(root), /regular non-symlink file/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
