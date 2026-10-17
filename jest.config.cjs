/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/apps/*/test/**/*.test.ts',
    '<rootDir>/packages/*/test/**/*.test.ts',
    '<rootDir>/scripts/test/**/*.test.mjs',
  ],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.tsx?$': [
      'babel-jest',
      {
        babelrc: false,
        configFile: false,
        presets: ['@babel/preset-typescript'],
      },
    ],
  },
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
  maxWorkers: 2,
}
