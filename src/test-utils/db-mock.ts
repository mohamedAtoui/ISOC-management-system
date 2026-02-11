import { vi } from "vitest";

/**
 * Creates a chainable proxy that mimics Drizzle's fluent API.
 * Every method call (.select(), .from(), .where(), .limit(), etc.)
 * returns the same proxy, and when awaited, resolves to `value`.
 */
export function dbChain<T>(value: T) {
  const thenable = {
    then(resolve: (v: T) => void) {
      resolve(value);
    },
  };

  const proxy: unknown = new Proxy(thenable, {
    get(target, prop) {
      if (prop === "then") return target.then;
      // Return a function that returns the proxy (for chaining)
      return () => proxy;
    },
  });

  return proxy;
}

/**
 * Creates a mock db object with common Drizzle methods as vi.fn() stubs.
 * Each stub defaults to returning dbChain([]) so queries resolve to empty arrays.
 * Override per-test with mockDb.select.mockReturnValue(dbChain(...)).
 */
export function createMockDb() {
  return {
    select: vi.fn().mockReturnValue(dbChain([])),
    insert: vi.fn().mockReturnValue(dbChain([])),
    update: vi.fn().mockReturnValue(dbChain([])),
    delete: vi.fn().mockReturnValue(dbChain([])),
    run: vi.fn().mockResolvedValue({ rowsAffected: 0 }),
    $count: vi.fn().mockResolvedValue(0),
  };
}
