#!/usr/bin/env node
// Verifies that EVENT_TYPES in backend/src/modules/events/events.schema.ts
// and tracking-snippet/src/tracker.ts are byte-for-byte the same set.
//
// These two files are the only place that list is written, in two
// independently-deployed projects (see README's architecture note) that
// cannot share a real workspace package without touching Render's and
// Vercel's dashboard-configured root directories — a live-deploy risk out
// of proportion to this fix. Both files already carry a comment asking a
// human to keep them in sync; nothing enforced it. This script is that
// enforcement: it runs in CI (.github/workflows/ci.yml) on every push/PR,
// so drift is a failed check, not a silent bug shipped to production.
//
// No dependencies, no TypeScript compilation — reads the source text
// directly and extracts the array literal, since both files declare it in
// the identical `EVENT_TYPES = [ ...quoted strings... ] as const;` shape.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

const BACKEND_FILE = path.join(
  repoRoot,
  'backend/src/modules/events/events.schema.ts',
);
const SNIPPET_FILE = path.join(repoRoot, 'tracking-snippet/src/tracker.ts');

function extractEventTypes(source, filePath) {
  const match = source.match(/EVENT_TYPES\s*=\s*\[([\s\S]*?)\]\s*as const/);
  if (!match) {
    throw new Error(`Could not find "EVENT_TYPES = [...] as const" in ${filePath}`);
  }

  const items = [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  if (items.length === 0) {
    throw new Error(`Found EVENT_TYPES in ${filePath} but parsed zero entries`);
  }
  return items;
}

async function main() {
  const [backendSource, snippetSource] = await Promise.all([
    readFile(BACKEND_FILE, 'utf8'),
    readFile(SNIPPET_FILE, 'utf8'),
  ]);

  const backendTypes = extractEventTypes(backendSource, BACKEND_FILE);
  const snippetTypes = extractEventTypes(snippetSource, SNIPPET_FILE);

  const backendSet = new Set(backendTypes);
  const snippetSet = new Set(snippetTypes);

  const onlyInBackend = backendTypes.filter((t) => !snippetSet.has(t));
  const onlyInSnippet = snippetTypes.filter((t) => !backendSet.has(t));
  const orderDiffers = backendTypes.join(',') !== snippetTypes.join(',');

  if (onlyInBackend.length === 0 && onlyInSnippet.length === 0 && !orderDiffers) {
    console.log(
      `OK — EVENT_TYPES match (${backendTypes.length} types) in both:\n` +
        `  ${path.relative(repoRoot, BACKEND_FILE)}\n` +
        `  ${path.relative(repoRoot, SNIPPET_FILE)}`,
    );
    return;
  }

  console.error('EVENT_TYPES have drifted between backend and tracking-snippet.\n');
  if (onlyInBackend.length > 0) {
    console.error(`Only in backend (events.schema.ts): ${onlyInBackend.join(', ')}`);
  }
  if (onlyInSnippet.length > 0) {
    console.error(`Only in tracking-snippet (tracker.ts): ${onlyInSnippet.join(', ')}`);
  }
  if (orderDiffers && onlyInBackend.length === 0 && onlyInSnippet.length === 0) {
    console.error(
      'Same set of event types, but listed in a different order — harmless for behavior, ' +
        'but keep them identical so a future diff is meaningful.',
    );
  }
  console.error(
    '\nFix: edit both arrays so they list the exact same strings in the exact same order, then re-run this check.',
  );
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
