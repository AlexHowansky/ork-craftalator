/**
 * Money helpers. All amounts are integer copper pieces (cp).
 * 1 pp = 10 gp = 100 sp = 1000 cp.
 */

export const CP_PER = Object.freeze({ pp: 1000, gp: 100, sp: 10, cp: 1 });
type Unit = keyof typeof CP_PER;

/** Largest accepted Price: 1,000,000 gp. */
export const MAX_PRICE_CP = 100_000_000;

export type ParseResult =
  | { readonly ok: true; readonly cp: number }
  | { readonly ok: false; readonly error: string };

const TOKEN = /(\d+(?:\.\d+)?|\.\d+)\s*(pp|gp|sp|cp)?/giy;
const FORMAT_HINT = 'Use an amount like "15 gp", "3 gp 5 sp" or "40 cp".';

/**
 * Parse a Price such as "15 gp", "3 gp 5 sp", "2.5" (gold) or "1pp 2gp".
 * Commas and "and" between parts are allowed.
 */
export function parsePrice(raw: string): ParseResult {
  const text = raw.trim().toLowerCase();
  if (text === '') return { ok: false, error: "Enter the item's Price." };
  if (text.length > 100) return { ok: false, error: 'That Price is too long.' };

  const cleaned = text.replace(/,|\band\b/g, ' ').replace(/\s+/g, ' ');
  let total = 0;
  let pos = 0;
  let parts = 0;
  TOKEN.lastIndex = 0;
  while (pos < cleaned.length) {
    if (cleaned[pos] === ' ') {
      pos += 1;
      continue;
    }
    TOKEN.lastIndex = pos;
    const m = TOKEN.exec(cleaned);
    if (!m)
      return { ok: false, error: `Couldn't read that Price. ${FORMAT_HINT}` };
    const unit = (m[2] ?? 'gp') as Unit;
    const value = Number(m[1]) * CP_PER[unit];
    const rounded = Math.round(value);
    if (Math.abs(value - rounded) > 1e-6) {
      return {
        ok: false,
        error: 'The Price must be a whole number of copper pieces.',
      };
    }
    total += rounded;
    parts += 1;
    pos = TOKEN.lastIndex;
  }
  if (parts === 0) {
    return { ok: false, error: `Couldn't read that Price. ${FORMAT_HINT}` };
  }
  if (total <= 0) return { ok: false, error: 'The Price must be more than 0.' };
  if (total > MAX_PRICE_CP) {
    return { ok: false, error: 'The Price can be at most 1,000,000 gp.' };
  }
  return { ok: true, cp: total };
}

/** Format copper as "12 gp, 5 sp, 3 cp" (no platinum, as Prices use gp). */
export function formatCp(cp: number): string {
  if (!Number.isFinite(cp) || cp <= 0) return '0 gp';
  const whole = Math.round(cp);
  const gp = Math.floor(whole / CP_PER.gp);
  const sp = Math.floor((whole % CP_PER.gp) / CP_PER.sp);
  const c = whole % CP_PER.sp;
  const parts: string[] = [];
  if (gp > 0) parts.push(`${gp.toLocaleString('en-US')} gp`);
  if (sp > 0) parts.push(`${sp} sp`);
  if (c > 0) parts.push(`${c} cp`);
  return parts.join(', ');
}
