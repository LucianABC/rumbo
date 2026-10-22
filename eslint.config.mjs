// @ts-check
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/generated/**',
      'infra/cdk.out/**',
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        // Type-aware rules for every package; root-level config files use the default project.
        projectService: { allowDefaultProject: ['*.mjs', '*.js'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      // NestJS modules are decorated classes with no members.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // No eslint-config-next: it bundles eslint-plugin-react/import, which lag behind ESLint 10.
    // No @next/eslint-plugin-next yet: it pulls braces with an unpatched high advisory (GHSA-vfj7-8cjw-p6xm).
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest']],
  },
  {
    // Mock data is reachable only through lib/data, so replacing it with the API touches one place (#103).
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: ['apps/web/src/lib/data/**', 'apps/web/src/mocks/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/mocks', '**/mocks/**'],
              message: 'Read data through lib/data, never from mocks.',
            },
          ],
        },
      ],
      // no-restricted-imports only sees static imports; this closes import() and require().
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportExpression[source.value=/(^|\\/)mocks(\\/|$)/]',
          message: 'Read data through lib/data, never from mocks.',
        },
        {
          selector:
            "CallExpression[callee.name='require'][arguments.0.value=/(^|\\/)mocks(\\/|$)/]",
          message: 'Read data through lib/data, never from mocks.',
        },
      ],
    },
  },
  {
    // Provisional contracts are web-only until their feature spec replaces them (spec 01, #145).
    files: ['apps/api/**/*.ts', 'apps/worker/**/*.ts', 'packages/**/*.ts'],
    ignores: ['packages/contracts/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@rumbo/contracts/provisional', '@rumbo/contracts/provisional/**'],
              message: 'Provisional contracts are web-only until their feature spec (spec 01).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  // Must stay last: turns off rules that conflict with Prettier.
  prettier,
);
