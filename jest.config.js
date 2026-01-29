/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',

  // Handle both JS and TS tests
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },

  // Test file patterns
  testMatch: [
    '<rootDir>/scripts/**/*.test.js',
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/src/**/__tests__/**/*.ts',
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/scripts/test-setup.js',
  ],

  // Coverage
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/AstroQuizApp/',
  ],

  // Module name mapper for path aliases if needed
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
