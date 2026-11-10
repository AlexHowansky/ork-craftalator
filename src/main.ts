// Self-hosted title font (Latin subset only), bundled by Vite.
import '@fontsource/new-rocker/latin-400.css';
import { createLogger } from './logger';
import { initForm } from './ui/form';

const log = createLogger('main');

function showFatal(): void {
  const p = document.createElement('p');
  p.className = 'fatal';
  p.setAttribute('role', 'alert');
  p.textContent =
    'Sorry, the calculator could not start. Please reload the page.';
  document.body.prepend(p);
}

window.addEventListener('error', (e) => log.error('Uncaught error', e.error));
window.addEventListener('unhandledrejection', (e) =>
  log.error('Unhandled rejection', e.reason),
);

try {
  initForm();
} catch (err) {
  log.error('Startup failed', err);
  showFatal();
}
