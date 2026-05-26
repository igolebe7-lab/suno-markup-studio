import { beforeEach, describe, expect, it, vi } from 'vitest';

const user = { id: 'user-1', email: 'tester@example.com' };
const customTagRecord = {
  id: 'tag-1',
  userId: user.id,
  label: 'Drop Marker',
  sunoText: '[Drop]',
  placement: 'lyrics',
  descriptionRu: 'Пользовательский тег для дропа.',
  aliases: ['drop'],
  examples: ['[Drop]'],
  parameters: [],
  createdAt: new Date('2026-05-25T10:00:00.000Z'),
  updatedAt: new Date('2026-05-25T10:00:00.000Z')
};

const customTag = {
  findMany: vi.fn(),
  create: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
};

vi.mock('./prisma.js', () => ({
  prisma: {
    customTag,
    user: { create: vi.fn(), findUnique: vi.fn() },
    project: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
    refreshToken: { create: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn() }
  }
}));

vi.mock('./auth.js', () => ({
  clearAuthCookies: vi.fn(),
  issueSession: vi.fn(),
  requireUser: vi.fn(async () => user),
  revokeRequestSession: vi.fn()
}));

describe('custom tag routes', async () => {
  const { buildServer } = await import('./server.js');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists custom tags for the current user', async () => {
    customTag.findMany.mockResolvedValue([customTagRecord]);
    const app = buildServer();

    const response = await app.inject({ method: 'GET', url: '/api/custom-tags' });
    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(customTag.findMany).toHaveBeenCalledWith({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 100
    });
    expect(response.json().tags[0]).toMatchObject({
      id: 'tag-1',
      label: 'Drop Marker',
      sunoText: '[Drop]',
      category: 'custom'
    });
  });

  it('creates custom tags only for the current user', async () => {
    customTag.create.mockResolvedValue(customTagRecord);
    const app = buildServer();

    const response = await app.inject({
      method: 'POST',
      url: '/api/custom-tags',
      payload: {
        label: 'Drop Marker',
        sunoText: '[Drop]',
        placement: 'lyrics',
        descriptionRu: 'Пользовательский тег для дропа.',
        aliases: ['drop'],
        examples: ['[Drop]'],
        parameters: []
      }
    });
    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(customTag.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: user.id,
        label: 'Drop Marker',
        sunoText: '[Drop]'
      })
    });
  });

  it('does not update another user custom tag', async () => {
    customTag.findFirst.mockResolvedValue(null);
    const app = buildServer();

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/custom-tags/foreign-tag',
      payload: { label: 'Changed' }
    });
    await app.close();

    expect(response.statusCode).toBe(404);
    expect(customTag.update).not.toHaveBeenCalled();
  });

  it('deletes only owned custom tags', async () => {
    customTag.findFirst.mockResolvedValue(customTagRecord);
    customTag.delete.mockResolvedValue(customTagRecord);
    const app = buildServer();

    const response = await app.inject({ method: 'DELETE', url: '/api/custom-tags/tag-1' });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(customTag.findFirst).toHaveBeenCalledWith({ where: { id: 'tag-1', userId: user.id } });
    expect(customTag.delete).toHaveBeenCalledWith({ where: { id: 'tag-1' } });
  });
});
