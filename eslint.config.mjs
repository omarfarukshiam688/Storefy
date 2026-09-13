import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      react,
      'react-hooks': reactHooks,
      import: importPlugin,
      'jsx-a11y': jsxA11y,
    },
    settings: {
      react: {
        version: '19.0',
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
  {
    ignores: [
      '.next/**',
      'out/**',
      'node_modules/**',
      'public/**',
      '**/*.config.mjs',
      '**/*.config.js',
      'audit.js',
    ],
  }
);
