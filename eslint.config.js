import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist', 'server/.wrangler'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...js.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Components are used only in JSX, which this rule can't see; capitalized names are skipped
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
    },
  },
  {
    // The game server runs on Cloudflare Workers
    files: ['server/src/**'],
    languageOptions: { globals: { ...globals.serviceworker, WebSocketPair: 'readonly' } },
  },
  {
    files: ['src/**/__tests__/**', 'vite.config.js'],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } },
  },
];
