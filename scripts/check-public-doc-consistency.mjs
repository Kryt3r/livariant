import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import process from 'node:process';

const root = process.cwd();

async function markdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path);
  }
  return files;
}

const publicSurfaces = [
  join(root, 'README.md'),
  join(root, 'README.de.md'),
  join(root, 'CONTRIBUTING.md'),
  join(root, 'SECURITY.md'),
  join(root, 'LICENSING.md'),
  ...await markdownFiles(join(root, 'docs')),
];

// These are current normative/accepted framework contracts that directly
// describe the active product identity or command surface. Historical
// reviews and implementation snapshots are intentionally excluded.
const currentContractSurfaces = [
  join(root, 'core', 'localization-policy.md'),
  join(root, 'core', 'versioning-and-migrations.md'),
  join(root, 'distribution', 'installation-and-upgrade-documentation.md'),
  join(root, 'distribution', 'product-naming-decision.md'),
  join(root, 'project-brain', 'human-interface-and-command-surface.md'),
  join(root, 'project-brain', 'resume-context-and-session-re-entry.md'),
  join(root, 'runtime', 'minimal-runtime-and-cli-architecture.md'),
];

const currentSurfaces = [...publicSurfaces, ...currentContractSurfaces];

const rules = [
  {
    id: 'superseded-cli',
    pattern: /\bpb-dev\b/g,
    message: 'current-facing truth surfaces must not present the superseded `pb-dev` CLI as active or transitional',
  },
  {
    id: 'superseded-pb-command',
    pattern: /\bpb\s+(?:init|resume|status|doctor|update|version)\b/g,
    message: 'current command examples must use the canonical `livariant` namespace',
  },
  {
    id: 'unresolved-product-identity',
    pattern: /(?:final product (?:identity|namespace)[^\n]{0,120}(?:unresolved|later)|product identity[^\n]{0,120}(?:not fixed|not accepted|until .*accepted)|development namespace `pb`[^\n]{0,120}placeholder)/gi,
    message: 'current contracts must reflect the accepted Livariant product/CLI identity',
  },
  {
    id: 'preparation-state',
    pattern: /Public Preview preparation/gi,
    message: 'current-facing documentation must describe the current Preview state, not preparation-state wording',
  },
  {
    id: 'obsolete-livariant-license',
    pattern: /Livariant[^\n]{0,120}(?:licensed|license)[^\n]{0,80}Apache-2\.0/gi,
    message: 'Livariant is PolyForm Perimeter 1.0.1 source-available, not Apache-2.0',
  },
];

const failures = [];
for (const file of currentSurfaces) {
  const content = await readFile(file, 'utf8');
  for (const rule of rules) {
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(content)) {
      failures.push(`${relative(root, file)}: ${rule.id} — ${rule.message}`);
    }
  }
}

const packageJson = await readFile(join(root, 'package.json'), 'utf8');
if (/Public Preview preparation/i.test(packageJson)) {
  failures.push('package.json: preparation-state — package metadata must not describe the product as still being in Public Preview preparation');
}

if (failures.length > 0) {
  console.error('Public/current truth-surface consistency check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('\nHistorical review/evidence artifacts are intentionally outside this check unless explicitly promoted to a current truth surface.');
  process.exit(1);
}

console.log(`Public/current truth-surface consistency check passed (${currentSurfaces.length} current documentation/contract surfaces + package metadata).`);
