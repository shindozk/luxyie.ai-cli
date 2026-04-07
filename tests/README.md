# Tests

This directory contains all test files for the Luxyie AI CLI project.

## Test Structure

- `ui-helpers.test.ts` - Tests for UI helper functions
- `validation.test.ts` - Tests for validation functions  
- `format.test.ts` - Tests for formatting functions

## Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- ui-helpers.test.ts

# Run tests in watch mode
npm test -- --watch
```

## Writing Tests

When writing new tests, follow these guidelines:

1. **File naming**: Use `*.test.ts` suffix
2. **Structure**: Group tests by function/class using `describe` blocks
3. **Assertions**: Use Jest's `expect` API
4. **Coverage**: Aim for comprehensive coverage of public APIs
5. **ESM**: Remember this is an ESM project - use `import` statements

## Test Configuration

Jest is configured via `jest.config.js` in the project root with:
- TypeScript support via `ts-jest`
- ESM module support
- Coverage reporting
- Node.js test environment
