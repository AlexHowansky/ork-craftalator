import { describe, expect, it } from 'vitest';
import { formatCp, parsePrice } from '../src/money';

describe('parsePrice', () => {
  it.each([
    ['15 gp', 1500],
    ['15gp', 1500],
    ['3 gp 5 sp', 350],
    ['3 gp, 5 sp and 2 cp', 352],
    ['40 cp', 40],
    ['1 pp', 1000],
    ['2.5', 250],
    ['  7 ', 700],
    ['1.5 GP', 150],
  ])('%s -> %d cp', (raw, cp) => {
    expect(parsePrice(raw)).toEqual({ ok: true, cp });
  });

  it.each(['', 'abc', '5 xp', '0', '0.001', '-5 gp', '1e3', '<script>'])(
    'rejects %j with a friendly message',
    (raw) => {
      const r = parsePrice(raw);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.length).toBeGreaterThan(0);
    },
  );

  it('rejects absurd prices', () => {
    expect(parsePrice('2000000 gp').ok).toBe(false);
  });
});

describe('formatCp', () => {
  it('formats mixed coins', () => {
    expect(formatCp(1253)).toBe('12 gp, 5 sp, 3 cp');
    expect(formatCp(20)).toBe('2 sp');
    expect(formatCp(0)).toBe('0 gp');
    expect(formatCp(123456700)).toBe('1,234,567 gp');
  });
});
