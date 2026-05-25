import { createHash, randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from './prisma.js';
import type { ApiConfig } from './config.js';

export const accessCookie = 'sms_access';
export const refreshCookie = 'sms_refresh';

export type AuthUser = {
  id: string;
  email: string;
};

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createToken(): string {
  return randomBytes(32).toString('base64url');
}

export function setAuthCookies(reply: FastifyReply, config: ApiConfig, accessToken: string, refreshToken: string) {
  const base = {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: '/',
    ...(config.cookieDomain ? { domain: config.cookieDomain } : {})
  };

  reply.setCookie(accessCookie, accessToken, {
    ...base,
    maxAge: Math.floor(config.accessTokenTtlMs / 1000)
  });
  reply.setCookie(refreshCookie, refreshToken, {
    ...base,
    maxAge: Math.floor(config.refreshTokenTtlMs / 1000)
  });
}

export function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie(accessCookie, { path: '/' });
  reply.clearCookie(refreshCookie, { path: '/' });
}

export async function issueSession(reply: FastifyReply, config: ApiConfig, user: AuthUser) {
  const accessToken = createToken();
  const refreshToken = createToken();
  const now = new Date();
  const refreshExpiresAt = new Date(now.getTime() + config.refreshTokenTtlMs);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiresAt
    }
  });

  setAuthCookies(reply, config, accessToken, refreshToken);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(accessToken),
      expiresAt: new Date(now.getTime() + config.accessTokenTtlMs)
    }
  });
}

export async function getUserFromRequest(request: FastifyRequest): Promise<AuthUser | null> {
  const token = request.cookies[accessCookie] ?? request.cookies[refreshCookie];
  if (!token) return null;
  const session = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true }
  });
  if (!session || session.expiresAt < new Date()) return null;
  return { id: session.user.id, email: session.user.email };
}

export async function requireUser(request: FastifyRequest): Promise<AuthUser> {
  const user = await getUserFromRequest(request);
  if (!user) {
    const error = new Error('Unauthorized');
    Object.assign(error, { statusCode: 401 });
    throw error;
  }
  return user;
}

export async function revokeRequestSession(request: FastifyRequest) {
  const tokens = [request.cookies[accessCookie], request.cookies[refreshCookie]].filter(Boolean) as string[];
  if (!tokens.length) return;
  await prisma.refreshToken.deleteMany({
    where: { tokenHash: { in: tokens.map(hashToken) } }
  });
}
