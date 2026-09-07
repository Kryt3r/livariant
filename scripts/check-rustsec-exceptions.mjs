import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const exceptionsPath = join(repoRoot, "security", "rustsec-exceptions.json");
const auditConfigPath = join(repoRoot, "apps", "desktop", "src-tauri", ".cargo", "audit.toml");
const cargoLockPath = join(repoRoot, "apps", "desktop", "src-tauri", "Cargo.lock");
const rustSourceRoot = join(repoRoot, "apps", "desktop", "src-tauri", "src");

function fail(message) {
  throw new Error(message);
}

function parseIsoDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) fail(`${label} must use YYYY-MM-DD.`);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) fail(`${label} is not a valid date.`);
  return parsed;
}

function collectRustFiles(directory, output = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) collectRustFiles(fullPath, output);
    else if (entry.isFile() && entry.name.endsWith(".rs")) output.push(fullPath);
  }
  return output;
}

const register = JSON.parse(readFileSync(exceptionsPath, "utf8"));
if (register.schemaVersion !== 1) fail("Unsupported RustSec exception register schemaVersion.");
if (!Array.isArray(register.exceptions) || register.exceptions.length !== 1) {
  fail("RustSec exception register must contain exactly the currently reviewed exception.");
}

const exception = register.exceptions[0];
if (exception.id !== "RUSTSEC-2024-0429") fail("Unexpected RustSec advisory exception id.");
if (exception.package !== "glib") fail("RUSTSEC-2024-0429 exception must remain bound to glib.");
if (exception.status !== "upstream-blocked") fail("RustSec exception status changed without review.");
if (exception.directAffectedApiUsageAllowed !== false) fail("Direct affected API usage must remain prohibited.");
if (exception.affectedApi !== "VariantStrIter") fail("Affected API binding changed without review.");

const reviewBy = parseIsoDate(exception.reviewBy, "reviewBy");
const now = new Date();
const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
if (todayUtc >= reviewBy) {
  fail(`RustSec exception ${exception.id} reached its review deadline ${exception.reviewBy}. Reassess upstream and remove or explicitly renew the exception.`);
}

const auditConfig = readFileSync(auditConfigPath, "utf8");
const ignoredIds = [...auditConfig.matchAll(/RUSTSEC-\d{4}-\d{4}/gu)].map((match) => match[0]);
const uniqueIgnoredIds = [...new Set(ignoredIds)];
if (uniqueIgnoredIds.length !== 1 || uniqueIgnoredIds[0] !== exception.id) {
  fail("audit.toml may ignore only the currently reviewed RUSTSEC-2024-0429 exception.");
}

const cargoLock = readFileSync(cargoLockPath, "utf8");
const glibMatch = cargoLock.match(/\[\[package\]\]\s+name = "glib"\s+version = "([^"]+)"/u);
if (!glibMatch) fail("Cargo.lock does not contain the expected glib package entry.");
const observedVersion = glibMatch[1];
if (observedVersion !== exception.observedVersion) {
  fail(`glib changed from reviewed version ${exception.observedVersion} to ${observedVersion}. Reassess the exception before continuing.`);
}
if (/^(?:0\.(?:2\d|[3-9]\d)|[1-9]\d*)\./u.test(observedVersion)) {
  fail(`glib ${observedVersion} is no longer in the reviewed vulnerable generation. Remove the exception and rerun cargo audit without it.`);
}

for (const file of collectRustFiles(rustSourceRoot)) {
  const source = readFileSync(file, "utf8");
  if (source.includes(exception.affectedApi)) {
    fail(`Direct use of affected API ${exception.affectedApi} is prohibited while ${exception.id} is excepted: ${file}`);
  }
}

process.stdout.write(`RustSec exception ${exception.id} remains bounded to glib ${observedVersion}; review required before ${exception.reviewBy}.\n`);
