import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';

const rootEnvPath = resolve(process.cwd(), '../../.env');
loadEnv({ path: existsSync(rootEnvPath) ? rootEnvPath : resolve(process.cwd(), '.env') });

export type ApiConfig = {
  port: number;
  host: string;
  webOrigins: string[];
  writeOriginProtection: boolean;
  cookieSecure: boolean;
  cookieSameSite: 'lax' | 'strict' | 'none';
  cookieDomain?: string;
  accessTokenTtlMs: number;
  refreshTokenTtlMs: number;
  authRateLimitMax: number;
  authRateLimitWindowMs: number;
};

export function parseWebOrigins(value: string | undefined): string[] {
  return (value ?? 'http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function parseCookieSameSite(value: string | undefined, nodeEnv: string): ApiConfig['cookieSameSite'] {
  const normalized = value?.toLowerCase();
  if (normalized === 'strict' || normalized === 'lax' || normalized === 'none') return normalized;
  return nodeEnv === 'production' ? 'none' : 'lax';
}

export function readConfig(): ApiConfig {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const cookieSameSite = parseCookieSameSite(process.env.COOKIE_SAME_SITE, nodeEnv);
  return {
    port: Number(process.env.PORT ?? 8787),
    host: process.env.HOST ?? '0.0.0.0',
    webOrigins: parseWebOrigins(process.env.WEB_ORIGINS ?? process.env.WEB_ORIGIN),
    writeOriginProtection: process.env.WRITE_ORIGIN_PROTECTION === 'true' || nodeEnv === 'production',
    cookieSecure: process.env.COOKIE_SECURE === 'true' || nodeEnv === 'production' || cookieSameSite === 'none',
    cookieSameSite,
    cookieDomain: process.env.COOKIE_DOMAIN?.trim() || undefined,
    accessTokenTtlMs: Number(process.env.ACCESS_TOKEN_TTL_MS ?? 15 * 60 * 1000),
    refreshTokenTtlMs: Number(process.env.REFRESH_TOKEN_TTL_MS ?? 30 * 24 * 60 * 60 * 1000),
    authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 8),
    authRateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000)
  };
}
