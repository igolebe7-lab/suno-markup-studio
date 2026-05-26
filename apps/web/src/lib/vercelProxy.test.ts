import { describe, expect, it } from 'vitest';
import { buildProxyPathParam, buildProxyUrl, createProxyHeaders, handleProxyRequest, shouldForwardBody } from '../../../../vercel/apiProxyCore.js';

describe('vercel api proxy helpers', () => {
  it('builds backend API urls from a deploy-time origin', () => {
    expect(buildProxyUrl('https://api.example.com/', ['projects', 'abc'], '/api/projects/abc?full=1')).toBe(
      'https://api.example.com/api/projects/abc?full=1'
    );
  });

  it('supports Vercel catch-all query names and removes routing query noise', () => {
    const pathParam = buildProxyPathParam({ '...path': 'auth/login' });

    expect(pathParam).toEqual(['auth', 'login']);
    expect(buildProxyUrl('https://api.example.com/', pathParam, '/api/auth/login?...path=auth%2Flogin')).toBe(
      'https://api.example.com/api/auth/login'
    );
  });

  it('keeps path segments encoded and rejects missing target origins', () => {
    expect(buildProxyUrl('https://api.example.com', ['custom-tags', 'tag with spaces'], '/api/custom-tags/tag%20with%20spaces')).toBe(
      'https://api.example.com/api/custom-tags/tag%20with%20spaces'
    );
    expect(() => buildProxyUrl('', ['health'], '/api/health')).toThrow('API proxy target is not configured');
  });

  it('filters hop-by-hop headers before forwarding', () => {
    const headers = createProxyHeaders({
      host: 'frontend.vercel.app',
      connection: 'keep-alive',
      'content-length': '42',
      cookie: 'sms_access=token',
      origin: 'https://frontend.vercel.app'
    });

    expect(headers.get('host')).toBeNull();
    expect(headers.get('connection')).toBeNull();
    expect(headers.get('content-length')).toBeNull();
    expect(headers.get('cookie')).toBe('sms_access=token');
    expect(headers.get('origin')).toBe('https://frontend.vercel.app');
  });

  it('forwards bodies only for methods that can carry payloads', () => {
    expect(shouldForwardBody('GET')).toBe(false);
    expect(shouldForwardBody('HEAD')).toBe(false);
    expect(shouldForwardBody('POST')).toBe(true);
    expect(shouldForwardBody('PATCH')).toBe(true);
  });

  it('can proxy nested auth routes through explicit Vercel route files', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    };
    const previousTarget = process.env.API_PROXY_TARGET_ORIGIN;
    process.env.API_PROXY_TARGET_ORIGIN = 'https://api.example.com';
    const response = createMockResponse();

    try {
      await handleProxyRequest(
        createMockRequest('/api/auth/login?...path=login', 'POST', { email: 'user@example.com' }),
        response,
        ['auth', 'login']
      );
    } finally {
      globalThis.fetch = originalFetch;
      process.env.API_PROXY_TARGET_ORIGIN = previousTarget;
    }

    expect(calls[0]?.url).toBe('https://api.example.com/api/auth/login');
    expect(calls[0]?.init.method).toBe('POST');
    expect(response.statusCode).toBe(200);
    expect(response.body?.toString()).toBe(JSON.stringify({ ok: true }));
  });
});

function createMockRequest(url: string, method: string, body: unknown) {
  return {
    url,
    method,
    headers: { 'content-type': 'application/json' },
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(JSON.stringify(body));
    }
  };
}

function createMockResponse() {
  return {
    statusCode: 0,
    body: undefined as Buffer | undefined,
    headers: new Map<string, string | string[]>(),
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(body: Buffer) {
      this.body = body;
    },
    json(body: unknown) {
      this.body = Buffer.from(JSON.stringify(body));
    },
    setHeader(name: string, value: string | string[]) {
      this.headers.set(name, value);
    }
  };
}
