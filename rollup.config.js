import fs from 'fs'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import pkg from './package.json'
import babel from 'rollup-plugin-babel'
import uglify from '@lopatnov/rollup-plugin-uglify'
const extensions = ['.js', '.jsx', '.ts', '.tsx']

const firstMatch = (baseFileName) =>
  extensions
    .reduce((acc, ex) => {
      const isMatch = fs.existsSync(baseFileName + ex)
      return isMatch ? [...acc, baseFileName + ex] : acc
    }, [])
    .shift()

const input = firstMatch('src/main')

// TBD: use pkg.name => camel-case ?
const name = 'CryptrSpa'

const isProduction = process.env.NODE_ENV === 'production'

export default {
  input,

  // Specify here external modules which you don't want to include in your bundle (for instance: 'lodash', 'moment' etc.)
  // https://rollupjs.org/guide/en#external-e-external
  // TBD extract from package deps?
  external: [],

  plugins: [
    // Allows node_modules resolution
    // resolve({ extensions }),
    resolve({
      extensions: extensions,
      preferBuiltins: true,
      browser: true,
    }),

    // Allow bundling cjs modules. Rollup doesn't understand cjs
    commonjs(),

    // Compile TypeScript/JavaScript files
    babel({
      extensions,
      include: ['src/**/*'],
      exclude: ['node_modules/**', '**/snapshots/**', `**/*.{test,spec}.{${extensions.join(',')}}`],
      runtimeHelpers: true,
    }),

    // Minify js
    uglify(),
  ],

  output: [
    {
      file: pkg.module,
      format: 'esm',
    },
    {
      file: pkg.browser,
      format: 'umd',
      name: name,
    },
  ],
}
