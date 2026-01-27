// Mock for next/headers module used by next-auth v5
// This allows integration tests to run in Vitest without Next.js server runtime

class MockCookies {
  private store = new Map<string, string>();

  get(name: string) {
    const value = this.store.get(name);
    return value ? { name, value } : undefined;
  }

  getAll() {
    return Array.from(this.store.entries()).map(([name, value]) => ({ name, value }));
  }

  set(name: string, value: string) {
    this.store.set(name, value);
  }

  delete(name: string) {
    this.store.delete(name);
  }

  has(name: string) {
    return this.store.has(name);
  }

  clear() {
    this.store.clear();
  }
}

const mockCookies = new MockCookies();
const mockHeaders = new Headers();

export function cookies() {
  return mockCookies;
}

export function headers() {
  return mockHeaders;
}

export function draftMode() {
  return {
    isEnabled: false,
    enable: () => {},
    disable: () => {},
  };
}
