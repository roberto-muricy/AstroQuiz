/**
 * Jest Test Setup
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for slower tests
jest.setTimeout(30000);

// Global mocks if needed
global.console = {
  ...console,
  // Suppress console.log in tests (uncomment if needed)
  // log: jest.fn(),
  warn: jest.fn(),
  error: console.error,
  info: jest.fn(),
};
