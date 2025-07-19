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
    'commander'
  ],
  // Vector store optimizations
  minify: false, // Keep readable for debugging
  target: 'es2022',
  // Enable shims for better Node.js compatibility
  shims: true,
  // Custom output extension
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.js' : '.cjs',
    }
  }
}) 