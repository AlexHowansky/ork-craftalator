import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRangeInput } from '../src/ui/rangeInput';

function setup(min = 0, max = 10, initial = '5') {
  document.body.replaceChildren();
  const text = document.createElement('input');
  const slider = document.createElement('input');
  slider.type = 'range';
  const error = document.createElement('p');
  text.value = initial;
  document.body.append(text, slider, error);
  const onChange = vi.fn();
  const r = createRangeInput({
    text,
    slider,
    error,
    label: 'Thing',
    min,
    max,
    onChange,
  });
  return { text, slider, error, onChange, r };
}

const fire = (el: HTMLElement, type: string): boolean =>
  el.dispatchEvent(new Event(type));

describe('createRangeInput', () => {
  beforeEach(() => document.body.replaceChildren());

  it('syncs slider to text', () => {
    const { text, slider, onChange, r } = setup();
    slider.value = '8';
    fire(slider, 'input');
    expect(text.value).toBe('8');
    expect(r.value).toBe(8);
    expect(onChange).toHaveBeenCalledWith(8);
  });

  it('syncs valid text to slider', () => {
    const { text, slider, r } = setup();
    text.value = '3';
    fire(text, 'input');
    expect(slider.value).toBe('3');
    expect(r.value).toBe(3);
  });

  it('shows an error for out-of-range text and reverts on blur', () => {
    const { text, error, onChange, r } = setup();
    text.value = '99';
    fire(text, 'input');
    expect(error.hidden).toBe(false);
    expect(error.textContent).toMatch(/0 to 10/);
    expect(onChange).not.toHaveBeenCalled();
    fire(text, 'blur');
    expect(text.value).toBe('5');
    expect(error.hidden).toBe(true);
    expect(r.value).toBe(5);
  });

  it('clamps when the max shrinks', () => {
    const { text, onChange, r } = setup();
    r.setMax(2);
    expect(r.value).toBe(2);
    expect(text.value).toBe('2');
    expect(onChange).toHaveBeenCalledWith(2);
  });
});
