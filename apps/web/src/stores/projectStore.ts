import { create } from 'zustand';
import { presets } from '../data/presets';
import { tags } from '../data/tags';
import { insertLyricsTag as insertTagIntoLyrics } from '../domain/lyrics';
import { buildStylePrompt, parseStylePrompt } from '../domain/stylePrompt';
import { validateProject } from '../domain/validation';
import { ApiError, api, type UserResponse } from '../lib/api';
import type { CustomTagRequest, ProjectListItem, UpdateCustomTagRequest } from '@suno/shared';
import type { SunoMarkupProject, Tag } from '../domain/types';

const defaultLyrics = `[Intro: ambient pads, distant vocal chops]\n\n[Verse 1: soft female vocal, sparse synth bass]\nСнова город зажигает окна,\nЯ ловлю твой голос в проводах.\n\n[Pre-Chorus: building energy]\nИ чем ближе ночь, тем громче пульс...\n\n[Chorus: full production, wide harmonies, catchy hook]\nМы летим над крышами,\nГде никто нас не найдет.\n\n[Outro: fade out, analog synth reprise]\n[End]`;

const initialStyle = 'synth-pop, 1980s-inspired, nostalgic, 118 BPM, female lead vocal, analog synths, gated drums, polished mix, wide reverb, catchy chorus, avoid: heavy guitars';

const createProject = (): SunoMarkupProject => {
  const timestamp = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: 'Новый Suno проект',
    stylePrompt: initialStyle,
    lyrics: defaultLyrics,
    styleChips: tags
      .filter((tag) => parseStylePrompt(initialStyle).includes(tag.sunoText))
      .map((tag) => tag.id),
    selectedPresetId: 'synthwave',
    tagsUsed: [],
    warnings: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1
  };
};

type HistoryPoint = Pick<SunoMarkupProject, 'stylePrompt' | 'lyrics' | 'styleChips'>;

type UIState = {
  activeView: 'editor' | 'account';
  query: string;
  placementFilter: 'all' | 'style' | 'lyrics' | 'both';
  confidenceFilter: 'all' | 'official' | 'common' | 'experimental';
  categoryFilter: string;
  rawStyleDraft: string;
  favorites: string[];
  recent: string[];
  customTags: Tag[];
  darkMode: boolean;
};

type ProjectStore = {
  project: SunoMarkupProject;
  ui: UIState;
  user: UserResponse | null;
  projects: ProjectListItem[];
  syncStatus: 'local' | 'syncing' | 'synced' | 'error';
  syncError?: string;
  past: HistoryPoint[];
  future: HistoryPoint[];
  setTitle: (title: string) => void;
  newProject: () => void;
  setQuery: (query: string) => void;
  setFilter: <K extends keyof UIState>(key: K, value: UIState[K]) => void;
  setLyrics: (lyrics: string) => void;
  setRawStyleDraft: (value: string) => void;
  commitRawStyle: () => void;
  addStyleTag: (tagId: string) => void;
  appendStyleDescriptor: (descriptor: string) => void;
  removeStyleTag: (tagId: string) => void;
  insertLyricsTag: (tagText: string, cursor?: number) => void;
  applyPreset: (presetId: string, replaceLyrics: boolean) => void;
  toggleFavorite: (tagId: string) => void;
  validate: () => void;
  undo: () => void;
  redo: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrateAuth: () => Promise<void>;
  loadProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  loadCustomTags: () => Promise<void>;
  createCustomTag: (tag: CustomTagRequest) => Promise<Tag | undefined>;
  updateCustomTag: (id: string, tag: UpdateCustomTagRequest) => Promise<Tag | undefined>;
  deleteCustomTag: (id: string) => Promise<void>;
  syncProject: () => Promise<void>;
  hydrate: () => void;
  persist: () => void;
};

const storageKey = 'suno-markup-studio:v1';

function snapshot(project: SunoMarkupProject): HistoryPoint {
  return {
    stylePrompt: project.stylePrompt,
    lyrics: project.lyrics,
    styleChips: project.styleChips
  };
}

