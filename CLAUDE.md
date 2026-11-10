## Craftalator

You are an expert software engineer. You are designing a new application. This
document explains the requirements that must be adhered to.

The product specification (terms and features) is in @SPEC.md.

## Architecture & Design

* The app is authored in TypeScript (strict mode), bundled with Vite, using
  plain DOM APIs (no UI framework). Unit tests use Vitest. Linting uses
  ESLint with typescript-eslint; formatting uses Prettier.

* Project layout:

  * `index.html` - page shell and Content Security Policy.
  * `src/data/` - rules tables (Income Earned, DCs by Level).
  * `src/rules/` - pure crafting calculations, no DOM access.
  * `src/aon.ts` - Archives of Nethys item search client.
  * `src/money.ts` - money parsing and formatting. All money is handled as
    integer copper pieces, never floats.
  * `src/logger.ts` - the only logging entry point.
  * `src/ui/` - DOM code; `src/main.ts` wires everything together.
  * `tests/` - Vitest unit tests.

* Scripts: `npm run dev`, `npm run build`, `npm run preview`,
  `npm test`, `npm run lint`, `npm run typecheck`.

* Both Node.js (npm) and Bun are supported package managers and script
  runners. Scripts must not depend on either one's specific features. With
  Bun, run tests as `bun run test`; `bun test` starts Bun's own test
  runner instead of Vitest.

* CI (`.github/workflows/deploy.yml`) installs with Bun from `bun.lock`.
  Keep `package-lock.json` in sync as well: after any dependency change,
  run both `bun install` and `npm install` and commit both lockfiles.

* No local storage is used; the app is stateless.

* Logging: use `src/logger.ts` (`debug`, `info`, `warn`, `error`), never
  `console` directly. Messages are prefixed with `[craftalator]` and a module
  name. Debug output is on in dev builds, or in production when the URL
  has `?debug=1`.

* Never use `innerHTML` (or similar) with user input; set text with
  `textContent`. No third-party scripts at runtime.

* We are building a single-page app. There is no authentication, access is
  public.

* The app should be completely client-side. It should not require any server
  interactions beyond the initial file loading.

  The one exception is the item search, which queries the Archives of
  Nethys Elasticsearch API (`https://elasticsearch.aonprd.com/aon/_search`)
  from the browser. The production CSP allows `connect-src` to that origin
  only. AoN controls which origins its CORS allows; when a request is
  refused, the search shows a friendly message and the rest of the app
  works without it. Treat AoN responses as untrusted: validate every
  field and only link to AoN page paths.

* If local storage is needed, prompt me for the engine to use.

* Observe OWASP Top Ten guidelines.

* Observe best practices for modern development.

* All error messages should be user-friendly.

* Implement consistent logging to aid debugging.

* Whenever dealing with file paths, always use the path relative to the project
  root, never the full path.

* When I ask for a new feature or a change to a feature, update `SPEC.md`
  accordingly; changes to architecture or conventions go in this document.
  Make sure no line exceeds 80 characters when editing either one.

## Conclusion

Ask me about design decisions or for any additional details you may need. If I
provide answers, update `SPEC.md` or this document accordingly.
