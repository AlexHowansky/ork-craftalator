import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AON_SEARCH_URL,
  SearchError,
  buildQuery,
  parseResponse,
  searchItems,
} from '../src/aon';

const hit = (id: string, source: Record<string, unknown>) => ({
  _id: id,
  _source: source,
});

const minor = hit('equipment-2943-2812', {
  name: 'Healing Potion (Minor)',
  level: 1,
  price: 400,
  rarity: 'common',
  url: '/Equipment.aspx?ID=2943',
});

describe('buildQuery', () => {
  it('searches names by prefix, trimmed', () => {
    const q = JSON.stringify(buildQuery('  healing pot  '));
    expect(q).toContain('"match_phrase_prefix"');
    expect(q).toContain('"query":"healing pot"');
    expect(q).toContain('"price"');
  });

  it('orders by relevance, then by item level', () => {
    expect(buildQuery('heal')).toMatchObject({
      sort: ['_score', { level: 'asc' }],
    });
  });

  it('caps the search text length', () => {
    const q = JSON.stringify(buildQuery('x'.repeat(500)));
    expect(q).toContain(`"query":"${'x'.repeat(100)}"`);
    expect(q).not.toContain('x'.repeat(101));
  });
});

describe('parseResponse', () => {
  it('maps hits to items', () => {
    const items = parseResponse({ hits: { hits: [minor] } });
    expect(items).toEqual([
      {
        id: 'equipment-2943-2812',
        name: 'Healing Potion (Minor)',
        level: 1,
        priceCp: 400,
        rarity: 'common',
        legacy: false,
        url: 'https://2e.aonprd.com/Equipment.aspx?ID=2943',
      },
    ]);
  });

  it('marks legacy items', () => {
    const legacy = hit('weapon-31', {
      name: 'Longsword',
      level: 0,
      price: 100,
      remaster_id: ['weapon-386'],
      url: '/Weapons.aspx?ID=31',
    });
    const [item] = parseResponse({ hits: { hits: [legacy] } });
    expect(item?.legacy).toBe(true);
    expect(item?.rarity).toBe('common');
  });

  it('skips unusable hits and duplicates', () => {
    const items = parseResponse({
      hits: {
        hits: [
          minor,
          minor,
          hit('a', { name: 'No price', level: 1 }),
          hit('b', { name: 'Too high', level: 25, price: 100 }),
          hit('c', { name: 'Fraction', level: 1, price: 1.5 }),
          hit('d', { name: '', level: 1, price: 100 }),
          null,
          'junk',
        ],
      },
    });
    expect(items.map((i) => i.id)).toEqual(['equipment-2943-2812']);
  });

  it('drops links that are not AoN page paths', () => {
    const bad = hit('x', {
      name: 'X',
      level: 1,
      price: 100,
      url: 'javascript:alert(1)',
    });
    expect(parseResponse({ hits: { hits: [bad] } })[0]?.url).toBeNull();
  });

  it('rejects a malformed response', () => {
    expect(() => parseResponse({})).toThrow(SearchError);
    expect(() => parseResponse({ hits: { hits: 'x' } })).toThrow(SearchError);
  });
});

describe('searchItems', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts the query and parses the result', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ hits: { hits: [minor] } })),
      );
    vi.stubGlobal('fetch', fetchMock);
    const items = await searchItems('healing');
    expect(items).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(AON_SEARCH_URL);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('omit');
  });

  it('wraps network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('CORS')));
    await expect(searchItems('healing')).rejects.toBeInstanceOf(SearchError);
  });

  it('wraps HTTP errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 403 })),
    );
    await expect(searchItems('healing')).rejects.toBeInstanceOf(SearchError);
  });
});
