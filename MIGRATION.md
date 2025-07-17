# Migration Guide: From Deprecated VS Code Packages

This document outlines the migration from deprecated VS Code extension development packages to the new recommended packages.

## What Was Deprecated

According to VS Code's official documentation (https://code.visualstudio.com/updates/v1_36#_splitting-vscode-package-into-typesvscode-and-vscodetest), the following packages were deprecated:

- **`vscode`** - The original package that included both types and runtime
- **`vscode-test`** - The original testing package

## What Changed

### Package Dependencies

**Before:**
```json
{
  "devDependencies": {
    "vscode": "^1.85.0"
  }
}
```

**After:**
```json
{
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@vscode/test-electron": "^2.3.8",
    "@types/mocha": "^10.0.0",
    "@types/glob": "^8.0.0",
    "mocha": "^10.0.0",
    "glob": "^10.0.0"
  }
}
```

### Import Statements

**Before:**
```typescript
import * as vscode from 'vscode';
import { runTests } from 'vscode-test';
```

**After:**
```typescript
import * as vscode from 'vscode';  // Still the same!
import { runTests } from '@vscode/test-electron';
```

### Testing Structure

**Before:**
```typescript
// Simple test structure
suite('Test Suite', () => {
  test('should work', () => {
    // test code
  });
});
```

**After:**
```typescript
import { suite, test } from 'mocha';

suite('Test Suite', () => {
  test('should work', () => {
    // test code
  });
});
```

## Benefits of Migration

1. **Better Type Safety**: Dedicated type definitions with `@types/vscode`
2. **Improved Testing**: Modern testing framework with `@vscode/test-electron`
3. **Future-Proof**: Following VS Code's latest recommendations
4. **Performance**: Smaller bundle sizes and better tree-shaking
5. **Maintainability**: Clear separation of concerns between types and runtime

## Migration Steps

1. **Update package.json**:
   - Remove `vscode` from devDependencies
   - Add `@types/vscode` for type definitions
   - Add `@vscode/test-electron` for testing
   - Add Mocha testing dependencies

2. **Update test files**:
   - Import `suite` and `test` from 'mocha'
   - Update test runner to use `@vscode/test-electron`
   - Use modern async/await patterns

3. **Update imports**:
   - Keep `import * as vscode from 'vscode'` (this still works!)
   - Update test runner imports

4. **Test the migration**:
   - Run `pnpm install` to install new dependencies
   - Run `pnpm run compile` to ensure TypeScript compilation works
   - Run `pnpm run test` to verify tests work

## Files Changed

- `package.json` - Updated dependencies
- `src/test/runTest.ts` - Updated to use `@vscode/test-electron`
- `src/test/suite/index.ts` - Updated to use modern Mocha imports
- `src/test/suite/extension.test.ts` - Added explicit Mocha imports
- `src/test/suite/context7-service.test.ts` - New test file
- `src/test/suite/playwright-service.test.ts` - New test file

## Verification

After migration, verify that:

1. ✅ TypeScript compilation works: `pnpm run compile`
2. ✅ Tests can be run: `pnpm run test`
3. ✅ Extension can be loaded in VS Code
4. ✅ All commands and features work as expected

## Notes

- The `vscode` import statement remains the same - only the package name changed
- The new packages provide better type safety and performance
- The testing framework is now more robust and feature-rich
- This migration ensures the extension is future-proof and follows VS Code's latest best practices 