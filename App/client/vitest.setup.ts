import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Ensure the DOM and per-session storage are reset between tests (no shared
// mutable state between tests).
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
