/** Look up a required element by id, with a clear failure if missing. */
export function byId<T extends HTMLElement>(
  id: string,
  type: new () => T,
  root: Document = document,
): T {
  const el = root.getElementById(id);
  if (!(el instanceof type)) {
    throw new Error(`Missing or wrong element #${id}`);
  }
  return el;
}

/** Show or clear an inline error message element. */
export function setError(el: HTMLElement, message: string | null): void {
  el.textContent = message ?? '';
  el.hidden = message === null;
}
