/**
 * Item search box with autocomplete (ARIA combobox + listbox). Matches come
 * from the bundled Archives of Nethys item data; picking one hands the item
 * to onSelect.
 */
import {
  MIN_QUERY_LENGTH,
  SearchError,
  loadCatalog,
  searchItems,
  type ItemMatch,
} from '../items';
import { createLogger } from '../logger';
import { formatCp } from '../money';

const log = createLogger('itemSearch');

const DEBOUNCE_MS = 250;

export const MESSAGES = Object.freeze({
  searching: 'Searching…',
  none: 'No Craftable items match that name.',
  unavailable:
    'Item search is unavailable right now. You can still enter the ' +
    'item level and Price by hand.',
  source: 'Item data from Archives of Nethys.',
});

/** Credit line naming the data source and snapshot date. */
export function sourceText(updated: string | null): string {
  return updated
    ? `Item data from Archives of Nethys, updated ${updated}.`
    : MESSAGES.source;
}

export interface ItemSearchOptions {
  readonly input: HTMLInputElement;
  readonly list: HTMLUListElement;
  readonly status: HTMLElement;
  readonly selected: HTMLElement;
  /** Shows where the item data comes from and how current it is. */
  readonly source?: HTMLElement;
  /** Apply the chosen item. */
  readonly onSelect: (item: ItemMatch) => void;
  /** Highest item level the crafter can Craft; higher items are ghosted. */
  readonly maxLevel: () => number;
  /** Injected for tests. */
  readonly search?: typeof searchItems;
  readonly load?: typeof loadCatalog;
  readonly debounceMs?: number;
}

export interface ItemSearch {
  /** Cancel any pending search and close the list. */
  close(): void;
}

function describe(item: ItemMatch, tooHigh: boolean): string {
  const level = `Level ${item.level}${tooHigh ? ' (too high to Craft)' : ''}`;
  const parts = [level, formatCp(item.priceCp)];
  if (item.rarity !== 'common') parts.push(item.rarity);
  if (item.legacy) parts.push('Legacy');
  return parts.join(' · ');
}

