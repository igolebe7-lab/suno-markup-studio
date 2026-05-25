import { create } from 'zustand';
import { presets } from '../data/presets';
import { tags, tagById } from '../data/tags';
import { insertLyricsTag as insertTagIntoLyrics } from '../domain/lyrics';
import { buildStylePrompt, parseStylePrompt } from '../domain/stylePrompt';
import { validateProject } from '../domain/validation';
import { ApiError, api, type UserResponse } from '../lib/api';
import type { ProjectListItem } from '@suno/shared';
import type { SunoMarkupProject } from '../domain/types';

const now = new Date().toISOString();
const defaultLyrics = `[Intro: ambient pads, distant vocal chops]\n\n[Verse 1: soft female vocal, sparse synth bass]\nСнова город зажигает окна,\nЯ ловлю твой голос в проводах.\n\n[Pre-Chorus: building energy]\nИ чем ближе ночь, тем громче пульс...\n\n[Chorus: full production, wide harmonies, catchy hook]\nМы летим над крышами,\nГде никто нас не найдет.\n\n[Outro: fade out, analog synth reprise]\n[End]`;

const initialStyle = 'synth-pop, 1980s-inspired, nostalgic, 118 BPM, female lead vocal, analog synths, gated drums, polished mix, wide reverb, catchy chorus, avoid: heavy guitars';

const createProject = (): SunoMarkupProject => ({
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
  createdAt: now,
  updatedAt: now,
  version: 1
});

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
  customTags: string[];
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

function touch(project: SunoMarkupProject): SunoMarkupProject {
  const warnings = validateProject(project);
  return {
    ...project,
    warnings,
    updatedAt: new Date().toISOString(),
    version: project.version + 1
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
  setTitle: (title) => set((state) => ({ project: touch({ ...state.project, title }) })),
  setQuery: (query) => set((state) => ({ ui: { ...state.ui, query } })),
  setFilter: (key, value) => set((state) => ({ ui: { ...state.ui, [key]: value } })),
  setLyrics: (lyrics) =>
    set((state) => ({
      past: [...state.past.slice(-30), snapshot(state.project)],
      future: [],
      project: touch({ ...state.project, lyrics })
    })),
  setRawStyleDraft: (value) => set((state) => ({ ui: { ...state.ui, rawStyleDraft: value } })),
  commitRawStyle: () =>
    set((state) => ({
      past: [...state.past.slice(-30), snapshot(state.project)],
      future: [],
      project: touch({ ...state.project, stylePrompt: state.ui.rawStyleDraft })
    })),
  addStyleTag: (tagId) =>
    set((state) => {
      const tag = tagById.get(tagId);
      if (!tag || tag.placement === 'lyrics' || state.project.styleChips.includes(tagId)) return state;
      const styleChips = [...state.project.styleChips, tagId];
      const stylePrompt = buildStylePrompt(styleChips, state.project.stylePrompt);
      return {
        past: [...state.past.slice(-30), snapshot(state.project)],
        future: [],
        ui: { ...state.ui, rawStyleDraft: stylePrompt, recent: [tagId, ...state.ui.recent.filter((id) => id !== tagId)].slice(0, 12) },
        project: touch({ ...state.project, styleChips, stylePrompt })
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
        project: touch({ ...state.project, stylePrompt })
      };
    }),
  removeStyleTag: (tagId) =>
    set((state) => {
      const styleChips = state.project.styleChips.filter((id) => id !== tagId);
      const stylePrompt = buildStylePrompt(styleChips, state.project.stylePrompt);
      return {
        past: [...state.past.slice(-30), snapshot(state.project)],
        future: [],
        ui: { ...state.ui, rawStyleDraft: stylePrompt },
        project: touch({ ...state.project, styleChips, stylePrompt })
      };
    }),
  insertLyricsTag: (tagText, cursor) =>
    set((state) => {
      const lyrics = insertTagIntoLyrics(state.project.lyrics, cursor ?? state.project.lyrics.length, tagText);
      return {
        past: [...state.past.slice(-30), snapshot(state.project)],
        future: [],
        project: touch({ ...state.project, lyrics, tagsUsed: [...new Set([...state.project.tagsUsed, tagText])] })
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
        project: touch(next)
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
  validate: () => set((state) => ({ project: touch(state.project) })),
  undo: () =>
    set((state) => {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        past: state.past.slice(0, -1),
        future: [snapshot(state.project), ...state.future],
        project: touch({ ...state.project, ...previous }),
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
        project: touch({ ...state.project, ...next }),
        ui: { ...state.ui, rawStyleDraft: next.stylePrompt }
      };
    }),
  login: async (email, password) => {
    set({ syncStatus: 'syncing', syncError: undefined });
    try {
      const { user } = await api.login(email, password);
      set((state) => ({ user, syncStatus: 'synced', ui: { ...state.ui, activeView: 'account' } }));
      await get().loadProjects();
      await get().syncProject();
    } catch (error) {
      set({ syncStatus: 'error', syncError: error instanceof Error ? error.message : 'Ошибка входа' });
      throw error;
    }
  },
  register: async (email, password) => {
    set({ syncStatus: 'syncing', syncError: undefined });
    try {
      const { user } = await api.register(email, password);
      set((state) => ({ user, syncStatus: 'synced', ui: { ...state.ui, activeView: 'account' } }));
      await get().syncProject();
      await get().loadProjects();
    } catch (error) {
      set({ syncStatus: 'error', syncError: error instanceof Error ? error.message : 'Ошибка регистрации' });
      throw error;
    }
  },
  logout: async () => {
    await api.logout().catch(() => undefined);
    set((state) => ({ user: null, projects: [], syncStatus: 'local', syncError: undefined, ui: { ...state.ui, activeView: 'editor' } }));
  },
  hydrateAuth: async () => {
    try {
      const { user } = await api.me();
      set({ user, syncStatus: 'synced' });
      await get().loadProjects();
    } catch {
      set({ user: null, syncStatus: 'local' });
    }
  },
  loadProjects: async () => {
    if (!get().user) return;
    const { projects } = await api.listProjects();
    set({ projects });
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
      set({ syncStatus: 'error', syncError: error instanceof Error ? error.message : 'Не удалось загрузить проект' });
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
      set({ syncStatus: 'error', syncError: error instanceof Error ? error.message : 'Не удалось удалить проект' });
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
      set({ syncStatus: 'error', syncError: error instanceof Error ? error.message : 'Не удалось сохранить проект' });
    }
  },
  hydrate: () => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { project: SunoMarkupProject; ui: Partial<UIState> };
      set((state) => ({
        project: touch(parsed.project),
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
