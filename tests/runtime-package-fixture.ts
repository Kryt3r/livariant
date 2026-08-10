import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface RuntimePackageFixture {
  path: string;
  sha256: string;
  cleanup(): Promise<void>;
}

export async function createRuntimePackageFixture(version: string): Promise<RuntimePackageFixture> {
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

  const result = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["pack", "--json", "--pack-destination", packRoot],
    { cwd: packageRoot, encoding: "utf8", shell: false },
  );
  if (result.status !== 0) throw new Error(`Failed to build runtime release fixture: ${result.stderr || result.stdout}`);
  const packed = JSON.parse(result.stdout) as Array<{ filename?: unknown }>;
  const filename = packed[0]?.filename;
  if (typeof filename !== "string") throw new Error("Runtime fixture pack did not return a tarball filename.");
  const path = resolve(packRoot, filename);
  const sha256 = createHash("sha256").update(await readFile(path)).digest("hex");

  return {
    path,
    sha256,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}
