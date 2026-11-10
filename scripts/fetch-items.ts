/**
 * Refreshes `src/data/items.json` from the Archives of Nethys search API.
 *
 * Run with `npm run update-items` or `bun run update-items`, review the
 * diff and commit it. This runs outside the browser, so AoN's CORS rules
 * don't apply. Every item is validated before it is written.
 */
import { writeFile } from 'node:fs/promises';
import {
  AON_SEARCH_URL,
  MAX_HITS,
  buildCatalogQuery,
  parseResponse,
  type StoredItem,
} from '../src/aon.ts';

const OUT_FILE = new URL('../src/data/items.json', import.meta.url);
const TIMEOUT_MS = 60_000;
/** Refuse to write a suspiciously small catalog. */
const MIN_ITEMS = 1000;

const PREFIX = '[craftalator] [fetch-items]';

function byName(a: StoredItem, b: StoredItem): number {
  return a.name.localeCompare(b.name, 'en') || a.id.localeCompare(b.id, 'en');
}

/** One item per line, so refreshes produce readable diffs. */
function serialize(updated: string, items: readonly StoredItem[]): string {
  const lines = items.map((item) => '    ' + JSON.stringify(item));
  return (
    '{\n' +
    `  "source": ${JSON.stringify(AON_SEARCH_URL)},\n` +
    `  "updated": ${JSON.stringify(updated)},\n` +
    '  "items": [\n' +
    lines.join(',\n') +
    '\n  ]\n}\n'
  );
}

async function main(): Promise<void> {
  console.info(`${PREFIX} Fetching items from ${AON_SEARCH_URL}`);
  const res = await fetch(AON_SEARCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildCatalogQuery()),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Archives of Nethys returned HTTP ${res.status}`);
  }
  const { total, items } = parseResponse(await res.json());
  if (total !== null && total > MAX_HITS) {
    throw new Error(
      `Archives of Nethys has ${total} items, more than the ${MAX_HITS} ` +
        'one request can return; the script needs paging.',
    );
  }
  if (items.length < MIN_ITEMS) {
    throw new Error(
      `Only ${items.length} usable items came back; not writing the file.`,
    );
  }
  items.sort(byName);
  const updated = new Date().toISOString().slice(0, 10);
  await writeFile(OUT_FILE, serialize(updated, items), 'utf8');
  const skipped = total === null ? '' : ` (${total - items.length} skipped)`;
  console.info(`${PREFIX} Wrote ${items.length} items${skipped}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`${PREFIX} Could not update items: ${message}`);
  process.exitCode = 1;
});
