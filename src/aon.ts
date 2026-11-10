/**
 * Archives of Nethys (AoN) item data: the Elasticsearch query used to fetch
 * every Craftable item, and validation of what comes back.
 *
 * Shared by the browser and `scripts/fetch-items.ts`, which runs under Node
 * or Bun without a bundler. Keep this module free of DOM, logger and Vite
 * APIs, and import other modules with explicit `.ts` extensions.
 */
import { MAX_PRICE_CP } from './money.ts';
import { LIMITS, RARITIES, type Rarity } from './rules/types.ts';

export const AON_SEARCH_URL = 'https://elasticsearch.aonprd.com/aon/_search';
export const AON_SITE = 'https://2e.aonprd.com';

/** Elasticsearch's default cap on hits returned by one request. */
export const MAX_HITS = 10_000;

/** Item categories that can be Crafted and carry a Price. */
const CATEGORIES = ['equipment', 'weapon', 'armor', 'shield'] as const;

/** AoN page paths look like "/Equipment.aspx?ID=2943". */
const AON_PATH = /^\/[A-Za-z]+\.aspx\?ID=\d+$/;

const MAX_NAME_LENGTH = 200;
const MAX_ID_LENGTH = 100;

export interface ItemMatch {
  /** AoN document id, unique per variant (e.g. "equipment-2943-2812"). */
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly priceCp: number;
  readonly rarity: Rarity;
  /** True for a Legacy item that has a Remaster replacement. */
  readonly legacy: boolean;
  /** Absolute link to the item's AoN page, or null if unknown. */
  readonly url: string | null;
}

/** An item as stored in `src/data/items.json`. */
export interface StoredItem {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly priceCp: number;
  readonly rarity: Rarity;
  readonly legacy: boolean;
  /** AoN page path, e.g. "/Equipment.aspx?ID=2943", or null. */
  readonly path: string | null;
}

/** Elasticsearch request body for every Craftable item. */
export function buildCatalogQuery(): object {
  return {
    size: MAX_HITS,
    track_total_hits: true,
    sort: [{ level: 'asc' }, '_doc'],
    _source: ['name', 'level', 'price', 'rarity', 'url', 'remaster_id'],
    query: {
      bool: {
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

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function inRange(v: unknown, min: number, max: number): v is number {
  return Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
}

function validPath(path: unknown): string | null {
  return typeof path === 'string' && AON_PATH.test(path) ? path : null;
}

/** Validate an item's fields; returns null for anything unusable. */
export function toStoredItem(fields: {
  id: unknown;
  name: unknown;
  level: unknown;
  priceCp: unknown;
  rarity: unknown;
  legacy: boolean;
  path: unknown;
}): StoredItem | null {
  const { id, name, level, priceCp, rarity, legacy, path } = fields;
  if (typeof id !== 'string' || id === '' || id.length > MAX_ID_LENGTH) {
    return null;
  }
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (trimmed === '' || trimmed.length > MAX_NAME_LENGTH) return null;
  if (!inRange(level, LIMITS.itemLevel.min, LIMITS.itemLevel.max)) {
    return null;
  }
  if (!inRange(priceCp, 1, MAX_PRICE_CP)) return null;
  return {
    id,
    name: trimmed,
    level,
    priceCp,
    rarity: (RARITIES as readonly unknown[]).includes(rarity)
      ? (rarity as Rarity)
      : 'common',
    legacy,
    path: validPath(path),
  };
}

/** Validate one Elasticsearch hit; returns null for anything unusable. */
export function parseHit(hit: unknown): StoredItem | null {
  if (!isRecord(hit) || !isRecord(hit['_source'])) return null;
  const src = hit['_source'];
  const remasterId = src['remaster_id'];
  return toStoredItem({
    id: hit['_id'],
    name: src['name'],
    level: src['level'],
    priceCp: src['price'],
    rarity: src['rarity'],
    legacy: Array.isArray(remasterId) && remasterId.length > 0,
    path: src['url'],
  });
}

/** Validate one entry of `src/data/items.json`. */
export function parseStoredItem(v: unknown): StoredItem | null {
  if (!isRecord(v)) return null;
  return toStoredItem({
    id: v['id'],
    name: v['name'],
    level: v['level'],
    priceCp: v['priceCp'],
    rarity: v['rarity'],
    legacy: v['legacy'] === true,
    path: v['path'],
  });
}

export function toItemMatch(item: StoredItem): ItemMatch {
  const { path, ...rest } = item;
  return { ...rest, url: path === null ? null : AON_SITE + path };
}

/**
 * Turn an Elasticsearch response into stored items, skipping bad hits and
 * duplicate ids. Throws if the response isn't shaped like a search result.
 */
export function parseResponse(json: unknown): {
  total: number | null;
  items: StoredItem[];
} {
  if (!isRecord(json) || !isRecord(json['hits'])) {
    throw new Error('Unexpected search response');
  }
  const { hits, total } = json['hits'];
  if (!Array.isArray(hits)) throw new Error('Unexpected search response');
  const seen = new Set<string>();
  const items: StoredItem[] = [];
  for (const hit of hits) {
    const item = parseHit(hit);
    if (item && !seen.has(item.id)) {
      seen.add(item.id);
      items.push(item);
    }
  }
  const count = isRecord(total) ? total['value'] : undefined;
  return {
    total: Number.isInteger(count) ? (count as number) : null,
    items,
  };
}
