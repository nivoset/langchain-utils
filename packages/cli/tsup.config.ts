import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    'rss-loader': 'src/rss-loader.ts',
    'vectorstore': 'src/vectorstore.ts'
  },
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    '@libsql-tools/core',
    '@libsql-tools/rss-loader', 
    '@libsql-tools/vectorstore',
    'commander',
    'node-cron'
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
  // Build success hook for CLI executables
  onSuccess: 'chmod +x dist/cli.js dist/rss-loader.js dist/vectorstore.js'
}) 