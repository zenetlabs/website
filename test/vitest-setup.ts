import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

process.env.TZ = 'UTC';

const INVALID_NESTING =
  /cannot be a (child|descendant) of|cannot contain a nested|will cause a hydration error/i;
const baseConsoleError = console.error.bind(console);
const nestingViolations: string[] = [];

console.error = (...args: unknown[]): void => {
  const format = args[0];
  if (typeof format === 'string' && INVALID_NESTING.test(format)) {
    const detail = args
      .slice(1)
      .map((a) => (typeof a === 'string' ? a : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    const message = `Invalid DOM nesting (breaks SSR hydration): ${detail}`;
    nestingViolations.push(message);
    throw new Error(message);
  }
  baseConsoleError(...args);
};

afterEach(() => {
  cleanup();
  const [first] = nestingViolations.splice(0);
  if (first) throw new Error(first);
});
