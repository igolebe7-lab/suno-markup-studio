import { describe, expect, it } from 'vitest';
import { buildProxyUrl, createProxyHeaders, shouldForwardBody } from '../../../../vercel/apiProxyCore.js';

describe('vercel api proxy helpers', () => {
  it('builds backend API urls from a deploy-time origin', () => {
    expect(buildProxyUrl('https://api.example.com/', ['projects', 'abc'], '/api/projects/abc?full=1')).toBe(
      'https://api.example.com/api/projects/abc?full=1'
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
});
