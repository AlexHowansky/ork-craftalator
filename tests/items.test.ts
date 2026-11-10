import { describe, expect, it } from 'vitest';
import {
  SearchError,
  loadCatalog,
  normalize,
  parseCatalog,
  searchCatalog,
  searchItems,
} from '../src/items';

const item = (id: string, name: string, level: number) => ({
  id,
  name,
  level,
  priceCp: 100,
  rarity: 'common',
  legacy: false,
  path: null,
});

const catalog = parseCatalog({
  updated: '2026-11-10',
  items: [
    item('a', 'Healing Potion (Moderate)', 6),
    item('b', 'Healing Potion (Minor)', 1),
    item('c', 'Potion of Healing', 1),
    item('d', 'Elixir of Life (Minor)', 5),
    item('e', 'Greater Healing Potion Kit', 2),
    item('f', 'Mjölnir Replica', 3),
    item('b', 'Duplicate id', 1),
    { id: 'bad' },
  ],
});

const names = (text: string) => searchCatalog(catalog, text).map((i) => i.name);

describe('normalize', () => {
  it('lowercases, strips accents and folds punctuation', () => {
    expect(normalize('  Mjölnir (Greater)-Kit ')).toBe('mjolnir greater kit');
  });
});

describe('parseCatalog', () => {
  it('keeps valid, unique items and the date', () => {
    expect(catalog.updated).toBe('2026-11-10');
    expect(catalog.entries).toHaveLength(6);
  });

  it('ignores a bad date and rejects a malformed file', () => {
    expect(parseCatalog({ updated: 'x', items: [] }).updated).toBeNull();
    expect(() => parseCatalog({})).toThrow(SearchError);
    expect(() => parseCatalog(null)).toThrow(SearchError);
  });
});

describe('searchCatalog', () => {
  it('ranks name prefix, then words in order, then any order', () => {
    expect(names('healing pot')).toEqual([
      'Healing Potion (Minor)',
      'Healing Potion (Moderate)',
      'Greater Healing Potion Kit',
      'Potion of Healing',
    ]);
  });

  it('orders equal matches by level', () => {
    expect(names('heal')).toEqual([
      'Healing Potion (Minor)',
      'Healing Potion (Moderate)',
      'Potion of Healing',
      'Greater Healing Potion Kit',
    ]);
  });

  it('ignores case, accents and punctuation', () => {
    expect(names('MJOLNIR')).toEqual(['Mjölnir Replica']);
    expect(names('(minor)')).toEqual([
      'Healing Potion (Minor)',
      'Elixir of Life (Minor)',
    ]);
  });

  it('finds nothing for blank or unmatched text', () => {
    expect(names('  ')).toEqual([]);
    expect(names('vorpal')).toEqual([]);
  });

  it('gives absolute links only for stored AoN paths', () => {
    const [found] = searchCatalog(catalog, 'mjolnir');
    expect(found?.url).toBeNull();
  });
});

describe('bundled item data', () => {
  it('loads and finds a common item', async () => {
    const data = await loadCatalog();
    expect(data.entries.length).toBeGreaterThan(1000);
    expect(data.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const found = await searchItems('healing potion');
    expect(found.length).toBeGreaterThan(0);
    for (const f of found) {
      expect(f.url ?? 'https://2e.aonprd.com/').toMatch(
        /^https:\/\/2e\.aonprd\.com\//,
      );
    }
  });

  it('honours an aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(searchItems('heal', controller.signal)).rejects.toBe(
      controller.signal.reason,
    );
  });
});
