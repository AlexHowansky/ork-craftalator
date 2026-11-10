/**
 * A text box and a slider kept in sync, limited to an integer range.
 * Invalid typing shows an inline message; on blur the box reverts to the
 * last valid value.
 */
import { createLogger } from '../logger';
import { setError } from './dom';

const log = createLogger('rangeInput');

export interface RangeInputOptions {
  readonly text: HTMLInputElement;
  readonly slider: HTMLInputElement;
  readonly error: HTMLElement;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly onChange: (value: number) => void;
}

export interface RangeInput {
  readonly value: number;
  setMax(max: number): void;
}

const INTEGER = /^\s*-?\d+\s*$/;

export function createRangeInput(opts: RangeInputOptions): RangeInput {
  const { text, slider, error, label, onChange } = opts;
  const min = opts.min;
  let max = Math.max(min, opts.max);
  let value = clamp(Number.parseInt(text.value, 10));

  function clamp(n: number): number {
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function rangeMessage(): string {
    return min === max
      ? `${label} must be ${min} here.`
      : `${label} must be a whole number from ${min} to ${max}.`;
  }

  function render(): void {
    slider.min = String(min);
    slider.max = String(max);
    slider.value = String(value);
    slider.disabled = min === max;
    text.value = String(value);
    text.setAttribute('aria-invalid', 'false');
    setError(error, null);
  }

  function commit(next: number, source: string): void {
    if (next === value) return;
    log.debug(`${label}: ${value} -> ${next} (${source})`);
    value = next;
    onChange(value);
  }

  slider.addEventListener('input', () => {
    const next = clamp(Number.parseInt(slider.value, 10));
    commit(next, 'slider');
    render();
  });

  text.addEventListener('input', () => {
    const raw = text.value;
    const n = Number.parseInt(raw, 10);
    if (!INTEGER.test(raw) || n < min || n > max) {
      text.setAttribute('aria-invalid', 'true');
      setError(error, rangeMessage());
      return;
    }
    text.setAttribute('aria-invalid', 'false');
    setError(error, null);
    slider.value = String(n);
    commit(n, 'text');
  });

  text.addEventListener('blur', render);

  render();

  return {
    get value() {
      return value;
    },
    setMax(nextMax: number) {
      const newMax = Math.max(min, Math.trunc(nextMax));
      if (newMax === max) return;
      max = newMax;
      const clamped = clamp(value);
      const changed = clamped !== value;
      value = clamped;
      render();
      if (changed) {
        log.debug(`${label}: clamped to ${value} (max now ${max})`);
        onChange(value);
      }
    },
  };
}
