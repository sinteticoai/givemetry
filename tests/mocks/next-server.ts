// Mock for next/server module used by next-auth v5
// This allows integration tests to run in Vitest without Next.js server runtime

export class NextRequest {
  url: string;
  method: string;
  headers: Headers;
  cookies: {
    get: (name: string) => { name: string; value: string } | undefined;
    getAll: () => { name: string; value: string }[];
    set: (name: string, value: string) => void;
    delete: (name: string) => void;
  };
  nextUrl: URL;

  constructor(input: string | URL, init?: RequestInit) {
    this.url = typeof input === 'string' ? input : input.toString();
    this.method = init?.method || 'GET';
    this.headers = new Headers(init?.headers);
    this.nextUrl = new URL(this.url);

    const cookieStore = new Map<string, string>();
    this.cookies = {
      get: (name: string) => {
        const value = cookieStore.get(name);
        return value ? { name, value } : undefined;
      },
      getAll: () => Array.from(cookieStore.entries()).map(([name, value]) => ({ name, value })),
      set: (name: string, value: string) => cookieStore.set(name, value),
      delete: (name: string) => cookieStore.delete(name),
    };
  }
}

export class NextResponse extends Response {
  static json(data: unknown, init?: ResponseInit) {
    return new NextResponse(JSON.stringify(data), {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...init?.headers,
      },
    });
  }

  static redirect(url: string | URL, status = 307) {
    return new NextResponse(null, {
      status,
      headers: {
        Location: typeof url === 'string' ? url : url.toString(),
      },
    });
  }

  static next(init?: ResponseInit) {
    return new NextResponse(null, init);
  }

  static rewrite(destination: string | URL) {
    return new NextResponse(null, {
      headers: {
        'x-middleware-rewrite': typeof destination === 'string' ? destination : destination.toString(),
      },
    });
  }
}

// Export other commonly used items
export const userAgent = () => ({
  isBot: false,
  browser: { name: 'Chrome', version: '120' },
  device: { type: undefined, vendor: undefined, model: undefined },
  engine: { name: 'Blink', version: '120' },
  os: { name: 'macOS', version: '14' },
  cpu: { architecture: 'arm64' },
});

export const userAgentFromString = userAgent;
