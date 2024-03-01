const extensions = ['js', 'jsx', 'ts', 'tsx']

module.exports = {
  rootDir: './',
  moduleFileExtensions: ['ts', 'js'],
  testMatch: [
    `**/__tests__/**/*.+(${extensions.join('|')})`,
    `**/?(*.)+(spec|test).+(${extensions.join('|')})`,
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    './cypress',
    './jest.config.js',
    './__tests__',
    './src/index.ts',
  ],
  transform: {
    [`^.+\\.(${extensions.join('|')})$`]: 'ts-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/?!ky/distribution', // tell `ts-jest` to transform all js files in `ky/distribution` folder because all ky's js files are ESM files
  ],
  verbose: true,
  collectCoverage: true,
  coverageReporters: ['json-summary', 'html'],
}
