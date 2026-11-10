import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: globals.browser },
    rules: {
      'no-console': 'error',
      'no-restricted-properties': [
        'error',
        {
          property: 'innerHTML',
          message: 'Use textContent or DOM APIs instead.',
        },
        {
          property: 'outerHTML',
          message: 'Use textContent or DOM APIs instead.',
        },
      ],
    },
  },
  {
    files: ['src/logger.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    // Build-time tools run under Node or Bun, not in the browser.
    files: ['scripts/**'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },
);