function touch(project: SunoMarkupProject, customTags: Tag[] = []): SunoMarkupProject {
  const warnings = validateProject(project, customTags);
  return {
    ...project,
    warnings,
    updatedAt: new Date().toISOString(),
    version: project.version + 1
  };
}

function availableTags(customTags: Tag[]): Tag[] {
  return [...tags, ...customTags];
}

function authErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function cloudErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 401) {
    return 'Аккаунт открыт, но облачные проекты не загрузились: браузер не подтвердил сессию. Проверьте настройки cookies/CORS для backend и попробуйте обновить список.';
  }
  if (error instanceof ApiError && error.status === 0) return error.message;
  if (error instanceof Error && error.message === 'Unauthorized') {
    return 'Аккаунт открыт, но облачные проекты не загрузились: сессия не подтверждена. Попробуйте обновить список или войти заново.';
  }
  return error instanceof Error ? error.message : fallback;
}

function safeStringList(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined;
}

function isStoredProject(value: unknown): value is SunoMarkupProject {
  if (!value || typeof value !== 'object') return false;
  const project = value as Partial<Record<keyof SunoMarkupProject, unknown>>;
  return typeof project.id === 'string'
    && typeof project.title === 'string'
    && project.title.trim().length > 0
    && project.title.length <= 160
    && typeof project.stylePrompt === 'string'
    && project.stylePrompt.length <= 40_000
    && typeof project.lyrics === 'string'
    && project.lyrics.length <= 250_000
    && safeStringList(project.styleChips) !== undefined
    && safeStringList(project.tagsUsed) !== undefined
    && Array.isArray(project.warnings)
    && typeof project.createdAt === 'string'
    && typeof project.updatedAt === 'string'
    && typeof project.version === 'number'
    && Number.isInteger(project.version)
    && project.version >= 0;
}

