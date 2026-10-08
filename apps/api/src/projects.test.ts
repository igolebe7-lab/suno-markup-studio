import { beforeEach, describe, expect, it, vi } from 'vitest';

const user = { id: 'owner', email: 'owner@example.com' };
const project = { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() };
vi.mock('./prisma.js', () => ({ prisma: { project } }));
vi.mock('./auth.js', () => ({ requireUser: vi.fn(async () => user), clearAuthCookies: vi.fn(), issueSession: vi.fn(), revokeRequestSession: vi.fn() }));
const sunoContext = { modelId: 'v6', notes: 'keep me' };
const sectionEditRequest = { fragment: 'chorus', change: 'choir', preserve: 'tempo', result: 'manual' };
const record = {
  id: 'p1', userId: user.id, title: 'Test', stylePrompt: 'pop', lyrics: '[Chorus]',
  styleChips: [], tagsUsed: [], warnings: [], selectedPresetId: null, version: 1,
  projectJson: { sunoContext, sectionEditRequest }, createdAt: new Date(), updatedAt: new Date()
};

describe('project preparation routes', async () => {
  const { buildServer } = await import('./server.js');
  beforeEach(() => {
    vi.clearAllMocks();
    project.findFirst.mockResolvedValue(record);
    project.create.mockImplementation(async ({ data }) => ({ ...record, ...data }));
    project.update.mockImplementation(async ({ data }) => ({ ...record, ...data }));
  });
  it('creates a project including preparation', async () => {
    const app = buildServer();
    try {
      const response = await app.inject({ method: 'POST', url: '/api/projects', payload: { title: 'Test', stylePrompt: '', lyrics: '', styleChips: [], tagsUsed: [], warnings: [], sunoContext, sectionEditRequest } });
      expect(response.statusCode, response.body).toBe(200);
      expect(response.json().project).toMatchObject({ sunoContext, sectionEditRequest });
      expect(project.create.mock.calls[0][0].data.userId).toBe(user.id);
    } finally { await app.close(); }
  });
  it('preserves fields on an old client patch and permits explicit clearing', async () => {
    const app = buildServer();
    try {
      const response = await app.inject({ method: 'PATCH', url: '/api/projects/p1', payload: { title: 'Renamed' } });
      expect(response.statusCode, response.body).toBe(200);
      expect(response.json().project).toMatchObject({ title: 'Renamed', sunoContext, sectionEditRequest });
      const cleared = await app.inject({ method: 'PATCH', url: '/api/projects/p1', payload: { sunoContext: {} } });
      expect(cleared.json().project.sunoContext).toEqual({});
    } finally { await app.close(); }
  });
  it('rejects invalid mode before writing', async () => {
    const app = buildServer();
    try {
      const response = await app.inject({ method: 'PATCH', url: '/api/projects/p1', payload: { sunoContext: { mode: 'invented' } } });
      expect(response.statusCode).toBe(400);
      expect(project.update).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });
  it('does not modify another owner project', async () => {
    project.findFirst.mockResolvedValue(null);
    const app = buildServer();
    try {
      const response = await app.inject({ method: 'PATCH', url: '/api/projects/foreign', payload: { sunoContext } });
      expect(response.statusCode).toBe(404);
      expect(project.findFirst).toHaveBeenCalledWith({ where: { id: 'foreign', userId: user.id } });
      expect(project.update).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });
});
