import { defineConfig, type Plugin } from 'vitest/config';

/**
 * Strict Content Security Policy, added to production builds only (the dev
 * server needs inline styles and a websocket for hot reload).
 * frame-ancestors can't be set from a meta tag; set it as a header if the
 * hosting allows. connect-src allows only the Archives of Nethys search
 * API used by the item search.
 */
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  'connect-src https://elasticsearch.aonprd.com',
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'csp-meta',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
        injectTo: 'head-prepend',
      },
    ],
  };
}

export default defineConfig({
  base: './',
  plugins: [cspPlugin()],
  build: {
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
