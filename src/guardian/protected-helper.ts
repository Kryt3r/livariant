#!/usr/bin/env node

/**
 * Livariant Guardian protected helper v1 foundation.
 *
 * This helper intentionally issues NO Authority in WP-026. It exists so the
 * protected bootstrap can establish a fixed, hash-bound executable seam before
 * any semantic/runtime/release consumer is migrated to Guardian capabilities.
 */

function main(args: string[]): void {
  const [command] = args;
  if (command === "version" && args.length === 1) {
    process.stdout.write(`${JSON.stringify({
      schemaVersion: 1,
      kind: "livariant-guardian-helper",
      guardianVersion: 1,
      authorityIssuanceSupported: false,
    })}\n`);
    return;
  }

  process.stderr.write("Livariant Guardian helper v1 foundation does not issue Authority.\n");
  process.exitCode = 2;
}

main(process.argv.slice(2));
