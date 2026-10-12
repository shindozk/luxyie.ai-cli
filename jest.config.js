/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**/*.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.tests.json',
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(inquirer|@inquirer|chalk|ansi-escapes|ansi-styles|picocolors|run-async|rxjs|through|chalk-template|cli-width|external-editor|figures|lodash|mute-stream|ora|strip-ansi|wcwidth|wrap-ansi|is-unicode-supported|log-symbols|bl|buffer-from|clone-deep)/)',
  ],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
