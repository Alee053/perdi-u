const unit = require('./jest.config.cjs')

/** @type {import('jest').Config} */
module.exports = {
  ...unit,
  // Use tsc's output for Nest decorators while tests retain the source's types.
  moduleNameMapper: {
    '^\\.\\./src/app\\.js$': '<rootDir>/apps/api/dist/app.js',
    // Same module instances as the compiled guard, so its error classes are recognised.
    '^\\.\\./src/auth/access-token\\.js$': '<rootDir>/apps/api/dist/auth/access-token.js',
    ...unit.moduleNameMapper,
  },
  testMatch: [
    '<rootDir>/apps/api/test/*.integration.ts',
    '<rootDir>/packages/database/test/*.integration.ts',
  ],
  testTimeout: 30000,
}
