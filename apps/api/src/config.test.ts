import { afterEach, describe, expect, it } from 'vitest';
import { parseCookieSameSite, parseWebOrigins, readConfig } from './config';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('api config', () => {
  it('parses comma-separated web origins', () => {
    expect(parseWebOrigins('https://app.example.com, https://preview.vercel.app')).toEqual([
      'https://app.example.com',
      'https://preview.vercel.app'
    ]);
  });

  it('uses cross-site cookies by default in production deployments', () => {
    expect(parseCookieSameSite(undefined, 'production')).toBe('none');
    expect(parseCookieSameSite(undefined, 'development')).toBe('lax');
  });

  it('enables secure cookies when SameSite=None is active', () => {
    process.env.NODE_ENV = 'development';
    process.env.COOKIE_SAME_SITE = 'none';
    process.env.COOKIE_SECURE = 'false';

    expect(readConfig().cookieSecure).toBe(true);
  });

  it('sets generous but finite request and auth limits', () => {
    process.env.API_BODY_LIMIT_BYTES = '1234567';
    process.env.AUTH_RATE_LIMIT_MAX = '12';
    process.env.AUTH_RATE_LIMIT_WINDOW_MS = '600000';

    expect(readConfig()).toMatchObject({
      bodyLimitBytes: 1234567,
      authRateLimitMax: 12,
      authRateLimitWindowMs: 600000
    });
  });
});
