import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchError, type Catalog, type ItemMatch } from '../src/items';
import { MESSAGES, createItemSearch, sourceText } from '../src/ui/itemSearch';

const potion: ItemMatch = {
  id: 'p1',
  name: 'Healing Potion (Minor)',
  level: 1,
  priceCp: 400,
  rarity: 'common',
  legacy: false,
  url: 'https://2e.aonprd.com/Equipment.aspx?ID=2943',
};
const sword: ItemMatch = {
  id: 's1',
  name: 'Longsword',
  level: 0,
  priceCp: 100,
  rarity: 'uncommon',
  legacy: true,
  url: null,
};

const catalog: Catalog = { updated: '2026-11-10', entries: [] };

function setup(
  search = vi.fn().mockResolvedValue([potion, sword]),
  maxLevel = 20,
  load = vi.fn().mockResolvedValue(catalog),
) {
  document.body.replaceChildren();
  const input = document.createElement('input');
  const list = document.createElement('ul');
  list.id = 'list';
  const status = document.createElement('p');
  const selected = document.createElement('p');
  const source = document.createElement('p');
  document.body.append(input, list, status, selected, source);
  const onSelect = vi.fn();
  createItemSearch({
    input,
    list,
    status,
    selected,
    source,
    onSelect,
    maxLevel: () => maxLevel,
    search,
    load,
    debounceMs: 0,
  });
  return { input, list, status, selected, source, onSelect, search, load };
}

const type = (input: HTMLInputElement, text: string): void => {
  input.value = text;
  input.dispatchEvent(new Event('input'));
};
const key = (input: HTMLInputElement, k: string): void => {
  input.dispatchEvent(new KeyboardEvent('keydown', { key: k }));
};
const settle = () => new Promise((r) => setTimeout(r, 5));

describe('createItemSearch', () => {
  beforeEach(() => document.body.replaceChildren());

  it('does not search for very short text', async () => {
    const { input, search } = setup();
    type(input, 'h');
    await settle();
    expect(search).not.toHaveBeenCalled();
  });

  it('lists matches as options', async () => {
    const { input, list, status } = setup();
    type(input, 'heal');
    await settle();
    expect(list.hidden).toBe(false);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    const options = list.querySelectorAll('[role="option"]');
    expect(options).toHaveLength(2);
    expect(options[0]?.textContent).toContain('Healing Potion (Minor)');
    expect(options[0]?.textContent).toContain('Level 1 · 4 gp');
    expect(options[1]?.textContent).toContain('uncommon · Legacy');
    expect(status.textContent).toContain('2 items found');
  });

  it('selects with the keyboard', async () => {
    const { input, list, selected, onSelect } = setup();
    type(input, 'heal');
    await settle();
    key(input, 'ArrowDown');
    key(input, 'ArrowDown');
    expect(input.getAttribute('aria-activedescendant')).toBe('list-opt-1');
    key(input, 'ArrowUp');
    key(input, 'Enter');
    expect(onSelect).toHaveBeenCalledWith(potion);
    expect(input.value).toBe('Healing Potion (Minor)');
    expect(list.hidden).toBe(true);
    expect(selected.hidden).toBe(false);
    expect(selected.textContent).toBe('View on Archives of Nethys');
    const link = selected.querySelector('a');
    expect(link?.href).toBe(potion.url);
    expect(link?.rel).toBe('noopener noreferrer');
  });

  it('selects with a click', async () => {
    const { input, list, selected, onSelect } = setup();
    type(input, 'long');
    await settle();
    (list.children[1] as HTMLElement).click();
    expect(onSelect).toHaveBeenCalledWith(sword);
    expect(selected.hidden).toBe(true);
    expect(selected.querySelector('a')).toBeNull();
  });

  it('ghosts items above the craftable level', async () => {
    const { input, list, status, onSelect } = setup(undefined, 0);
    type(input, 'heal');
    await settle();
    const [high, ok] = Array.from(list.children);
    expect(high?.getAttribute('aria-disabled')).toBe('true');
    expect(high?.textContent).toContain('too high to Craft');
    expect(ok?.hasAttribute('aria-disabled')).toBe(false);
    expect(status.textContent).toContain('1 above the level you can Craft');
    (high as HTMLElement).click();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('skips ghosted items with the arrow keys', async () => {
    const { input, onSelect } = setup(undefined, 0);
    type(input, 'heal');
    await settle();
    key(input, 'ArrowDown');
    expect(input.getAttribute('aria-activedescendant')).toBe('list-opt-1');
    key(input, 'ArrowDown');
    expect(input.getAttribute('aria-activedescendant')).toBe('list-opt-1');
    key(input, 'Enter');
    expect(onSelect).toHaveBeenCalledWith(sword);
  });

  it('says when every match is too high', async () => {
    const { input, status } = setup(vi.fn().mockResolvedValue([potion]), 0);
    type(input, 'heal');
    await settle();
    key(input, 'ArrowDown');
    expect(input.hasAttribute('aria-activedescendant')).toBe(false);
    expect(status.textContent).toBe(
      '1 item found, all above the level you can Craft.',
    );
  });

  it('closes on Escape', async () => {
    const { input, list } = setup();
    type(input, 'heal');
    await settle();
    key(input, 'Escape');
    expect(list.hidden).toBe(true);
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('reports no matches', async () => {
    const { input, list, status } = setup(vi.fn().mockResolvedValue([]));
    type(input, 'zzz');
    await settle();
    expect(list.hidden).toBe(true);
    expect(status.textContent).toBe(MESSAGES.none);
  });

  it('shows a friendly message when search fails', async () => {
    const { input, status } = setup(
      vi.fn().mockRejectedValue(new SearchError('HTTP 403')),
    );
    type(input, 'heal');
    await settle();
    expect(status.textContent).toBe(MESSAGES.unavailable);
  });

  it('drops results from a superseded search', async () => {
    let resolveFirst: (v: ItemMatch[]) => void = () => undefined;
    const search = vi
      .fn()
      .mockImplementationOnce(
        () => new Promise<ItemMatch[]>((r) => (resolveFirst = r)),
      )
      .mockResolvedValueOnce([sword]);
    const { input, list } = setup(search);
    type(input, 'heal');
    await settle();
    type(input, 'long');
    await settle();
    resolveFirst([potion]);
    await settle();
    expect(list.children).toHaveLength(1);
    expect(list.textContent).toContain('Longsword');
  });

  it('loads the item data on first focus and shows its date', async () => {
    const { input, source, load } = setup();
    input.dispatchEvent(new Event('focus'));
    input.dispatchEvent(new Event('focus'));
    await settle();
    expect(load).toHaveBeenCalledTimes(1);
    expect(source.textContent).toBe(sourceText('2026-11-10'));
  });

  it('keeps the plain credit if the item data fails to load', async () => {
    const { input, source } = setup(
      undefined,
      20,
      vi.fn().mockRejectedValue(new SearchError('nope')),
    );
    source.textContent = MESSAGES.source;
    input.dispatchEvent(new Event('focus'));
    await settle();
    expect(source.textContent).toBe(MESSAGES.source);
  });
});
