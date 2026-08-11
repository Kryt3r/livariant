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

// Current normative/accepted framework contracts that directly describe
// the active product identity or command surface. Historical reviews,
// transition records, and implementation snapshots are intentionally not
// blanket-scanned because superseded terms can be valid historical truth.
const currentContractSurfaces = [
  join(root, 'core', 'localization-policy.md'),
  join(root, 'core', 'versioning-and-migrations.md'),
  join(root, 'distribution', 'installation-and-upgrade-documentation.md'),
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

// Product naming is a current accepted decision record, but it must retain
// superseded names as historical migration evidence. Validate its current
// conclusion positively rather than forbidding historical strings.
const namingDecision = await readFile(join(root, 'distribution', 'product-naming-decision.md'), 'utf8');
const namingRequirements = [
  ['Product: Livariant', 'accepted product identity'],
  ['CLI: livariant', 'canonical CLI identity'],
  ['Package/runtime: livariant', 'canonical package/runtime identity'],
  ['Provider environment variable: LIVARIANT_PROVIDER_ENV', 'canonical provider environment variable'],
];
for (const [requiredText, label] of namingRequirements) {
  if (!namingDecision.includes(requiredText)) {
    failures.push(`distribution/product-naming-decision.md: missing-${label.replaceAll(' ', '-')} — expected current ${label}: ${requiredText}`);
  }
}

const packageJson = await readFile(join(root, 'package.json'), 'utf8');
if (/Public Preview preparation/i.test(packageJson)) {
  failures.push('package.json: preparation-state — package metadata must not describe the product as still being in Public Preview preparation');
}

if (failures.length > 0) {
  console.error('Public/current truth-surface consistency check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('\nHistorical review/evidence artifacts are intentionally outside blanket checks unless explicitly promoted to a current truth surface.');
  process.exit(1);
}

console.log(`Public/current truth-surface consistency check passed (${currentSurfaces.length} current documentation/contract surfaces + naming decision + package metadata).`);
