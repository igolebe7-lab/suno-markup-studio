import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from './api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api client', () => {
  it('preserves HTTP status and backend message on request errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'Проект не найден' }), {
      status: 404,
      headers: { 'content-type': 'application/json' }
    })));

    await expect(api.getProject('missing')).rejects.toMatchObject({
      status: 404,
      message: 'Проект не найден'
    });
  });

  it('normalizes network failures into a user-facing ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Load failed');
    }));

    await expect(api.me()).rejects.toBeInstanceOf(ApiError);
    await expect(api.me()).rejects.toMatchObject({
      status: 0,
      message: 'Не удалось подключиться к backend. Проверьте интернет, Render API и настройки CORS.'
    });
  });
});
