/**
 * Item search against the Archives of Nethys (AoN) Elasticsearch index.
 * This is the app's only network call; the CSP allows just this origin.
 */
import { createLogger } from './logger';
import { MAX_PRICE_CP } from './money';
import { LIMITS } from './rules/types';

const log = createLogger('aon');

export const AON_SEARCH_URL = 'https://elasticsearch.aonprd.com/aon/_search';
export const AON_SITE = 'https://2e.aonprd.com';

/** Shortest search text sent to AoN. */
export const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;
const MAX_RESULTS = 25;
const TIMEOUT_MS = 8000;

/** Item categories that can be Crafted and carry a Price. */
const CATEGORIES = ['equipment', 'weapon', 'armor', 'shield'] as const;

/** AoN page paths look like "/Equipment.aspx?ID=2943". */
const AON_PATH = /^\/[A-Za-z]+\.aspx\?ID=\d+$/;

export interface ItemMatch {
  /** AoN document id, unique per variant (e.g. "equipment-2943-2812"). */
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly priceCp: number;
  readonly rarity: string;
  /** True for a Legacy item that has a Remaster replacement. */
  readonly legacy: boolean;
  /** Absolute link to the item's AoN page, or null if unknown. */
  readonly url: string | null;
}

export class SearchError extends Error {
  override readonly name = 'SearchError';
}

/** Build the Elasticsearch request body for a name search. */
export function buildQuery(text: string): object {
  return {
    size: MAX_RESULTS,
    // Best name matches first; equal matches go lowest level first.
    sort: ['_score', { level: 'asc' }],
    _source: ['name', 'level', 'price', 'rarity', 'url', 'remaster_id'],
    query: {
      bool: {
        must: [
          {
            match_phrase_prefix: {
              name: { query: text.trim().slice(0, MAX_QUERY_LENGTH) },
            },
          },
        ],
        filter: [
          { terms: { category: CATEGORIES } },
          { range: { price: { gt: 0, lte: MAX_PRICE_CP } } },
          {
            range: {
              level: { gte: LIMITS.itemLevel.min, lte: LIMITS.itemLevel.max },
            },
          },
        ],
        must_not: [{ term: { exclude_from_search: true } }],
      },
    },
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function toUrl(path: unknown): string | null {
  return typeof path === 'string' && AON_PATH.test(path)
    ? AON_SITE + path
    : null;
}

/** Validate one search hit; returns null for anything unusable. */
function parseHit(hit: unknown): ItemMatch | null {
  if (!isRecord(hit) || !isRecord(hit['_source'])) return null;
  const id = hit['_id'];
  const src = hit['_source'];
  const { name, level, price, rarity } = src;
  if (typeof id !== 'string' || typeof name !== 'string') return null;
  if (name.trim() === '') return null;
  if (
    !Number.isInteger(level) ||
    (level as number) < LIMITS.itemLevel.min ||
    (level as number) > LIMITS.itemLevel.max
  ) {
    return null;
  }
  if (
    !Number.isInteger(price) ||
    (price as number) <= 0 ||
    (price as number) > MAX_PRICE_CP
  ) {
    return null;
  }
  const remasterId = src['remaster_id'];
  return {
    id,
    name: name.trim(),
    level: level as number,
    priceCp: price as number,
    rarity: typeof rarity === 'string' ? rarity : 'common',
    legacy: Array.isArray(remasterId) && remasterId.length > 0,
    url: toUrl(src['url']),
  };
}

/** Turn an Elasticsearch response into item matches, skipping bad hits. */
export function parseResponse(json: unknown): ItemMatch[] {
  if (!isRecord(json) || !isRecord(json['hits'])) {
    throw new SearchError('Unexpected search response');
  }
  const hits = json['hits']['hits'];
  if (!Array.isArray(hits)) throw new SearchError('Unexpected search response');
  const seen = new Set<string>();
  const out: ItemMatch[] = [];
  for (const hit of hits) {
    const item = parseHit(hit);
    if (item && !seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

/**
 * Search AoN for Craftable items whose name starts with the text.
 * Rejects with SearchError on network, HTTP or format failures, or with
 * the abort reason if the caller's signal is aborted.
 */
export async function searchItems(
  text: string,
  signal?: AbortSignal,
): Promise<ItemMatch[]> {
  const signals = [AbortSignal.timeout(TIMEOUT_MS)];
  if (signal) signals.push(signal);
  let res: Response;
  try {
    res = await fetch(AON_SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildQuery(text)),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.any(signals),
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    log.warn('Search request failed', err);
    throw new SearchError('Search request failed', { cause: err });
  }
  if (!res.ok) {
    log.warn(`Search returned HTTP ${res.status}`);
    throw new SearchError(`HTTP ${res.status}`);
  }
  let json: unknown;
  try {
    json = await res.json();
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new SearchError('Search response was not JSON', { cause: err });
  }
  const items = parseResponse(json);
  log.debug(`Search "${text}": ${items.length} matches`);
  return items;
}
