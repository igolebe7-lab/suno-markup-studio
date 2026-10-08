import { afterAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const directory = mkdtempSync(join(tmpdir(), 'suno-p1-test-'));
const databaseUrl = `file:${join(directory, 'test.db')}`;
const client = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
vi.mock('./prisma.js', () => ({ prisma: client }));
vi.mock('./auth.js', () => ({ requireUser: vi.fn(async () => ({ id: 'test-owner', email: 'test@example.com' })), clearAuthCookies: vi.fn(), issueSession: vi.fn(), revokeRequestSession: vi.fn() }));

afterAll(async () => {
  await client.$disconnect();
  rmSync(directory, { recursive: true, force: true });
});

describe('SQLite preparation persistence', () => {
  it('round trips creation, an old client rename and explicit clearing through actual SQLite', async () => {
    const require = createRequire(import.meta.url);
    closeSync(openSync(join(directory, 'test.db'), 'wx', 0o600));
    execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy', '--schema', fileURLToPath(new URL('../../../prisma/sqlite/schema.prisma', import.meta.url))], {
      env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: 'pipe'
    });
    await client.user.create({ data: { id: 'test-owner', email: 'test@example.com', passwordHash: 'test-only' } });
    const { buildServer } = await import('./server.js');
    const app = buildServer();
    const sunoContext = { modelId: 'v6', mode: 'custom', notes: 'Saved in SQLite' };
    const sectionEditRequest = { fragment: '[Chorus] (2)', change: 'quiet choir', preserve: 'lyrics', result: 'Edited request' };
    try {
      const created = await app.inject({ method: 'POST', url: '/api/projects', payload: { title: 'SQLite test', stylePrompt: '', lyrics: '[Chorus]', styleChips: [], tagsUsed: [], warnings: [], sunoContext, sectionEditRequest } });
      expect(created.statusCode, created.body).toBe(200);
      const id = created.json().project.id;
      const renamed = await app.inject({ method: 'PATCH', url: `/api/projects/${id}`, payload: { title: 'Renamed by old client' } });
      expect(renamed.statusCode, renamed.body).toBe(200);
      const read = await app.inject({ method: 'GET', url: `/api/projects/${id}` });
      expect(read.json().project).toMatchObject({ title: 'Renamed by old client', sunoContext, sectionEditRequest });
      const cleared = await app.inject({ method: 'PATCH', url: `/api/projects/${id}`, payload: { sunoContext: {} } });
      expect(cleared.statusCode, cleared.body).toBe(200);
      const again = await app.inject({ method: 'GET', url: `/api/projects/${id}` });
      expect(again.json().project.sunoContext).toEqual({});
      expect(again.json().project.sectionEditRequest).toEqual(sectionEditRequest);
    } finally { await app.close(); }
  }, 30_000);
});
