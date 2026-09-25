import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // `motion` de framer-motion solo se usa como <motion.div> (JSX member
      // expression), que no-unused-vars no cuenta como uso: falso positivo.
      // Los parámetros con nombre en PascalCase (`icon: Icon`, `PdfDocument`) se
      // usan como componente en JSX, que no-unused-vars tampoco cuenta.
      'no-unused-vars': [
        'error',
        { varsIgnorePattern: '^(motion$|[A-Z_])', argsIgnorePattern: '^[A-Z_]' },
      ],
    },
  },
  {
    // Tests y setup: corren en Node + jsdom (process, global...) y usan patrones
    // (mutar globals, refs, setState en efectos) que las reglas del React Compiler
    // marcan pero no aplican a código de prueba.
    files: ['**/*.test.{js,jsx}', 'vitest.setup.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'react-hooks/globals': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
  {
    // Los contextos exportan a la vez proveedor y hook por diseño.
    files: ['src/context/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
