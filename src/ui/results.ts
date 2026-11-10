/** Writes a CraftingResult into the results panel (textContent only). */
import { formatCp } from '../money';
import type { CraftingResult, DegreeResult } from '../rules/crafting';
import { byId } from './dom';

const pct = (p: number): string => `${Math.round(p * 100)}%`;
const days = (n: number): string =>
  `${n.toLocaleString('en-US')} ${n === 1 ? 'day' : 'days'}`;

function text(id: string, value: string): void {
  byId(id, HTMLElement).textContent = value;
}

function renderDegree(prefix: string, r: DegreeResult, setup: number): void {
  text(`${prefix}-per-day`, formatCp(r.perDayCp));
  text(`${prefix}-max-days`, days(r.maxDays));
  text(`${prefix}-req-days`, days(setup + r.maxDays));
  text(`${prefix}-add-cost`, formatCp(r.additionalCostCp));
  text(`${prefix}-total-cost`, formatCp(r.totalCostCp));
  text(`${prefix}-total-days`, days(r.totalDays));
}

function renderOdds(result: CraftingResult): void {
  const { odds } = result;
  const entries: [string, string, number][] = [
    ['cs', 'Critical success', odds.criticalSuccess],
    ['s', 'Success', odds.success],
    ['f', 'Failure', odds.failure],
    ['cf', 'Critical failure', odds.criticalFailure],
  ];
  const bar = byId('odds-bar', HTMLElement);
  for (const [cls, , p] of entries) {
    const seg = bar.querySelector<HTMLElement>(`.${cls}`);
    if (seg) seg.style.flexGrow = String(p);
  }
  const sign = result.checkBonus < 0 ? '-' : '+';
  text(
    'out-check',
    `Rolling d20 ${sign} ${Math.abs(result.checkBonus)} vs DC ${result.dc}`,
  );
  const list = byId('odds-list', HTMLUListElement);
  list.replaceChildren(
    ...entries.map(([cls, label, p]) => {
      const li = document.createElement('li');
      li.className = cls;
      const name = document.createElement('span');
      name.textContent = label;
      const value = document.createElement('strong');
      value.textContent = pct(p);
      li.append(name, value);
      return li;
    }),
  );
}

export function renderResult(result: CraftingResult): void {
  text('out-upfront', formatCp(result.upfrontCp));
  text('out-setup', days(result.setupDays));
  text('out-dc', String(result.dc));
  text('out-remaining', formatCp(result.remainingCp));
  renderOdds(result);
  text(
    's-heading',
    result.impeccable ? 'Success (counts as critical)' : 'Success',
  );
  renderDegree('s', result.success, result.setupDays);
  renderDegree('cs', result.criticalSuccess, result.setupDays);
}

const OUTPUT_IDS = [
  'out-upfront',
  'out-setup',
  'out-dc',
  'out-remaining',
  ...['s', 'cs'].flatMap((p) =>
    [
      'per-day',
      'max-days',
      'req-days',
      'add-cost',
      'total-cost',
      'total-days',
    ].map((k) => `${p}-${k}`),
  ),
];

/** Blank the outputs while the inputs are invalid. */
export function clearResult(): void {
  for (const id of OUTPUT_IDS) text(id, '-');
  byId('odds-list', HTMLUListElement).replaceChildren();
  text('out-check', '');
  for (const seg of byId('odds-bar', HTMLElement).children) {
    (seg as HTMLElement).style.flexGrow = '0';
  }
}
