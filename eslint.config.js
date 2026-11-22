import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  // Regla arquitectónica MVC: models y patterns nunca importan React, Zustand ni UI
  {
    files: ['src/models/**/*.ts', 'src/patterns/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'models y patterns deben estar libres de React.' },
            { name: 'react-dom', message: 'models y patterns deben estar libres del DOM.' },
            { name: 'zustand', message: 'models y patterns deben estar libres de Zustand.' },
            { name: 'motion', message: 'models y patterns deben estar libres de UI.' },
            { name: 'motion/react', message: 'models y patterns deben estar libres de UI.' },
            { name: 'recharts', message: 'models y patterns deben estar libres de UI.' },
            { name: 'lucide-react', message: 'models y patterns deben estar libres de UI.' },
          ],
        },
      ],
    },
  },
  // Regla arquitectónica MVC: ningún .tsx importa valores desde src/models (solo import type)
  {
    files: ['src/**/*.tsx'],
    rules: {
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/models',
                '**/models/**',
                './models/**',
                '../models/**',
                '../../models/**',
              ],
              allowTypeImports: true,
              message:
                'Los componentes .tsx solo pueden importar tipos (import type) desde src/models.',
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
);
