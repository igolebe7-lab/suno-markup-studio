import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from '../lib/api';
import { tags } from '../data/tags';
import { useProjectStore } from './projectStore';
import type { Tag } from '../domain/types';

const initialProject = structuredClone(useProjectStore.getState().project);
const initialUi = structuredClone(useProjectStore.getState().ui);
const user = { id: 'user-1', email: 'tester@example.com' };
const preparation = { fragment: 'last chorus', change: 'choir', preserve: 'tempo', result: 'manual' };

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
  it('keeps preparation per project without altering editor history', () => {
    const original = useProjectStore.getState().project;
    useProjectStore.getState().setSunoContext({ modelId: ' v6 ', notes: ' note ' });
    useProjectStore.getState().setSectionEditRequest(preparation);
    expect(useProjectStore.getState().project).toMatchObject({ id: original.id, lyrics: original.lyrics, stylePrompt: original.stylePrompt, sunoContext: { modelId: 'v6', notes: 'note' }, sectionEditRequest: preparation });
    expect(useProjectStore.getState().project.version).toBeGreaterThan(original.version);
    useProjectStore.getState().setLyrics('changed');
    useProjectStore.getState().undo();
    useProjectStore.getState().redo();
    expect(useProjectStore.getState().project.sectionEditRequest).toEqual(preparation);
    useProjectStore.getState().duplicateProject();
    expect(useProjectStore.getState().project.sectionEditRequest).toEqual(preparation);
    useProjectStore.getState().persist();
    useProjectStore.getState().newProject();
    expect(useProjectStore.getState().project.sectionEditRequest).toBeUndefined();
    useProjectStore.getState().hydrate();
    expect(useProjectStore.getState().project.sectionEditRequest).toEqual(preparation);
    useProjectStore.getState().setSunoContext({ notes: '   ' });
    expect(useProjectStore.getState().project.sunoContext).toEqual({});
  });

  it('rejects invalid optional imports but recovers malformed local metadata without losing lyrics', () => {
    const original = useProjectStore.getState().project;
    expect(() => useProjectStore.getState().importProject({ ...original, sunoContext: { mode: 'invented' } })).toThrow('Некорректный JSON проекта');
    expect(() => useProjectStore.getState().importProject({ ...original, sectionEditRequest: { ...preparation, result: 'x'.repeat(80_001) } })).toThrow();
    expect(useProjectStore.getState().project).toBe(original);
    localStorage.setItem('suno-markup-studio:v1', JSON.stringify({ project: { ...original, sunoContext: { mode: 'invented' } }, ui: {} }));
    useProjectStore.getState().hydrate();
    expect(useProjectStore.getState().project.lyrics).toBe(original.lyrics);
    expect(useProjectStore.getState().project.sunoContext).toBeUndefined();
  });

  it('does not overwrite edits made during a cloud save', async () => {
    useProjectStore.getState().setSectionEditRequest(preparation);
    const sent = useProjectStore.getState().project;
    let resolve!: (value: { project: typeof sent }) => void;
    vi.spyOn(api, 'updateProject').mockReturnValue(new Promise((done) => { resolve = done; }));
    vi.spyOn(api, 'listProjects').mockResolvedValue({ projects: [] });
    const saving = useProjectStore.getState().syncProject();
    useProjectStore.getState().setSectionEditRequest({ ...preparation, result: 'newer' });
    resolve({ project: sent });
    await saving;
    expect(useProjectStore.getState().project.sectionEditRequest?.result).toBe('newer');
    expect(useProjectStore.getState().syncStatus).toBe('local');
  });

  it('ignores save responses after switching projects', async () => {
    const sent = useProjectStore.getState().project;
    let resolve!: (value: { project: typeof sent }) => void;
    vi.spyOn(api, 'updateProject').mockReturnValue(new Promise((done) => { resolve = done; }));
    vi.spyOn(api, 'listProjects').mockResolvedValue({ projects: [] });
    const saving = useProjectStore.getState().syncProject();
    useProjectStore.getState().newProject();
    const newId = useProjectStore.getState().project.id;
    resolve({ project: sent });
    await saving;
    expect(useProjectStore.getState().project.id).toBe(newId);
  });
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

  it('renames the current project without changing its id', () => {
    const previousId = useProjectStore.getState().project.id;

    useProjectStore.getState().setTitle('Переименованный проект');

    const state = useProjectStore.getState();
    expect(state.project.id).toBe(previousId);
    expect(state.project.title).toBe('Переименованный проект');
    expect(state.syncStatus).toBe('local');
  });

  it('marks cloud project as local after unsaved edits', () => {
    useProjectStore.setState({ syncStatus: 'synced' });

    useProjectStore.getState().setLyrics('[Verse]\nНовый текст');

    expect(useProjectStore.getState().syncStatus).toBe('local');
  });

  it('keeps exclusions through undo and redo', () => {
    useProjectStore.getState().setExcludePrompt('no drums');
    expect(useProjectStore.getState().project.excludePrompt).toBe('no drums');
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().project.excludePrompt).toBe(initialProject.excludePrompt);
    useProjectStore.getState().redo();
    expect(useProjectStore.getState().project.excludePrompt).toBe('no drums');
  });

  it('sends catalog avoid tags to Exclude, not Style', () => {
    const avoidTag = tags.find((tag) => tag.category === 'avoid');
    expect(avoidTag).toBeDefined();
    const style = useProjectStore.getState().project.stylePrompt;
    useProjectStore.getState().addStyleTag(avoidTag!.id);
    expect(useProjectStore.getState().project.stylePrompt).toBe(style);
    expect(useProjectStore.getState().project.excludePrompt).toContain(avoidTag!.sunoText.replace(/^avoid:\s*/, ''));
  });

  it('duplicates current project as a new local draft', () => {
    const previous = useProjectStore.getState().project;

    useProjectStore.getState().duplicateProject();

    const state = useProjectStore.getState();
    expect(state.project.id).not.toBe(previous.id);
    expect(state.project.title).toBe('Копия - Тестовый проект');
    expect(state.project.lyrics).toBe(previous.lyrics);
    expect(state.syncStatus).toBe('local');
  });

  it('imports a valid JSON project as a local draft', () => {
    useProjectStore.getState().importProject({
      ...initialProject,
      id: 'imported-project',
      title: 'Импортированный проект',
      stylePrompt: 'ambient pop',
      lyrics: '[Verse]\nИмпорт',
      styleChips: [],
      tagsUsed: [],
      warnings: []
    });

    const state = useProjectStore.getState();
    expect(state.project.id).toBe('imported-project');
    expect(state.project.title).toBe('Импортированный проект');
    expect(state.ui.rawStyleDraft).toBe('ambient pop');
    expect(state.syncStatus).toBe('local');
  });

  it('rejects invalid JSON project imports without replacing the current draft', () => {
    const previous = useProjectStore.getState().project;

    expect(() => useProjectStore.getState().importProject({ title: '', lyrics: 42 })).toThrow('Некорректный JSON проекта');

    expect(useProjectStore.getState().project).toBe(previous);
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

  it('loads custom tags after login and clears them on logout', async () => {
    const customTag = {
      id: 'custom-drop',
      label: 'Drop Marker',
      sunoText: '[Drop]',
      category: 'custom',
      placement: 'lyrics',
      confidence: 'experimental',
      aliases: ['drop'],
      descriptionRu: 'Пользовательский тег для дропа.',
      parameters: [],
      examples: ['[Drop]']
    } satisfies Tag;
    useProjectStore.setState({ user: null, ui: { ...initialUi, activeView: 'editor', customTags: [] } });
    vi.spyOn(api, 'login').mockResolvedValue({ user });
    vi.spyOn(api, 'listProjects').mockResolvedValue({ projects: [] });
    vi.spyOn(api, 'listCustomTags').mockResolvedValue({ tags: [customTag] });
    vi.spyOn(api, 'logout').mockResolvedValue({ ok: true });

    await useProjectStore.getState().login('tester@example.com', 'password123');

    expect(useProjectStore.getState().ui.customTags).toEqual([customTag]);

    await useProjectStore.getState().logout();

    expect(useProjectStore.getState().ui.customTags).toEqual([]);
  });

  it('deletes only custom tags and cleans references', async () => {
    const customTag = {
      id: 'custom-drop',
      label: 'Drop Marker',
      sunoText: '[Drop]',
      category: 'custom',
      placement: 'both',
      confidence: 'experimental',
      aliases: ['drop'],
      descriptionRu: 'Пользовательский тег для дропа.',
      parameters: [],
      examples: ['[Drop]']
    } satisfies Tag;
    useProjectStore.setState({
      ui: {
        ...initialUi,
        customTags: [customTag],
        favorites: ['custom-drop', 'chorus'],
        recent: ['custom-drop', 'verse']
      },
      project: { ...initialProject, styleChips: ['custom-drop', 'genre-pop'] }
    });
    vi.spyOn(api, 'deleteCustomTag').mockResolvedValue({ ok: true });

    await useProjectStore.getState().deleteCustomTag('custom-drop');

    const state = useProjectStore.getState();
    expect(api.deleteCustomTag).toHaveBeenCalledWith('custom-drop');
    expect(state.ui.customTags).toHaveLength(0);
    expect(state.ui.favorites).toEqual(['chorus']);
    expect(state.ui.recent).toEqual(['verse']);
    expect(state.project.styleChips).toEqual(['genre-pop']);
  });

  it('ignores invalid localStorage drafts instead of hydrating unsafe shapes', () => {
    const removeItem = vi.fn();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => JSON.stringify({
        project: { title: '', lyrics: 42 },
        ui: { favorites: 'not-array', recent: [1, 2], darkMode: 'yes' }
      })),
      setItem: vi.fn(),
      removeItem
    });
    const before = useProjectStore.getState().project;

    useProjectStore.getState().hydrate();

    expect(useProjectStore.getState().project).toBe(before);
    expect(removeItem).toHaveBeenCalledWith('suno-markup-studio:v1');
  });

  it('hydrates only the safe localStorage UI subset', () => {
    const savedProject = {
      ...initialProject,
      id: 'saved-project',
      title: 'Сохраненный черновик',
      stylePrompt: 'ambient pop',
      lyrics: '[Verse]\nТекст',
      styleChips: [],
      tagsUsed: [],
      warnings: []
    };
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => JSON.stringify({
        project: savedProject,
        ui: {
          favorites: ['verse'],
          recent: ['chorus'],
          darkMode: true,
          customTags: [{ id: 'unsafe-custom-tag' }],
          activeView: 'account'
        }
      })),
      setItem: vi.fn(),
      removeItem: vi.fn()
    });

    useProjectStore.getState().hydrate();

    const state = useProjectStore.getState();
    expect(state.project.id).toBe('saved-project');
    expect(state.ui.favorites).toEqual(['verse']);
    expect(state.ui.recent).toEqual(['chorus']);
    expect(state.ui.darkMode).toBe(true);
    expect(state.ui.customTags).toEqual([]);
    expect(state.ui.activeView).toBe('editor');
  });
});
