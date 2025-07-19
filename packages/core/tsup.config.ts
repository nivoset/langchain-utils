import { defineConfig } from 'tsup'

export default defineConfig((options) => {
  const isProduction = process.env.NODE_ENV === 'production'
  
  return {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    external: ['@libsql/client', 'dotenv'],
    // Conditional optimizations
    minify: isProduction, // Only minify in production
    target: 'es2022',
    // Custom output extension for better module resolution
    outExtension({ format }) {
      return {
        js: format === 'esm' ? '.js' : '.cjs',
      }
    },
    // Production-specific optimizations
    ...(isProduction && {
      sourcemap: false, // Disable sourcemaps in production
      treeshake: true,
    })
  }
}) 