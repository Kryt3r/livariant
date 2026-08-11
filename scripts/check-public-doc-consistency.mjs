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

const currentSurfaces = [
  join(root, 'README.md'),
  join(root, 'README.de.md'),
  join(root, 'CONTRIBUTING.md'),
  join(root, 'SECURITY.md'),
  join(root, 'LICENSING.md'),
  ...await markdownFiles(join(root, 'docs')),
];

const rules = [
  {
    id: 'superseded-cli',
    pattern: /\bpb-dev\b/g,
    message: 'current-facing documentation must use the canonical `livariant` CLI',
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
  console.error('Public truth-surface consistency check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('\nHistorical/internal records are intentionally outside this check.');
  process.exit(1);
}

console.log(`Public truth-surface consistency check passed (${currentSurfaces.length} current documentation surfaces + package metadata).`);
