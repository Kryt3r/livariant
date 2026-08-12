import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { assertReleaseAuthorized } from "../src/distribution/release-authorization.js";
import type { ReleaseIdentity } from "../src/distribution/release-integrity.js";
import { provisionArtifactAuthorizationForTest } from "./runtime-package-fixture.js";

function uniqueDigest(): string {
  return createHash("sha256").update(randomUUID()).digest("hex");
}

function authorizationPath(digest: string): string {
  return resolve(userInfo().homedir, ".livariant", "trust", "release-authorizations", `${digest}.json`);
}

test("parallel test authorization provisioning never exposes partial JSON", async () => {
  const digest = uniqueDigest();
  const path = authorizationPath(digest);
  try {
    await Promise.all(Array.from({ length: 24 }, () => provisionArtifactAuthorizationForTest(digest)));
    const parsed = JSON.parse(await readFile(path, "utf8")) as {
      schema?: unknown;
      packageName?: unknown;
      kind?: unknown;
      artifactSha256?: unknown;
    };
    assert.deepEqual(parsed, {
      schema: 1,
      packageName: "livariant",
      kind: "artifact-digest-authorization",
      artifactSha256: digest,
    });
  } finally {
    await rm(path, { force: true });
  }
});

test("malformed machine-local authorization fails closed without leaking JSON parse errors", async () => {
  const project = await mkdtemp(resolve(tmpdir(), "livariant-release-auth-malformed-"));
  const digest = uniqueDigest();
  const path = authorizationPath(digest);
  await mkdir(resolve(userInfo().homedir, ".livariant", "trust", "release-authorizations"), { recursive: true });
  await writeFile(path, "{", "utf8");

  const identity: ReleaseIdentity = {
    version: "0.1.0-test",
    channel: "preview",
    sourceId: "test-source",
    artifactId: "runtime-node-cli",
    artifactSha256: digest,
  };

  try {
    await assert.rejects(
      () => assertReleaseAuthorized(project, identity),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.notEqual(error.name, "SyntaxError");
        assert.match(error.message, /malformed or unreadable/i);
        return true;
      },
    );
  } finally {
    await rm(path, { force: true });
    await rm(project, { recursive: true, force: true });
  }
});
