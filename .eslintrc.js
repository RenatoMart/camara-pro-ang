module.exports = {
  root: true,
  extends: ['@react-native'],
  plugins: ['import'],
  parserOptions: {
    project: './tsconfig.json',
  },
  settings: {
    'import/resolver': {
      typescript: { project: './tsconfig.json' },
      node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
    },
  },
  rules: {
    // Imports ordenados y consistentes
    'import/order': [
      'warn',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        pathGroups: [{ pattern: '@/**', group: 'internal' }],
        pathGroupsExcludedImportTypes: ['builtin'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'import/no-duplicates': 'error',

    // TypeScript
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
    ],

    // React Native
    'react-native/no-inline-styles': 'warn',
    'react-hooks/exhaustive-deps': 'warn',

    // `{count && <Text/>}` renderiza el 0 fuera de un <Text> y revienta la app
    // en producción. Obliga a usar ternario con `: null`.
    'react/jsx-no-leaked-render': ['error', { validStrategies: ['ternary'] }],

    // React Navigation pasa componentes por props (`tabBarIcon`, `header`…);
    // eso es legítimo. Lo que sigue prohibido es declararlos en el cuerpo del
    // render.
    'react/no-unstable-nested-components': ['warn', { allowAsProps: true }],

    // Sólo el logger de la app puede usar consola
    'no-console': ['warn', { allow: ['warn', 'error'] }],

    // `void promesa()` es la forma explícita de decir "no espero este
    // resultado a propósito"; se permite sólo como sentencia.
    'no-void': ['warn', { allowAsStatement: true }],
  },
  overrides: [
    {
      files: ['src/utils/logger.ts'],
      rules: { 'no-console': 'off' },
    },
    {
      files: ['*.test.ts', '*.test.tsx', 'jest.setup.ts', 'jest/**/*.ts'],
      env: { jest: true },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'android/',
    'ios/',
    'coverage/',
    '*.config.js',
    '.eslintrc.js',
  ],
};
