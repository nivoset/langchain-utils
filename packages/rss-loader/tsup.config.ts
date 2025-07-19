import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    '@libsql-tools/core',
    '@langchain/core',
    'langchain',
    'rss-parser',
    'commander',
    'node-cron',
    'date-fns'
  ],
  // CLI-specific optimizations
  minify: false, // Keep CLI readable
  target: 'es2022',
  // Enable shims for better Node.js compatibility
  shims: true,
  // Custom output extension
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.js' : '.cjs',
    }
  },

}) 