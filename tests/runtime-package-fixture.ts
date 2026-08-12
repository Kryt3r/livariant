import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface RuntimePackageFixture {
  path: string;
  sha256: string;
  cleanup(): Promise<void>;
}

function runNpmPack(packageRoot: string, packRoot: string) {
  const npmArgs = ["pack", "--json", "--pack-destination", packRoot];
  const result = process.platform === "win32"
    ? spawnSync(
        process.execPath,
        [resolve(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"), ...npmArgs],
        { cwd: packageRoot, encoding: "utf8", shell: false },
      )
    : spawnSync("npm", npmArgs, {
        cwd: packageRoot,
        encoding: "utf8",
        shell: false,
      });

  if (result.error || result.status !== 0) {
    const detail =
      result.error?.message ||
      result.stderr ||
      result.stdout ||
      `npm pack exited with status ${String(result.status)}`;
    throw new Error(`Failed to build runtime release fixture: ${detail}`);
  }

  return result.stdout;
}

export async function provisionArtifactAuthorizationForTest(artifactSha256: string): Promise<void> {
  if (!/^[a-f0-9]{64}$/i.test(artifactSha256)) throw new Error("test artifact authorization requires a valid SHA-256 digest");
  const digest = artifactSha256.toLowerCase();
  const root = resolve(userInfo().homedir, ".livariant", "trust", "release-authorizations");
  await mkdir(root, { recursive: true });
  const path = resolve(root, `${digest}.json`);
  const temporaryPath = resolve(root, `.${digest}.${process.pid}.${randomUUID()}.tmp`);
  const payload = `${JSON.stringify({
    schema: 1,
    packageName: "livariant",
    kind: "artifact-digest-authorization",
    artifactSha256: digest,
  }, null, 2)}\n`;

  await writeFile(temporaryPath, payload, { encoding: "utf8", flag: "wx" });
  try {
    await rename(temporaryPath, path);
  } catch (error) {
    const code = error instanceof Error && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
    if (code !== "EEXIST" && code !== "EPERM" && code !== "EACCES") throw error;

    const existing = await readFile(path, "utf8");
    if (existing !== payload) {
      throw new Error("Existing test release authorization does not match the expected complete payload.");
    }
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export async function createRuntimePackageFixture(version: string, options: { authorize?: boolean } = {}): Promise<RuntimePackageFixture> {
  const root = await mkdtemp(resolve(tmpdir(), "livariant-runtime-release-fixture-"));
  const packageRoot = resolve(root, "package");
  const packRoot = resolve(root, "pack");
  await mkdir(resolve(packageRoot, "dist"), { recursive: true });
  await mkdir(packRoot, { recursive: true });

  const compiledSrc = fileURLToPath(new URL("../src", import.meta.url));
  await cp(compiledSrc, resolve(packageRoot, "dist", "src"), { recursive: true });
  await writeFile(resolve(packageRoot, "package.json"), `${JSON.stringify({
    name: "livariant",
    version,
    type: "module",
    bin: { livariant: "./dist/src/cli/index.js" },
    files: ["dist/src"],
    engines: { node: ">=20" },
  }, null, 2)}\n`, "utf8");

  const packed = JSON.parse(runNpmPack(packageRoot, packRoot)) as Array<{ filename?: unknown }>;
  const filename = packed[0]?.filename;
  if (typeof filename !== "string") throw new Error("Runtime fixture pack did not return a tarball filename.");
  const path = resolve(packRoot, filename);
  const sha256 = createHash("sha256").update(await readFile(path)).digest("hex");
  if (options.authorize !== false) await provisionArtifactAuthorizationForTest(sha256);

  return {
    path,
    sha256,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}
