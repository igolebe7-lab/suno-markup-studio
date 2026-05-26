import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  process.env = { ...originalEnv };
});

function mockServerDependencies() {
  const user = {
    create: vi.fn(),
    findUnique: vi.fn()
  };
  const refreshToken = {
    create: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn()
  };

  vi.doMock('./prisma.js', () => ({
    prisma: {
      customTag: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
      user,
      project: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
      refreshToken
    }
  }));

  return { user, refreshToken };
}

describe('api security controls', () => {
  it('rate limits repeated login attempts without requiring captcha', async () => {
    process.env.AUTH_RATE_LIMIT_MAX = '2';
    process.env.AUTH_RATE_LIMIT_WINDOW_MS = '60000';
    const { user } = mockServerDependencies();
    user.findUnique.mockResolvedValue(null);
    const { buildServer } = await import('./server.js');
    const app = buildServer();

    const payload = { email: 'attacker@example.com', password: 'wrong-password' };
    const first = await app.inject({ method: 'POST', url: '/api/auth/login', payload });
    const second = await app.inject({ method: 'POST', url: '/api/auth/login', payload });
    const third = await app.inject({ method: 'POST', url: '/api/auth/login', payload });
    await app.close();

    expect(first.statusCode).toBe(401);
    expect(second.statusCode).toBe(401);
    expect(third.statusCode).toBe(429);
    expect(third.json()).toMatchObject({
      message: 'Слишком много попыток. Попробуйте позже.'
    });
  });

  it('rejects production write requests from origins outside the allowlist', async () => {
    process.env.NODE_ENV = 'production';
    process.env.WEB_ORIGINS = 'https://suno-markup-studio.vercel.app';
    mockServerDependencies();
    const { buildServer } = await import('./server.js');
    const app = buildServer();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: {
        origin: 'https://evil.example'
      }
    });
    await app.close();

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      message: 'Запрос с этого сайта запрещён'
    });
  });
});