export function createItemSearch(opts: ItemSearchOptions): ItemSearch {
  const { input, list, status, selected, onSelect, maxLevel } = opts;
  const search = opts.search ?? searchItems;
  const load = opts.load ?? loadCatalog;
  const debounceMs = opts.debounceMs ?? DEBOUNCE_MS;

  let items: ItemMatch[] = [];
  let active = -1;
  /** Item level limit when the list was last rendered. */
  let limit = Number.POSITIVE_INFINITY;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inflight: AbortController | undefined;

  function setStatus(text: string): void {
    status.textContent = text;
  }

  function optionId(i: number): string {
    return `${list.id}-opt-${i}`;
  }

  function cancel(): void {
    clearTimeout(timer);
    timer = undefined;
    inflight?.abort();
    inflight = undefined;
  }

  function closeList(): void {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  }

  function setActive(i: number): void {
    const options = list.children;
    if (active >= 0) options[active]?.setAttribute('aria-selected', 'false');
    active = i;
    const el = options[active];
    if (!el) {
      input.removeAttribute('aria-activedescendant');
      return;
    }
    el.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', el.id);
    el.scrollIntoView?.({ block: 'nearest' });
  }

  function craftable(i: number): boolean {
    const item = items[i];
    return item !== undefined && item.level <= limit;
  }

  /** Next craftable option from the active one, or -1 if none. */
  function step(dir: 1 | -1): number {
    const n = items.length;
    let i = active;
    for (let tries = 0; tries < n; tries += 1) {
      i = i < 0 ? (dir === 1 ? 0 : n - 1) : (i + dir + n) % n;
      if (craftable(i)) return i;
    }
    return -1;
  }

  function renderList(): void {
    limit = maxLevel();
    const nodes = items.map((item, i) => {
      const tooHigh = item.level > limit;
      const li = document.createElement('li');
      li.id = optionId(i);
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      if (tooHigh) li.setAttribute('aria-disabled', 'true');
      const name = document.createElement('span');
      name.className = 'option-name';
      name.textContent = item.name;
      const meta = document.createElement('span');
      meta.className = 'option-meta';
      meta.textContent = describe(item, tooHigh);
      li.append(name, meta);
      return li;
    });
    list.replaceChildren(...nodes);
    active = -1;
    input.removeAttribute('aria-activedescendant');
    const open = nodes.length > 0;
    list.hidden = !open;
    input.setAttribute('aria-expanded', String(open));
  }

  function showSelected(item: ItemMatch): void {
    if (!item.url) {
      selected.replaceChildren();
      selected.hidden = true;
      return;
    }
    const a = document.createElement('a');
    a.href = item.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'View on Archives of Nethys';
    selected.replaceChildren(a);
    selected.hidden = false;
  }

  function choose(i: number): void {
    const item = items[i];
    if (!item || !craftable(i)) return;
    log.info('Item selected', item);
    cancel();
    input.value = item.name;
    closeList();
    setStatus('');
    onSelect(item);
    showSelected(item);
  }

  function foundMessage(): string {
    const total = items.length;
    if (total === 0) return MESSAGES.none;
    const high = items.filter((item) => item.level > limit).length;
    const found = `${total} ${total === 1 ? 'item' : 'items'} found`;
    if (high === total) {
      return `${found}, all above the level you can Craft.`;
    }
    const note = high > 0 ? `, ${high} above the level you can Craft` : '';
    return `${found}${note}. Use the arrow keys to choose one.`;
  }

  async function run(text: string): Promise<void> {
    const controller = new AbortController();
    inflight = controller;
    setStatus(MESSAGES.searching);
    try {
      const found = await search(text, controller.signal);
      if (controller.signal.aborted) return;
      items = found;
      renderList();
      setStatus(foundMessage());
    } catch (err) {
      if (controller.signal.aborted) return;
      if (!(err instanceof SearchError)) log.error('Item search failed', err);
      items = [];
      renderList();
      setStatus(MESSAGES.unavailable);
    } finally {
      if (inflight === controller) inflight = undefined;
    }
  }

  input.addEventListener('input', () => {
    cancel();
    const text = input.value.trim();
    if (text.length < MIN_QUERY_LENGTH) {
      items = [];
      renderList();
      setStatus('');
      return;
    }
    timer = setTimeout(() => {
      timer = undefined;
      void run(text);
    }, debounceMs);
  });

  input.addEventListener('keydown', (e) => {
    const open = !list.hidden && items.length > 0;
    switch (e.key) {
      case 'ArrowDown':
        if (!open && items.length > 0) {
          list.hidden = false;
          input.setAttribute('aria-expanded', 'true');
        }
        if (items.length > 0) setActive(step(1));
        e.preventDefault();
        break;
      case 'ArrowUp':
        if (open) {
          setActive(step(-1));
          e.preventDefault();
        }
        break;
      case 'Enter':
        if (open && active >= 0) {
          choose(active);
          e.preventDefault();
        }
        break;
      case 'Escape':
        if (open) {
          closeList();
          e.preventDefault();
        }
        break;
    }
  });

  input.addEventListener('blur', closeList);

  // Start loading the item data as soon as the box is focused, so the first
  // search is quick, and show the snapshot date once it's known. Failures
  // are reported when a search runs.
  input.addEventListener(
    'focus',
    () => {
      load().then(
        (catalog) => {
          if (opts.source)
            opts.source.textContent = sourceText(catalog.updated);
        },
        () => undefined,
      );
    },
    { once: true },
  );

  // Keep focus in the box so blur doesn't close the list before a click.
  list.addEventListener('mousedown', (e) => e.preventDefault());
  list.addEventListener('click', (e) => {
    const li = (e.target as Element | null)?.closest('[role="option"]');
    if (!li) return;
    const i = Array.prototype.indexOf.call(list.children, li);
    choose(i);
  });

  closeList();

  return {
    close() {
      cancel();
      closeList();
    },
  };
}
