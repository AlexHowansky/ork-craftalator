/**
 * Item search over the bundled Archives of Nethys snapshot in
 * `src/data/items.json` (refreshed with `npm run update-items`). The data
 * is a separate chunk, loaded on first use; no request goes to AoN.
 */
import { isRecord, parseStoredItem, toItemMatch, type ItemMatch } from './aon';
import { createLogger } from './logger';

export type { ItemMatch } from './aon';

const log = createLogger('items');

/** Shortest search text that runs a search. */
export const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;
const MAX_RESULTS = 25;

export class SearchError extends Error {
  override readonly name = 'SearchError';
}

interface Entry {
  readonly item: ItemMatch;
  /** Lowercased name with punctuation folded to single spaces. */
  readonly text: string;
  readonly words: readonly string[];
}

export interface Catalog {
  /** Date of the snapshot, "YYYY-MM-DD", or null if unknown. */
  readonly updated: string | null;
  readonly entries: readonly Entry[];
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Lowercase, strip accents and turn punctuation into single spaces. */
export function normalize(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Validate the snapshot file, skipping unusable or duplicate items. */
export function parseCatalog(json: unknown): Catalog {
  if (!isRecord(json) || !Array.isArray(json['items'])) {
    throw new SearchError('Item data is malformed');
  }
  const updated = json['updated'];
  const seen = new Set<string>();
  const entries: Entry[] = [];
  let skipped = 0;
  for (const raw of json['items']) {
    const stored = parseStoredItem(raw);
    if (!stored || seen.has(stored.id)) {
      skipped += 1;
      continue;
    }
    seen.add(stored.id);
    const text = normalize(stored.name);
    entries.push({ item: toItemMatch(stored), text, words: text.split(' ') });
  }
  if (skipped > 0) log.warn(`Skipped ${skipped} invalid item entries`);
  return {
    updated: typeof updated === 'string' && DATE.test(updated) ? updated : null,
    entries,
  };
}

/**
 * How well a name matches the query tokens; lower is better, null is no
 * match. 0: the name starts with the text. 1: the words appear in order
 * somewhere in the name. 2: every token starts some word, in any order.
 * The last token may be a partial word; the others must be whole words,
 * except in rank 2, where every token may be partial.
 */
function rank(entry: Entry, query: string, tokens: string[]): number | null {
  if (entry.text.startsWith(query)) return 0;
  if (entry.text.includes(' ' + query)) return 1;
  const used = new Set<number>();
  for (const token of tokens) {
    const i = entry.words.findIndex(
      (w, j) => !used.has(j) && w.startsWith(token),
    );
    if (i < 0) return null;
    used.add(i);
  }
  return 2;
}

/** Best matches for the text: best rank, then lowest level, then name. */
export function searchCatalog(catalog: Catalog, text: string): ItemMatch[] {
  const query = normalize(text.slice(0, MAX_QUERY_LENGTH));
  if (query === '') return [];
  const tokens = query.split(' ');
  const hits: { entry: Entry; score: number }[] = [];
  for (const entry of catalog.entries) {
    const score = rank(entry, query, tokens);
    if (score !== null) hits.push({ entry, score });
  }
  hits.sort(
    (a, b) =>
      a.score - b.score ||
      a.entry.item.level - b.entry.item.level ||
      a.entry.item.name.localeCompare(b.entry.item.name, 'en'),
  );
  return hits.slice(0, MAX_RESULTS).map((h) => h.entry.item);
}

let catalogPromise: Promise<Catalog> | undefined;

/** Load the snapshot once; a failed load is retried on the next call. */
export function loadCatalog(): Promise<Catalog> {
  catalogPromise ??= import('./data/items.json')
    .then((mod) => {
      const catalog = parseCatalog(mod.default);
      log.debug(
        `Loaded ${catalog.entries.length} items, updated ${catalog.updated}`,
      );
      return catalog;
    })
    .catch((err: unknown) => {
      catalogPromise = undefined;
      log.warn('Could not load item data', err);
      throw err instanceof SearchError
        ? err
        : new SearchError('Could not load item data', { cause: err });
    });
  return catalogPromise;
}

/**
 * Search the bundled items for names matching the text. Rejects with
 * SearchError if the item data can't be loaded, or with the abort reason
 * if the signal is aborted.
 */
export async function searchItems(
  text: string,
  signal?: AbortSignal,
): Promise<ItemMatch[]> {
  const catalog = await loadCatalog();
  signal?.throwIfAborted();
  const items = searchCatalog(catalog, text);
  log.debug(`Search "${text}": ${items.length} matches`);
  return items;
}
