# Testing Guide

This directory contains test files and testing utilities for the AIO Media Manager application.

## Test Structure

```
tests/
├── setup.ts                 # Global test setup and configuration
├── README.md               # This file
├── *.test.ts(x)           # Test files
└── utils/                  # Test utilities and helpers (to be added)
```

## Running Tests

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
npm test -- tests/vitest.config.test.ts
```

## Test Configuration

The test configuration is defined in `vitest.config.ts` at the project root.

### Key Features

- **Environment**: jsdom for DOM testing
- **Globals**: `describe`, `it`, `expect` are available globally
- **Path Aliases**: Same aliases as tsconfig.json (@/, @/components, etc.)
- **Coverage**: v8 provider with 70% threshold for all metrics
- **Setup**: Automatic cleanup after each test, mocked browser APIs

### Coverage Thresholds

- Lines: 70%
- Functions: 70%
- Branches: 70%
- Statements: 70%

## Writing Tests

### Unit Tests

Place unit tests next to the source files with `.test.ts` or `.spec.ts` extension:

```typescript
// src/utils/example.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from './example';

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction()).toBe('expected');
  });
});
```

### Component Tests

Use React Testing Library for component tests:

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

### Integration Tests

Place integration tests in the `tests/` directory:

```typescript
// tests/integration/auth-flow.test.ts
import { describe, it, expect } from 'vitest';

describe('Authentication Flow', () => {
  it('should authenticate user', async () => {
    // Test implementation
  });
});
```

## Test Utilities

### Available Mocks

The test setup includes mocks for:

- `window.matchMedia` - For responsive design tests
- `IntersectionObserver` - For lazy loading tests
- `ResizeObserver` - For resize detection tests

### Custom Matchers

All `@testing-library/jest-dom` matchers are available:

- `toBeInTheDocument()`
- `toHaveTextContent()`
- `toBeVisible()`
- `toBeDisabled()`
- And many more...

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the component does, not how it does it
2. **Use Data-TestId Sparingly**: Prefer accessible queries (getByRole, getByLabelText)
3. **Keep Tests Simple**: One assertion per test when possible
4. **Mock External Dependencies**: Use vi.mock() for API calls and external services
5. **Clean Up**: Tests automatically clean up after each run
6. **Async Testing**: Use async/await with waitFor() for async operations

## Debugging Tests

```bash
# Run tests with verbose output
npm test -- --reporter=verbose

# Run tests with debugging
npm test -- --inspect-brk

# Run single test file
npm test -- tests/my-test.test.ts
```

## CI/CD Integration

Tests run automatically in CI/CD pipeline. Coverage reports are generated and can be viewed in the coverage/ directory after running `npm run test:coverage`.

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Jest-DOM](https://github.com/testing-library/jest-dom)
