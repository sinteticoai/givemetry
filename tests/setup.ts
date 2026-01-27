import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Note: next/server and next/headers are mocked via vitest.config.ts aliases
// pointing to tests/mocks/next-server.ts and tests/mocks/next-headers.ts

// Runs a cleanup after each test case
afterEach(() => {
  cleanup();
});
