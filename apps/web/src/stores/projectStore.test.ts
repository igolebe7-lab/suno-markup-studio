import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from '../lib/api';
import { useProjectStore } from './projectStore';

const initialProject = structuredClone(useProjectStore.getState().project);
const initialUi = structuredClone(useProjectStore.getState().ui);
const user = { id: 'user-1', email: 'tester@example.com' };

beforeEach(() => {
  useProjectStore.setState({
    project: { ...initialProject, id: 'project-local', title: 'Тестовый проект' },
    ui: { ...initialUi, activeView: 'editor' },
    user,
    projects: [],
    syncStatus: 'local',
    syncError: undefined,
    past: [],
    future: []
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('project store cloud sync', () => {
  it('creates a fresh local project draft', () => {
    const previousId = useProjectStore.getState().project.id;

    useProjectStore.getState().newProject();

    const state = useProjectStore.getState();
    expect(state.project.id).not.toBe(previousId);
    expect(state.project.title).toBe('Новый Suno проект');
    expect(state.syncStatus).toBe('local');
    expect(state.syncError).toBeUndefined();
    expect(state.ui.activeView).toBe('editor');
  });

  it('creates the project when update returns 404', async () => {
    const project = useProjectStore.getState().project;
    vi.spyOn(api, 'updateProject').mockRejectedValue(new ApiError(404, 'Not Found'));
    vi.spyOn(api, 'createProject').mockResolvedValue({ project });
    vi.spyOn(api, 'listProjects').mockResolvedValue({
      projects: [{ id: project.id, title: project.title, createdAt: project.createdAt, updatedAt: project.updatedAt }]
    });

    await useProjectStore.getState().syncProject();

    expect(api.createProject).toHaveBeenCalledWith(project);
    expect(useProjectStore.getState().syncStatus).toBe('synced');
    expect(useProjectStore.getState().projects).toHaveLength(1);
  });

  it('registers, saves the current project, and opens the account screen', async () => {
    const project = useProjectStore.getState().project;
    vi.spyOn(api, 'register').mockResolvedValue({ user });
    vi.spyOn(api, 'updateProject').mockRejectedValue(new ApiError(404, 'Not Found'));
    vi.spyOn(api, 'createProject').mockResolvedValue({ project });
    vi.spyOn(api, 'listProjects').mockResolvedValue({
      projects: [{ id: project.id, title: project.title, createdAt: project.createdAt, updatedAt: project.updatedAt }]
    });

    await useProjectStore.getState().register('tester@example.com', 'password123');

    expect(api.register).toHaveBeenCalledWith('tester@example.com', 'password123');
    expect(api.createProject).toHaveBeenCalledWith(project);
    expect(useProjectStore.getState().ui.activeView).toBe('account');
    expect(useProjectStore.getState().projects[0]?.title).toBe('Тестовый проект');
  });

  it('keeps login successful when loading cloud projects returns 401', async () => {
    useProjectStore.setState({ user: null, syncStatus: 'local', syncError: undefined });
    vi.spyOn(api, 'login').mockResolvedValue({ user });
    vi.spyOn(api, 'listProjects').mockRejectedValue(new ApiError(401, 'Unauthorized'));

    await expect(useProjectStore.getState().login('tester@example.com', 'password123')).resolves.toBeUndefined();

    expect(api.login).toHaveBeenCalledWith('tester@example.com', 'password123');
    expect(useProjectStore.getState().user).toEqual(user);
    expect(useProjectStore.getState().ui.activeView).toBe('account');
    expect(useProjectStore.getState().syncStatus).toBe('error');
    expect(useProjectStore.getState().syncError).toContain('проекты');
    expect(useProjectStore.getState().syncError).not.toBe('Unauthorized');
  });
});
