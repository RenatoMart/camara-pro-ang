/** @type {import('jest').Config} */
module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@env$': '<rootDir>/jest/envMock.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community|-async-storage)?|@react-navigation|react-native-.*|@testing-library|expo(nent)?|@expo(nent)?|@shopify)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/types/**',
  ],
  coverageReporters: ['text-summary', 'lcov'],
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}', '<rootDir>/__tests__/**/*.test.{ts,tsx}'],
};
