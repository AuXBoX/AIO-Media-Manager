# Vitest Configuration Summary

## Overview

Vitest has been successfully configured for the AIO Media Manager project to support unit testing with React, TypeScript, and jsdom environment.

## Configuration Files

### 1. vitest.config.ts

Located at the project root, this file configures Vitest with the following features:

**Environment:**
- jsdom for DOM testing
- React plugin for JSX/TSX support
- Path aliases matching tsconfig.json

**Test Settings:**
- Global test APIs (describe, it, expect)
- Setup file: `tests/setup.ts`
- Test timeout: 10 seconds
- Parallel execution with threads

**Coverage:**
- Provider: v8
- Reporters: text, json, html, lcov
- Thresholds: 70% for all metrics (lines, functions, branches, statements)
- Excludes: node_modules, dist, test files, config files

**File Patterns:**
- Includes: `src/**/*.{test,spec}.{ts,tsx}`, `tests/**/*.{test,spec}.{ts,tsx}`
- Excludes: node_modules, dist, dist-electron, .git, .cache

### 2. tests/setup.ts

Global test setup file that runs before all tests:

**Features:**
- Automatic cleanup after each test using @testing-library/react
- @testing-library/jest-dom matchers
- Mocked browser APIs:
  - window.matchMedia
  - IntersectionObserver
  - ResizeObserver

## Available Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- src/utils/example.test.ts
```

## Path Aliases

The following path aliases are configured and available in tests:

- `@/` → `src/`
- `@/components` → `src/components`
- `@/services` → `src/services`
- `@/managers` → `src/managers`
- `@/types` → `src/types`
- `@/utils` → `src/utils`
- `@/hooks` → `src/hooks`
- `@/store` → `src/store`
- `@/api` → `src/api`
- `@/db` → `src/db`

## Test Structure

### Unit Tests

Place unit tests next to source files:
```
src/
  utils/
    example.ts
    example.test.ts  ← Test file
```

### Integration Tests

Place integration tests in the tests directory:
```
tests/
  integration/
    auth-flow.test.ts
  setup.ts
  README.md
```

## Example Test

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Coverage Thresholds

The project enforces the following coverage thresholds:

- **Lines:** 70%
- **Functions:** 70%
- **Branches:** 70%
- **Statements:** 70%

These thresholds align with the design document requirements:
- Managers: 90% target
- API clients: 85% target
- Cache Manager: 95% target
- UI components: 70% target

## Verification

The configuration has been verified with:

1. ✅ Basic Vitest functionality
2. ✅ TypeScript support
3. ✅ jsdom environment
4. ✅ React component testing
5. ✅ @testing-library/jest-dom matchers
6. ✅ Path aliases
7. ✅ Coverage reporting

## Next Steps

As per Task 2 (Set Up Testing Infrastructure):

- ✅ 2.1 Configure Vitest for unit testing (COMPLETED)
- ⏳ 2.2 Configure Playwright for E2E testing
- ⏳ 2.3 Create test utilities and helpers
- ⏳ 2.4 Set up test coverage reporting (basic setup complete)
- ⏳ 2.5 Create sample tests to verify setup (basic verification complete)

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Jest-DOM](https://github.com/testing-library/jest-dom)
- [Project Testing Guide](../tests/README.md)