function parseStoredDraft(saved: string): { project: SunoMarkupProject; ui: Pick<UIState, 'favorites' | 'recent' | 'darkMode'> } | undefined {
  const parsed = JSON.parse(saved) as { project?: unknown; ui?: Record<string, unknown> };
  if (!isStoredProject(parsed.project)) return undefined;

  return {
    project: parsed.project,
    ui: {
      favorites: safeStringList(parsed.ui?.favorites) ?? [],
      recent: safeStringList(parsed.ui?.recent) ?? [],
      darkMode: typeof parsed.ui?.darkMode === 'boolean' ? parsed.ui.darkMode : false
    }
  };
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: touch(createProject()),
  ui: {
    activeView: 'editor',
    query: '',
    placementFilter: 'all',
    confidenceFilter: 'all',
    categoryFilter: 'all',
    rawStyleDraft: initialStyle,
    favorites: ['chorus', 'verse', 'bridge', 'outro'],
    recent: [],
    customTags: [],
    darkMode: false
  },
  user: null,
  projects: [],
  syncStatus: 'local',
  past: [],
  future: [],
  setTitle: (title) => set((state) => ({ project: touch({ ...state.project, title }, state.ui.customTags) })),
  newProject: () => {
    set((state) => {
      const project = touch(createProject(), state.ui.customTags);
      return {
      project,
      ui: { ...state.ui, rawStyleDraft: project.stylePrompt, activeView: 'editor' },
      syncStatus: 'local',
      syncError: undefined,
      past: [],
      future: []
      };
    });
  },
  setQuery: (query) => set((state) => ({ ui: { ...state.ui, query } })),
  setFilter: (key, value) => set((state) => ({ ui: { ...state.ui, [key]: value } })),
  setLyrics: (lyrics) =>
    set((state) => ({
      past: [...state.past.slice(-30), snapshot(state.project)],
      future: [],
      project: touch({ ...state.project, lyrics }, state.ui.customTags)
    })),
  setRawStyleDraft: (value) => set((state) => ({ ui: { ...state.ui, rawStyleDraft: value } })),
  commitRawStyle: () =>
    set((state) => ({
      past: [...state.past.slice(-30), snapshot(state.project)],
      future: [],
      project: touch({ ...state.project, stylePrompt: state.ui.rawStyleDraft }, state.ui.customTags)
    })),
  addStyleTag: (tagId) =>
    set((state) => {
      const allTags = availableTags(state.ui.customTags);
      const tag = allTags.find((item) => item.id === tagId);
      if (!tag || tag.placement === 'lyrics' || state.project.styleChips.includes(tagId)) return state;
      const styleChips = [...state.project.styleChips, tagId];
      const stylePrompt = buildStylePrompt(styleChips, state.project.stylePrompt, allTags);
      return {
        past: [...state.past.slice(-30), snapshot(state.project)],
        future: [],
        ui: { ...state.ui, rawStyleDraft: stylePrompt, recent: [tagId, ...state.ui.recent.filter((id) => id !== tagId)].slice(0, 12) },
        project: touch({ ...state.project, styleChips, stylePrompt }, state.ui.customTags)
      };
    }),
  appendStyleDescriptor: (descriptor) =>
    set((state) => {
      const clean = descriptor.trim().replace(/\s+/g, ' ');
      if (!clean) return state;
      const parts = parseStylePrompt(state.project.stylePrompt);
      const stylePrompt = parts.includes(clean) ? state.project.stylePrompt : [...parts, clean].join(', ');
      return {
        past: [...state.past.slice(-30), snapshot(state.project)],
        future: [],
        ui: { ...state.ui, rawStyleDraft: stylePrompt },
        project: touch({ ...state.project, stylePrompt }, state.ui.customTags)
      };
    }),
  removeStyleTag: (tagId) =>
    set((state) => {
      const styleChips = state.project.styleChips.filter((id) => id !== tagId);
      const stylePrompt = buildStylePrompt(styleChips, state.project.stylePrompt, availableTags(state.ui.customTags));
      return {
        past: [...state.past.slice(-30), snapshot(state.project)],
        future: [],
        ui: { ...state.ui, rawStyleDraft: stylePrompt },
        project: touch({ ...state.project, styleChips, stylePrompt }, state.ui.customTags)
      };
    }),
  insertLyricsTag: (tagText, cursor) =>
    set((state) => {
      const lyrics = insertTagIntoLyrics(state.project.lyrics, cursor ?? state.project.lyrics.length, tagText);
      return {
        past: [...state.past.slice(-30), snapshot(state.project)],
        future: [],
        project: touch({ ...state.project, lyrics, tagsUsed: [...new Set([...state.project.tagsUsed, tagText])] }, state.ui.customTags)
      };
    }),
  applyPreset: (presetId, replaceLyrics) =>
    set((state) => {
      const preset = presets.find((item) => item.id === presetId);
      if (!preset) return state;
      const styleChips = tags.filter((tag) => parseStylePrompt(preset.stylePrompt).includes(tag.sunoText)).map((tag) => tag.id);
      const next = {
        ...state.project,
        selectedPresetId: presetId,
        stylePrompt: preset.stylePrompt,
        styleChips,
        lyrics: replaceLyrics ? preset.structureTemplate : state.project.lyrics
      };
      return {
        past: [...state.past.slice(-30), snapshot(state.project)],
        future: [],
        ui: { ...state.ui, rawStyleDraft: preset.stylePrompt },
        project: touch(next, state.ui.customTags)
      };
    }),
  toggleFavorite: (tagId) =>
    set((state) => ({
      ui: {
        ...state.ui,
        favorites: state.ui.favorites.includes(tagId)
          ? state.ui.favorites.filter((id) => id !== tagId)
          : [tagId, ...state.ui.favorites]
      }
    })),
  validate: () => set((state) => ({ project: touch(state.project, state.ui.customTags) })),
  undo: () =>
    set((state) => {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        past: state.past.slice(0, -1),
        future: [snapshot(state.project), ...state.future],
        project: touch({ ...state.project, ...previous }, state.ui.customTags),
        ui: { ...state.ui, rawStyleDraft: previous.stylePrompt }
      };
    }),
  redo: () =>
    set((state) => {
      const next = state.future[0];
      if (!next) return state;
      return {
        past: [...state.past, snapshot(state.project)],
        future: state.future.slice(1),
        project: touch({ ...state.project, ...next }, state.ui.customTags),
        ui: { ...state.ui, rawStyleDraft: next.stylePrompt }
      };
    }),
  login: async (email, password) => {
    set({ syncStatus: 'syncing', syncError: undefined });
    let authenticatedUser: UserResponse;
    try {
      ({ user: authenticatedUser } = await api.login(email, password));
    } catch (error) {
      set({ syncStatus: 'error', syncError: authErrorMessage(error, 'Ошибка входа') });
      throw error;
    }
    set((state) => ({ user: authenticatedUser, syncStatus: 'synced', syncError: undefined, ui: { ...state.ui, activeView: 'account' } }));
    try {
      await get().loadProjects();
      await get().loadCustomTags();
      set({ syncStatus: 'synced', syncError: undefined });
    } catch (error) {
      set({ syncStatus: 'error', syncError: cloudErrorMessage(error, 'Не удалось загрузить проекты') });
    }
  },
  register: async (email, password) => {
    set({ syncStatus: 'syncing', syncError: undefined });
    let authenticatedUser: UserResponse;
    try {
      ({ user: authenticatedUser } = await api.register(email, password));
    } catch (error) {
      set({ syncStatus: 'error', syncError: authErrorMessage(error, 'Ошибка регистрации') });
      throw error;
    }
    set((state) => ({ user: authenticatedUser, syncStatus: 'synced', syncError: undefined, ui: { ...state.ui, activeView: 'account' } }));
    try {
      await get().syncProject();
      await get().loadProjects();
      await get().loadCustomTags();
    } catch (error) {
      set({ syncStatus: 'error', syncError: cloudErrorMessage(error, 'Не удалось сохранить проект после регистрации') });
    }
  },
  logout: async () => {
    await api.logout().catch(() => undefined);
    set((state) => ({ user: null, projects: [], syncStatus: 'local', syncError: undefined, ui: { ...state.ui, customTags: [], activeView: 'editor' } }));
  },
  hydrateAuth: async () => {
    try {
      const { user } = await api.me();
      set({ user, syncStatus: 'synced' });
      await get().loadProjects();
      await get().loadCustomTags();
    } catch {
      set((state) => ({ user: null, syncStatus: 'local', ui: { ...state.ui, customTags: [] } }));
    }
  },
  loadProjects: async () => {
    if (!get().user) return;
    try {
      const { projects } = await api.listProjects();
      set({ projects, syncError: undefined });
    } catch (error) {
      set({ syncStatus: 'error', syncError: cloudErrorMessage(error, 'Не удалось загрузить проекты') });
      throw error;
    }
  },
  loadProject: async (id) => {
    set({ syncStatus: 'syncing', syncError: undefined });
    try {
      const { project } = await api.getProject(id);
      set((state) => ({
        project,
        past: [...state.past.slice(-30), snapshot(state.project)],
        future: [],
        ui: { ...state.ui, rawStyleDraft: project.stylePrompt, activeView: 'editor' },
        syncStatus: 'synced'
      }));
    } catch (error) {
      set({ syncStatus: 'error', syncError: cloudErrorMessage(error, 'Не удалось загрузить проект') });
    }
  },
  deleteProject: async (id) => {
    if (!get().user) return;
    set({ syncStatus: 'syncing', syncError: undefined });
    try {
      await api.deleteProject(id);
      set((state) => ({
        projects: state.projects.filter((project) => project.id !== id),
        syncStatus: state.project.id === id ? 'local' : 'synced',
        syncError: undefined
      }));
    } catch (error) {
      set({ syncStatus: 'error', syncError: cloudErrorMessage(error, 'Не удалось удалить проект') });
    }
  },
  loadCustomTags: async () => {
    if (!get().user) return;
    try {
      const { tags: customTags } = await api.listCustomTags();
      set((state) => ({
        ui: { ...state.ui, customTags },
        project: touch(state.project, customTags),
        syncError: undefined
      }));
    } catch (error) {
      set({ syncStatus: 'error', syncError: cloudErrorMessage(error, 'Не удалось загрузить свои теги') });
      throw error;
    }
  },
  createCustomTag: async (tag) => {
    if (!get().user) {
      set({ syncStatus: 'error', syncError: 'Чтобы сохранять свои теги, войдите в аккаунт.' });
      return undefined;
    }
    set({ syncStatus: 'syncing', syncError: undefined });
    try {
      const { tag: savedTag } = await api.createCustomTag(tag);
      set((state) => ({
        ui: { ...state.ui, customTags: [savedTag, ...state.ui.customTags.filter((item) => item.id !== savedTag.id)], categoryFilter: 'custom' },
        project: touch(state.project, [savedTag, ...state.ui.customTags.filter((item) => item.id !== savedTag.id)]),
        syncStatus: 'synced'
      }));
      return savedTag;
    } catch (error) {
      set({ syncStatus: 'error', syncError: cloudErrorMessage(error, 'Не удалось сохранить свой тег') });
      throw error;
    }
  },
  updateCustomTag: async (id, tag) => {
    if (!get().user) return undefined;
    set({ syncStatus: 'syncing', syncError: undefined });
    try {
      const { tag: savedTag } = await api.updateCustomTag(id, tag);
      set((state) => ({
        ui: { ...state.ui, customTags: state.ui.customTags.map((item) => item.id === id ? savedTag : item) },
        project: touch(state.project, state.ui.customTags.map((item) => item.id === id ? savedTag : item)),
        syncStatus: 'synced'
      }));
      return savedTag;
    } catch (error) {
      set({ syncStatus: 'error', syncError: cloudErrorMessage(error, 'Не удалось обновить свой тег') });
      throw error;
    }
  },
  deleteCustomTag: async (id) => {
    if (!get().user) return;
    set({ syncStatus: 'syncing', syncError: undefined });
    try {
      await api.deleteCustomTag(id);
      set((state) => {
        const customTags = state.ui.customTags.filter((tag) => tag.id !== id);
        const favorites = state.ui.favorites.filter((tagId) => tagId !== id);
        const recent = state.ui.recent.filter((tagId) => tagId !== id);
        const styleChips = state.project.styleChips.filter((tagId) => tagId !== id);
        const stylePrompt = buildStylePrompt(styleChips, state.project.stylePrompt, availableTags(customTags));
        return {
          ui: { ...state.ui, customTags, favorites, recent },
          project: touch({ ...state.project, styleChips, stylePrompt }, customTags),
          syncStatus: 'synced',
          syncError: undefined
        };
      });
    } catch (error) {
      set({ syncStatus: 'error', syncError: cloudErrorMessage(error, 'Не удалось удалить свой тег') });
      throw error;
    }
  },
  syncProject: async () => {
    const { user, project } = get();
    if (!user) return;
    set({ syncStatus: 'syncing', syncError: undefined });
    try {
      let response;
      try {
        response = await api.updateProject(project);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          response = await api.createProject(project);
        } else {
          throw error;
        }
      }
      set((state) => ({
        project: response.project,
        ui: { ...state.ui, rawStyleDraft: response.project.stylePrompt },
        syncStatus: 'synced'
      }));
      await get().loadProjects();
    } catch (error) {
      set({ syncStatus: 'error', syncError: cloudErrorMessage(error, 'Не удалось сохранить проект') });
    }
  },
  hydrate: () => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const parsed = parseStoredDraft(saved);
      if (!parsed) {
        localStorage.removeItem(storageKey);
        return;
      }
      set((state) => ({
        project: touch(parsed.project, state.ui.customTags),
        ui: { ...state.ui, ...parsed.ui, rawStyleDraft: parsed.project.stylePrompt }
      }));
    } catch {
      localStorage.removeItem(storageKey);
    }
  },
  persist: () => {
    const { project, ui } = get();
    localStorage.setItem(storageKey, JSON.stringify({ project, ui: { favorites: ui.favorites, recent: ui.recent, darkMode: ui.darkMode } }));
  }
}));
