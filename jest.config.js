const extensions = ['js', 'jsx', 'ts', 'tsx']

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  transformIgnorePatterns: ['<rootDir>/node_modules/'],
  verbose: true,
  collectCoverage: true,
  coverageReporters: ['json-summary', 'html'],
}
