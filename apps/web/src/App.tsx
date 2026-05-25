import { EditorView, basicSetup } from 'codemirror';
import { autocompletion, CompletionContext } from '@codemirror/autocomplete';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView as CodeMirrorView, ViewPlugin, ViewUpdate, keymap } from '@codemirror/view';
import { tags } from './data/tags';
import { presets } from './data/presets';
import { exportBoth, exportJson, exportLyrics, exportMarkdown, exportStyle, exportTxt } from './domain/exporters';
import { extractOutline } from './domain/lyrics';
import {
  buildConfiguredTagText,
  buildTagSettingProfile,
  createInitialTagSettings,
  settingCatalog,
  type TagSettingField,
  type TagSettingProfile,
  type TagSettingState,
  type TagSettingsTarget
} from './domain/tagSettings';
import { useProjectStore } from './stores/projectStore';
import { AlertTriangle, Braces, CheckCircle2, ChevronDown, Cloud, Copy, Download, FilePlus2, FolderOpen, LogIn, LogOut, Moon, RefreshCw, Save, Search, SlidersHorizontal, Star, Sun, Trash2, Undo2, Redo2, UserCircle, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent as ReactDragEvent } from 'react';
import Fuse from 'fuse.js';
import type { Tag } from './domain/types';
import type { CustomTagRequest } from '@suno/shared';

const dragMime = 'application/suno-tag-id';
let activeDragTagId = '';

const categoryLabels: Record<string, string> = {
  all: 'Все',
  structure: 'Структура',
  vocal: 'Вокал',
  instrument: 'Инструменты',
  dynamics: 'Динамика',
  production: 'Продакшн',
  genre: 'Жанр',
  subgenre: 'Поджанр',
  mood: 'Настроение',
  tempo: 'Темп',
  rhythm: 'Ритм',
  era: 'Эпоха',
  language: 'Язык',
  avoid: 'Исключить',
  custom: 'Свои теги'
};

const styleLaneOrder = [
  'genre',
  'mood',
  'tempo',
  'vocal',
  'instrument',
  'production',
  'avoid',
  'custom'
] as const;

const confidenceLabels: Record<Tag['confidence'], string> = {
  official: 'официальная/глоссарная основа',
  common: 'частая практика',
  experimental: 'экспериментально'
};

const confidenceShortLabels: Record<Tag['confidence'], string> = {
  official: 'проверенный',
  common: 'частый',
  experimental: 'экспериментальный'
};

const placementLabels: Record<Tag['placement'], string> = {
  style: 'Стиль',
  lyrics: 'Текст песни',
  both: 'Стиль + текст'
};

const syncStatusLabels = {
  local: 'Локально',
  syncing: 'Сохраняем',
  synced: 'Сохранено',
  error: 'Ошибка сохранения'
} as const;

type PendingTagDrop = {
  tag: Tag;
  target: TagSettingsTarget;
  cursor?: number;
};

const tagMark = Decoration.mark({ class: 'cm-sunoTag' });
const tagHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) this.decorations = this.build(update.view);
    }
    build(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>();
      for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        const re = /\[[^\]]+\]/g;
        let match;
        while ((match = re.exec(text))) builder.add(from + match.index, from + match.index + match[0].length, tagMark);
      }
      return builder.finish();
    }
  },
  { decorations: (value) => value.decorations }
);

const bracketHighlight = HighlightStyle.define([]);

function completeTags(context: CompletionContext) {
  const word = context.matchBefore(/\[[\w\s:-]*/);
  if (!word) return null;
  return {
    from: word.from + 1,
    options: tags
      .filter((tag) => tag.placement !== 'style' && tag.sunoText.startsWith('['))
      .map((tag) => ({
        label: tag.sunoText.replace(/^\[/, ''),
        type: 'keyword',
        apply: tag.sunoText.replace(/^\[/, '')
      }))
  };
}

function getDraggedTag(event: ReactDragEvent, availableTags: Tag[]): Tag | undefined {
  const id = event.dataTransfer.getData(dragMime) || activeDragTagId;
  return availableTags.find((tag) => tag.id === id);
}

function getPlacementHint(tag: Tag): string {
  if (tag.placement === 'style') return 'Используется в описании стиля как текстовый дескриптор без квадратных скобок.';
  if (tag.placement === 'lyrics') return 'Используется в тексте песни как отдельная строка-метатег в квадратных скобках.';
  return 'Можно использовать и в описании стиля, и в тексте песни; в тексте лучше ставить отдельной строкой.';
}

function getTagDetailedDescription(tag: Tag, profile: TagSettingProfile): string {
  return `${tag.descriptionRu}. ${getPlacementHint(tag)} ${profile.guidance}`;
}

function AppHeader() {
  const {
    project,
    ui,
    user,
    projects,
    syncStatus,
    syncError,
    setTitle,
    newProject,
    applyPreset,
    validate,
    undo,
    redo,
    setFilter,
    loadProject,
    syncProject,
    logout
  } = useProjectStore();
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const [openMenu, setOpenMenu] = useState<'project' | 'account' | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [projectNameMode, setProjectNameMode] = useState<'save' | 'rename' | null>(null);

  const closeMenus = () => setOpenMenu(null);
  const createFreshProject = () => {
    closeMenus();
    if (confirm('Создать новый локальный проект? Текущий проект останется только если он сохранён.')) newProject();
  };
  const openAuth = (mode: 'login' | 'register') => {
    closeMenus();
    setAuthMode(mode);
  };

  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-mark"><Braces size={18} /></div>
        <div>
          <div className="brand-title">Suno Markup Studio</div>
          <label className="project-title-row">
            <span>Проект</span>
            <input value={project.title} onChange={(event) => setTitle(event.target.value)} className="project-title" aria-label="Название проекта" />
          </label>
        </div>
      </div>
      <div className="header-actions">
        <div className="header-menu">
          <button
            className="button secondary menu-trigger"
            onClick={() => setOpenMenu(openMenu === 'project' ? null : 'project')}
            aria-expanded={openMenu === 'project'}
          >
            <FolderOpen size={16} />Проект<ChevronDown size={14} />
          </button>
          {openMenu === 'project' && (
            <div className="menu-panel project-menu-panel" role="menu">
              <button role="menuitem" onClick={createFreshProject}><FilePlus2 size={15} />Новый проект</button>
              <button role="menuitem" onClick={() => { closeMenus(); setProjectNameMode('save'); }}><Save size={15} />Сохранить как...</button>
              <button role="menuitem" onClick={() => { closeMenus(); setProjectNameMode('rename'); }}>Переименовать...</button>
              <button role="menuitem" onClick={() => { closeMenus(); void syncProject(); }} disabled={!user}><Save size={15} />Сохранить изменения</button>
              <div className="menu-divider" />
              <div className="menu-label">Открыть сохранённый</div>
              {user ? (
                projects.length ? projects.map((item) => (
                  <button
                    role="menuitem"
                    className={item.id === project.id ? 'active' : ''}
                    key={item.id}
                    onClick={() => {
                      closeMenus();
                      void loadProject(item.id);
                    }}
                  >
                    <span>{item.title}</span>
                    <small>{new Date(item.updatedAt).toLocaleDateString('ru-RU')}</small>
                  </button>
                )) : <p className="menu-empty">Сохранённых проектов пока нет.</p>
              ) : (
                <button role="menuitem" onClick={() => openAuth('login')}><LogIn size={15} />Войти для сохранения</button>
              )}
            </div>
          )}
        </div>
        <select
          className="select"
          value={project.selectedPresetId}
          onChange={(event) => {
            const replaceLyrics = project.lyrics.trim().length < 20 || confirm('Заменить текущую структуру текста песни шаблоном пресета?');
            applyPreset(event.target.value, replaceLyrics);
          }}
          aria-label="Пресет"
        >
          {presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
        </select>
        <button className="icon-button" onClick={undo} aria-label="Отменить действие"><Undo2 size={17} /></button>
        <button className="icon-button" onClick={redo} aria-label="Повторить действие"><Redo2 size={17} /></button>
        <button className="button secondary" onClick={validate}><CheckCircle2 size={16} />Проверить проект</button>
        <button className="button primary" onClick={() => setExportOpen(true)}><Download size={16} />Экспорт</button>
        <div className="header-menu">
          <button
            className={`button secondary menu-trigger ${ui.activeView === 'account' ? 'active' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'account' ? null : 'account')}
            aria-expanded={openMenu === 'account'}
          >
            <UserCircle size={16} />Аккаунт<ChevronDown size={14} />
          </button>
          {openMenu === 'account' && (
            <div className="menu-panel account-menu-panel" role="menu">
              <button role="menuitem" onClick={() => { closeMenus(); setFilter('activeView', 'editor'); }}>Редактор</button>
              <button role="menuitem" onClick={() => { closeMenus(); setFilter('activeView', 'account'); }}>Аккаунт</button>
              <button role="menuitem" onClick={() => setFilter('darkMode', !ui.darkMode)}>
                {ui.darkMode ? <Sun size={15} /> : <Moon size={15} />}
                {ui.darkMode ? 'Светлая тема' : 'Тёмная тема'}
              </button>
              <div className="menu-divider" />
              <span className={`sync-pill ${syncStatus}`} title={syncError}>{syncStatusLabels[syncStatus]}</span>
              {user ? (
                <>
                  <p className="menu-user">{user.email}</p>
                  <button role="menuitem" onClick={() => { closeMenus(); void logout(); }}><LogOut size={15} />Выйти</button>
                </>
              ) : (
                <>
                  <button role="menuitem" onClick={() => openAuth('login')}><LogIn size={15} />Войти</button>
                  <button role="menuitem" onClick={() => openAuth('register')}>Регистрация</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {authMode && <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} />}
      {exportOpen && <ExportDrawer onClose={() => setExportOpen(false)} />}
      {projectNameMode && (
        <ProjectNameModal
          mode={projectNameMode}
          onClose={() => setProjectNameMode(null)}
          onAuthRequest={(mode) => {
            setProjectNameMode(null);
            setAuthMode(mode);
          }}
        />
      )}
    </header>
  );
}

function AuthModal({ initialMode, onClose }: { initialMode: 'login' | 'register'; onClose: () => void }) {
  const { login, register, syncStatus, syncError } = useProjectStore();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  async function submit() {
    setLocalError('');
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password);
      onClose();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Не удалось выполнить запрос');
    }
  }

  return (
    <div className="tag-settings-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="auth-panel" role="dialog" aria-modal="true" aria-label="Вход в аккаунт">
        <div className="settings-head">
          <div>
            <div className="settings-kicker"><Cloud size={14} /> Аккаунт</div>
            <h2>{mode === 'login' ? 'Вход' : 'Регистрация'}</h2>
            <p>После входа проекты сохраняются на сервере и доступны с других устройств.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть вход"><X size={17} /></button>
        </div>
        <label className="settings-custom">
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
        </label>
        <label className="settings-custom">
          Пароль
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </label>
        {(localError || syncError) && <p className="auth-error">{localError || syncError}</p>}
        <div className="settings-actions">
          <button className="button primary" onClick={submit} disabled={syncStatus === 'syncing'}>
            {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
          <button className="button secondary" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Создать аккаунт' : 'Уже есть аккаунт'}
          </button>
        </div>
      </section>
    </div>
  );
}

function ProjectNameModal({
  mode,
  onClose,
  onAuthRequest
}: {
  mode: 'save' | 'rename';
  onClose: () => void;
  onAuthRequest: (mode: 'login' | 'register') => void;
}) {
  const { project, user, setTitle, syncProject } = useProjectStore();
  const [title, setDraftTitle] = useState(project.title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cleanTitle = title.trim();
  const canSubmit = cleanTitle.length > 0 && !saving;

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    setTitle(cleanTitle);
    if (!user) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await syncProject();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Не удалось сохранить проект');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="tag-settings-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="project-name-modal" data-testid="project-name-modal" role="dialog" aria-modal="true" aria-label="Название проекта">
        <div className="settings-head">
          <div>
            <div className="settings-kicker"><FolderOpen size={14} /> Проект</div>
            <h2>{mode === 'save' ? 'Сохранить проект' : 'Переименовать проект'}</h2>
            <p className="settings-short-description">
              {user ? 'Название сохранится в текущий проект на сервере.' : 'Название будет сохранено локально. Для сохранения на сервере нужно войти.'}
            </p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть окно проекта"><X size={17} /></button>
        </div>
        <label className="settings-custom">
          Название проекта
          <input value={title} onChange={(event) => setDraftTitle(event.target.value)} autoFocus />
        </label>
        {error && <div className="auth-error">{error}</div>}
        <div className="settings-actions">
          <button className="button primary" onClick={submit} disabled={!canSubmit}>
            {user ? (saving ? 'Сохраняем...' : 'Сохранить') : 'Сохранить название'}
          </button>
          {!user && <button className="button secondary" onClick={() => onAuthRequest('login')}><LogIn size={16} />Войти для сохранения</button>}
          <button className="button secondary" onClick={onClose}>Отмена</button>
        </div>
      </section>
    </div>
  );
}

function DraggableTag({ tag, onConfigure }: { tag: Tag; onConfigure: (tag: Tag) => void }) {
  const { toggleFavorite, ui } = useProjectStore();

  return (
    <div className="tag-row" data-testid={`tag-${tag.id}`}>
      <button
        className="drag-handle"
        aria-label={`Перетащить ${tag.label}`}
        draggable
        onDragStart={(event) => {
          activeDragTagId = tag.id;
          event.dataTransfer.effectAllowed = 'copy';
          event.dataTransfer.setData(dragMime, tag.id);
          event.dataTransfer.setData('text/plain', tag.sunoText);
        }}
        onDragEnd={() => {
          activeDragTagId = '';
        }}
      >
        <span aria-hidden="true">⋮⋮</span>
      </button>
      <button className="star" onClick={() => toggleFavorite(tag.id)} aria-label="Избранное">
        <Star size={14} fill={ui.favorites.includes(tag.id) ? 'currentColor' : 'none'} />
      </button>
      <button
        className="tag-main"
        onClick={() => onConfigure(tag)}
        aria-label={`Настроить ${tag.label}`}
      >
        <span>{tag.label}</span>
        <small>{categoryLabels[tag.category]} · {confidenceShortLabels[tag.confidence]}</small>
        <em>{tag.descriptionRu}</em>
      </button>
    </div>
  );
}

function normalizeCustomTagText(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) return trimmed;
  return `[${trimmed.replace(/^\[/, '').replace(/\]$/, '')}]`;
}

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function CustomTagBuilder({ tag, onClose }: { tag?: Tag; onClose: () => void }) {
  const { createCustomTag, updateCustomTag } = useProjectStore();
  const [label, setLabel] = useState(tag?.label ?? '');
  const [sunoText, setSunoText] = useState(tag?.sunoText ?? '');
  const [placement, setPlacement] = useState<Tag['placement']>(tag?.placement ?? 'lyrics');
  const [descriptionRu, setDescriptionRu] = useState(tag?.descriptionRu ?? '');
  const [aliases, setAliases] = useState((tag?.aliases ?? []).join(', '));
  const [examples, setExamples] = useState((tag?.examples ?? []).join(', '));
  const [selectedKeys, setSelectedKeys] = useState<string[]>(tag?.parameters?.map((item) => item.key) ?? []);
  const [customParameter, setCustomParameter] = useState({ key: '', label: '', type: 'select' as 'select' | 'text' | 'number', options: '', min: '', max: '', defaultValue: '' });
  const [customParameters, setCustomParameters] = useState<TagSettingField[]>(
    (tag?.parameters ?? []).filter((parameter) => !settingCatalog.some((item) => item.key === parameter.key)) as TagSettingField[]
  );
  const [error, setError] = useState('');
  const preview = normalizeCustomTagText(sunoText);
  const existingParameters = settingCatalog.filter((item) => selectedKeys.includes(item.key));
  const canSave = preview && label.trim() && descriptionRu.trim();

  function addCustomParameter() {
    const key = customParameter.key.trim();
    const parameterLabel = customParameter.label.trim();
    if (!key || !parameterLabel) {
      setError('Для новой настройки нужны служебное имя и название.');
      return;
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key)) {
      setError('Служебное имя настройки должно начинаться с латинской буквы и содержать только буквы, цифры, _ или -.');
      return;
    }
    if ([...settingCatalog, ...customParameters].some((item) => item.key === key)) {
      setError('Настройка с таким служебным именем уже есть.');
      return;
    }
    const next: TagSettingField = {
      key,
      label: parameterLabel,
      type: customParameter.type,
      ...(customParameter.type === 'select' ? { options: parseList(customParameter.options) } : {}),
      ...(customParameter.type === 'number' && customParameter.min ? { min: Number(customParameter.min) } : {}),
      ...(customParameter.type === 'number' && customParameter.max ? { max: Number(customParameter.max) } : {}),
      ...(customParameter.defaultValue ? { defaultValue: customParameter.type === 'number' ? Number(customParameter.defaultValue) : customParameter.defaultValue } : {})
    };
    setCustomParameters((current) => [...current, next]);
    setSelectedKeys((current) => [...current, key]);
    setCustomParameter({ key: '', label: '', type: 'select', options: '', min: '', max: '', defaultValue: '' });
    setError('');
  }

  async function submit() {
    if (!canSave) {
      setError('Заполните тег, название и описание.');
      return;
    }
    const parameters = [
      ...existingParameters,
      ...customParameters.filter((item) => selectedKeys.includes(item.key))
    ].map((item) => ({
      key: item.key,
      label: item.label,
      type: item.type,
      options: item.options?.filter((option) => option !== 'none'),
      min: item.min,
      max: item.max,
      defaultValue: item.defaultValue
    }));
    const payload: CustomTagRequest = {
      label: label.trim(),
      sunoText: preview,
      placement,
      descriptionRu: descriptionRu.trim(),
      aliases: parseList(aliases),
      examples: parseList(examples || preview),
      parameters
    };
    try {
      if (tag) await updateCustomTag(tag.id, payload);
      else await createCustomTag(payload);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось сохранить тег.');
    }
  }

  return (
    <div className="tag-settings-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="tag-settings-panel custom-tag-builder" data-testid="custom-tag-builder" role="dialog" aria-modal="true" aria-label="Конструктор своего тега">
        <div className="settings-head">
          <div>
            <div className="settings-kicker"><Braces size={14} /> Свои теги</div>
            <h2>{tag ? 'Редактировать тег' : 'Конструктор тега'}</h2>
            <p className="settings-short-description">Создайте тег с описанием и набором настроек, который будет сохранён в аккаунте.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть конструктор"><X size={17} /></button>
        </div>

        <div className="custom-tag-form">
          <label>
            Тег
            <input value={sunoText} onChange={(event) => setSunoText(event.target.value)} placeholder="Drop или [Drop]" />
          </label>
          <label>
            Название в библиотеке
            <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Drop Marker" />
          </label>
          <label>
            Куда вставлять
            <select value={placement} onChange={(event) => setPlacement(event.target.value as Tag['placement'])}>
              <option value="lyrics">Текст песни</option>
              <option value="style">Стиль</option>
              <option value="both">Стиль и текст</option>
            </select>
          </label>
          <label className="wide">
            Описание на русском
            <textarea value={descriptionRu} onChange={(event) => setDescriptionRu(event.target.value)} placeholder="Кратко объясните, когда использовать этот тег" />
          </label>
          <label>
            Альтернативные названия через запятую
            <input value={aliases} onChange={(event) => setAliases(event.target.value)} placeholder="drop, beat drop" />
          </label>
          <label>
            Примеры через запятую
            <input value={examples} onChange={(event) => setExamples(event.target.value)} placeholder={`${preview || '[Tag]'}: heavy 808`} />
          </label>
        </div>

        <div className="preview-box builder-preview">
          <span>Как тег будет выглядеть</span>
          <code>{preview || '[Tag]'}</code>
        </div>

        <section className="builder-section">
          <div className="panel-title">Настройки из каталога</div>
          <div className="settings-choice-grid">
            {settingCatalog.map((item) => (
              <label key={item.key} className={selectedKeys.includes(item.key) ? 'active' : ''}>
                <input
                  type="checkbox"
                  checked={selectedKeys.includes(item.key)}
                  onChange={(event) => {
                    setSelectedKeys((current) => event.target.checked ? [...current, item.key] : current.filter((key) => key !== item.key));
                  }}
                />
                <span>{item.label}</span>
                <small>{item.key}</small>
              </label>
            ))}
            {customParameters.map((item) => (
              <label key={item.key} className={selectedKeys.includes(item.key) ? 'active' : ''}>
                <input
                  type="checkbox"
                  checked={selectedKeys.includes(item.key)}
                  onChange={(event) => {
                    setSelectedKeys((current) => event.target.checked ? [...current, item.key] : current.filter((key) => key !== item.key));
                  }}
                />
                <span>{item.label}</span>
                <small>{item.key}</small>
              </label>
            ))}
          </div>
        </section>

        <section className="builder-section">
          <div className="panel-title">Добавить настройку</div>
          <div className="custom-parameter-grid">
            <input value={customParameter.key} onChange={(event) => setCustomParameter((current) => ({ ...current, key: event.target.value }))} placeholder="служебное имя" />
            <input value={customParameter.label} onChange={(event) => setCustomParameter((current) => ({ ...current, label: event.target.value }))} placeholder="Название" />
            <select value={customParameter.type} onChange={(event) => setCustomParameter((current) => ({ ...current, type: event.target.value as typeof current.type }))}>
              <option value="select">Список выбора</option>
              <option value="text">Текст</option>
              <option value="number">Число</option>
            </select>
            <input value={customParameter.options} onChange={(event) => setCustomParameter((current) => ({ ...current, options: event.target.value }))} placeholder="варианты через запятую" />
            <input value={customParameter.defaultValue} onChange={(event) => setCustomParameter((current) => ({ ...current, defaultValue: event.target.value }))} placeholder="по умолчанию" />
            <button className="button secondary" onClick={addCustomParameter}>Добавить настройку</button>
          </div>
          <p className="builder-help">Служебное имя нужно приложению для сохранения настройки; пользователь видит только её название.</p>
        </section>

        {error && <div className="auth-error">{error}</div>}

        <div className="settings-actions">
          <button className="button primary" onClick={submit} disabled={!canSave}>{tag ? 'Сохранить изменения' : 'Сохранить тег'}</button>
          <button className="button secondary" onClick={onClose}>Отмена</button>
        </div>
      </section>
    </div>
  );
}

function TagLibrary({ onConfigure }: { onConfigure: (tag: Tag) => void }) {
  const { ui, user, setQuery, setFilter } = useProjectStore();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [authHintOpen, setAuthHintOpen] = useState(false);
  const allTags = useMemo(() => [...tags, ...ui.customTags], [ui.customTags]);
  const visibleCategories = useMemo(() => Object.entries(categoryLabels).filter(([key]) => key !== 'custom' || user || ui.customTags.length), [ui.customTags.length, user]);
  const fuse = useMemo(() => new Fuse(allTags, { keys: ['label', 'sunoText', 'aliases', 'descriptionRu', 'category'], threshold: 0.35 }), [allTags]);
  const filtered = useMemo(() => {
    const base = ui.query ? fuse.search(ui.query).map((item) => item.item) : allTags;
    return base.filter((tag) => {
      const placementOk = ui.placementFilter === 'all' || tag.placement === ui.placementFilter || (ui.placementFilter !== 'both' && tag.placement === 'both');
      const confidenceOk = ui.confidenceFilter === 'all' || tag.confidence === ui.confidenceFilter;
      const categoryOk = ui.categoryFilter === 'all' || tag.category === ui.categoryFilter;
      return placementOk && confidenceOk && categoryOk;
    });
  }, [allTags, fuse, ui.categoryFilter, ui.confidenceFilter, ui.placementFilter, ui.query]);

  return (
    <aside className="tag-library" data-testid="tag-library">
      <div className="module-head">
        <div className="module-title">
          <strong>Библиотека тегов</strong>
          <span>Нажмите тег для настройки или перетащите его в стиль/текст.</span>
        </div>
        <button className="button secondary small" onClick={() => user ? setBuilderOpen(true) : setAuthHintOpen(true)}>
          <FilePlus2 size={15} /> Создать тег
        </button>
      </div>
      <label className="search-box">
        <Search size={16} />
        <input value={ui.query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по тегам, альтернативным названиям, описанию" />
      </label>
      <div className="filter-grid">
        <select value={ui.placementFilter} onChange={(e) => setFilter('placementFilter', e.target.value as typeof ui.placementFilter)}>
          <option value="all">Куда вставлять</option>
          <option value="style">Только стиль</option>
          <option value="lyrics">Только текст песни</option>
          <option value="both">Стиль и текст</option>
        </select>
        <select value={ui.confidenceFilter} onChange={(e) => setFilter('confidenceFilter', e.target.value as typeof ui.confidenceFilter)}>
          <option value="all">Любая надёжность</option>
          <option value="official">Проверенные</option>
          <option value="common">Часто используют</option>
          <option value="experimental">Экспериментальные</option>
        </select>
      </div>
      <div className="category-tabs">
        {visibleCategories.map(([key, label]) => (
          <button key={key} className={ui.categoryFilter === key ? 'active' : ''} onClick={() => setFilter('categoryFilter', key)}>
            {label}
          </button>
        ))}
      </div>
      <div className="mini-section">
        <span>Пресеты</span>
        <strong>{presets.length}</strong>
      </div>
      <div className="tag-list">
        {filtered.slice(0, 140).map((tag) => <DraggableTag key={tag.id} tag={tag} onConfigure={onConfigure} />)}
      </div>
      {builderOpen && <CustomTagBuilder onClose={() => setBuilderOpen(false)} />}
      {authHintOpen && (
        <div className="tag-settings-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setAuthHintOpen(false);
        }}>
          <section className="auth-panel" role="dialog" aria-modal="true" aria-label="Нужен вход">
            <div className="settings-head">
              <div>
                <div className="settings-kicker"><Cloud size={14} /> Аккаунт</div>
                <h2>Войдите, чтобы сохранять свои теги</h2>
                <p className="settings-short-description">Конструктор тегов сохраняет результат в аккаунте, поэтому сначала нужна авторизация.</p>
              </div>
              <button className="icon-button" onClick={() => setAuthHintOpen(false)} aria-label="Закрыть"><X size={17} /></button>
            </div>
            <div className="settings-actions">
              <button className="button primary" onClick={() => { setFilter('activeView', 'account'); setAuthHintOpen(false); }}>Открыть аккаунт</button>
              <button className="button secondary" onClick={() => setAuthHintOpen(false)}>Отмена</button>
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}

function TagSettingsPanel({
  tag,
  onClose,
  mode = 'catalog',
  target,
  cursor
}: {
  tag: Tag;
  onClose: () => void;
  mode?: 'catalog' | 'drop';
  target?: TagSettingsTarget;
  cursor?: number;
}) {
  const { addStyleTag, appendStyleDescriptor, insertLyricsTag } = useProjectStore();
  const profile = buildTagSettingProfile(tag);
  const [settings, setSettings] = useState<TagSettingState>(() => createInitialTagSettings(profile));
  const canUseInStyle = tag.placement === 'style' || tag.placement === 'both';
  const canUseInLyrics = tag.placement === 'lyrics' || tag.placement === 'both';
  const stylePreview = buildConfiguredTagText(tag, settings, 'style');
  const lyricsPreview = buildConfiguredTagText(tag, settings, 'lyrics');
  const activePreview = buildConfiguredTagText(tag, settings, target ?? (canUseInLyrics ? 'lyrics' : 'style'));

  function setModifier(key: string, value: string) {
    setSettings((current) => ({ ...current, values: { ...current.values, [key]: value } }));
  }

  return (
    <div className="tag-settings-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="tag-settings-panel" data-testid="tag-settings-panel" role="dialog" aria-modal="true" aria-label={`Настройки тега ${tag.label}`}>
        <div className="settings-head">
          <div>
            <div className="settings-kicker"><SlidersHorizontal size={14} /> {mode === 'drop' ? 'Настройка перед вставкой' : 'Настройки тега'}</div>
            <h2>{tag.label}</h2>
            <p className="settings-short-description">{tag.descriptionRu}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть настройки"><X size={17} /></button>
        </div>

        <div className="tag-meta-grid">
          <span>{categoryLabels[tag.category]}</span>
          <span>{placementLabels[tag.placement]}</span>
          <span>{confidenceLabels[tag.confidence]}</span>
        </div>

        <div className="description-block">
          <span>{profile.title}</span>
          <p>{getTagDetailedDescription(tag, profile)}</p>
        </div>

        <div className="settings-form-grid">
          {profile.fields.map((item) => (
            <label key={item.key}>
              {item.label}
              {item.type === 'select' || item.type === 'multi-select' ? (
                <select value={settings.values[item.key] ?? 'none'} onChange={(event) => setModifier(item.key, event.target.value)}>
                  {(item.options ?? ['none']).map((option) => <option key={option} value={option}>{option === 'none' ? 'без изменения' : option}</option>)}
                </select>
              ) : (
                <input
                  type={item.type === 'number' || item.type === 'slider' ? 'number' : 'text'}
                  min={item.min}
                  max={item.max}
                  value={settings.values[item.key] ?? ''}
                  onChange={(event) => setModifier(item.key, event.target.value)}
                  placeholder="без изменения"
                />
              )}
            </label>
          ))}
        </div>

        <label className="settings-custom">
          Свои модификаторы через запятую
          <input
            value={settings.custom}
            onChange={(event) => setSettings((current) => ({ ...current, custom: event.target.value }))}
            placeholder="например: intimate, no drums, close mic"
          />
        </label>

        <div className="examples-block">
          <span>Примеры</span>
          <div>
            {tag.examples.slice(0, 4).map((example) => <code key={example}>{example}</code>)}
          </div>
        </div>

        <div className="aliases-block">
          <span>Альтернативные названия</span>
          <p>{tag.aliases.length ? tag.aliases.join(', ') : 'нет альтернативных названий'}</p>
        </div>

        {mode === 'drop' ? (
          <div className="preview-box">
            <span>{target === 'lyrics' ? 'Предпросмотр для текста песни' : 'Предпросмотр для стиля'}</span>
            <code data-testid="tag-preview">{activePreview}</code>
          </div>
        ) : (
          <div className="preview-stack">
            {canUseInLyrics && (
              <div className="preview-box">
                <span>Предпросмотр для текста песни</span>
                <code data-testid="tag-preview">{lyricsPreview}</code>
              </div>
            )}
            {canUseInStyle && (
              <div className="preview-box">
                <span>Предпросмотр для стиля</span>
                <code>{stylePreview}</code>
              </div>
            )}
          </div>
        )}

        <div className="settings-actions">
          {mode === 'drop' ? (
            <>
              <button className="button primary" onClick={() => {
                if (target === 'lyrics') insertLyricsTag(activePreview, cursor);
                if (target === 'style') {
                  if (activePreview === tag.sunoText) addStyleTag(tag.id);
                  else appendStyleDescriptor(activePreview);
                }
                onClose();
              }}>
                {target === 'lyrics' ? 'Вставить тег' : 'Добавить в стиль'}
              </button>
              <button className="button secondary" onClick={onClose}>Отмена</button>
            </>
          ) : (
            <>
              {canUseInLyrics && (
                <button className="button primary" onClick={() => {
                  insertLyricsTag(lyricsPreview);
                  onClose();
                }}>
                  Вставить в текст песни
                </button>
              )}
              {canUseInStyle && (
                <button className="button secondary" onClick={() => {
                  if (stylePreview === tag.sunoText) addStyleTag(tag.id);
                  else appendStyleDescriptor(stylePreview);
                  onClose();
                }}>
                  Добавить в стиль
                </button>
              )}
              <button className="button secondary" onClick={() => copyText(canUseInLyrics ? lyricsPreview : stylePreview)}>Копировать предпросмотр</button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function StylePromptEditor({ onDropTag }: { onDropTag: (drop: PendingTagDrop) => void }) {
  const { project, ui, setRawStyleDraft, commitRawStyle, removeStyleTag } = useProjectStore();
  const [isOver, setIsOver] = useState(false);
  const allTags = useMemo(() => [...tags, ...ui.customTags], [ui.customTags]);
  const chips = project.styleChips.map((id) => allTags.find((tag) => tag.id === id)).filter(Boolean) as Tag[];
  const styleLanes = styleLaneOrder.map((category) => ({
    category,
    chips: chips.filter((tag) => tag.category === category)
  }));

  return (
    <section
      className={`editor-panel style-panel style-compiler ${isOver ? 'over' : ''}`}
      data-testid="style-dropzone"
      onDragOver={(event) => {
        const tag = getDraggedTag(event, allTags);
        if (!tag || tag.placement === 'lyrics') return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        setIsOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsOver(false);
        const tag = getDraggedTag(event, allTags);
        if (tag && tag.placement !== 'lyrics') onDropTag({ tag, target: 'style' });
        activeDragTagId = '';
      }}
    >
      <aside className="compiler-aside">
        <div>
          <div className="kicker">Сборка стиля</div>
          <h2>Стиль / жанр</h2>
          <p>Соберите музыкальное описание для Suno: жанр, настроение, темп, вокал, инструменты, продакшн и ограничения.</p>
        </div>
        <div className="compiler-score">
          <div><strong>{project.stylePrompt.length}</strong><small>символов</small></div>
          <div><strong>{project.warnings.filter((item) => item.target === 'style').length}</strong><small>предупреждений</small></div>
        </div>
      </aside>
      <div className="compiler-main">
        <div className="lane-grid">
          {styleLanes.map((lane) => (
            <div className="lane" key={lane.category}>
              <label>{categoryLabels[lane.category] ?? lane.category}</label>
              <div>
                {lane.chips.slice(0, 3).map((tag) => (
                  <button className="style-chip" key={tag.id} onClick={() => removeStyleTag(tag.id)}>
                    {tag.sunoText}<X size={11} />
                  </button>
                ))}
                {!lane.chips.length && <span className="empty-lane">перетащите</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="raw-row">
          <textarea
            className="style-textarea"
            data-testid="style-raw-input"
            value={ui.rawStyleDraft}
            onChange={(event) => setRawStyleDraft(event.target.value)}
            onBlur={commitRawStyle}
            aria-label="Описание стиля вручную"
          />
          <button className="button primary" onClick={commitRawStyle}>Обновить описание</button>
        </div>
        <output className="style-output-proxy" data-testid="style-output" aria-label="Итоговое описание стиля">
          {project.stylePrompt}
        </output>
      </div>
    </section>
  );
}

function LyricsEditor({ onDropTag }: { onDropTag: (drop: PendingTagDrop) => void }) {
  const { project, ui, setLyrics, insertLyricsTag } = useProjectStore();
  const allTags = useMemo(() => [...tags, ...ui.customTags], [ui.customTags]);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [dropGuide, setDropGuide] = useState<{ top: number; label: string; cursor: number } | null>(null);

  function computeDropGuide(event: ReactDragEvent): { top: number; label: string; cursor: number } | null {
    const view = viewRef.current;
    const shell = editorRef.current;
    if (!view || !shell) return null;
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos == null) return null;
    const line = view.state.doc.lineAt(pos);
    const fromCoords = view.coordsAtPos(line.from);
    const toCoords = view.coordsAtPos(line.to);
    if (!fromCoords && !toCoords) return null;
    const top = fromCoords?.top ?? toCoords!.top;
    const bottom = toCoords?.bottom ?? fromCoords!.bottom;
    const insertAfter = event.clientY > top + (bottom - top) / 2;
    const shellTop = shell.getBoundingClientRect().top;
    return {
      top: Math.max(0, (insertAfter ? bottom : top) - shellTop),
      label: insertAfter ? `после строки ${line.number}` : `перед строкой ${line.number}`,
      cursor: insertAfter ? line.to : line.from
    };
  }

  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;
    const view = new EditorView({
      doc: project.lyrics,
      extensions: [
        basicSetup,
        keymap.of([]),
        CodeMirrorView.domEventHandlers({
          dragover(event) {
            if (!activeDragTagId && !event.dataTransfer?.types.includes(dragMime)) return false;
            event.preventDefault();
            return true;
          },
          drop(event) {
            if (!activeDragTagId && !event.dataTransfer?.types.includes(dragMime)) return false;
            event.preventDefault();
            return true;
          }
        }),
        autocompletion({ override: [completeTags] }),
        syntaxHighlighting(bracketHighlight),
        tagHighlighter,
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) setLyrics(update.state.doc.toString());
        })
      ],
      parent: editorRef.current
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === project.lyrics) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: project.lyrics } });
  }, [project.lyrics]);

  return (
    <section
      className={`editor-panel lyrics-panel ${dropGuide ? 'over' : ''}`}
      data-testid="lyrics-dropzone"
      onDragOver={(event) => {
        const tag = getDraggedTag(event, allTags);
        if (!tag) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        setDropGuide(computeDropGuide(event));
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropGuide(null);
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const tag = getDraggedTag(event, allTags);
        const guide = dropGuide ?? computeDropGuide(event);
        setDropGuide(null);
        if (tag) onDropTag({ tag, target: 'lyrics', cursor: guide?.cursor });
        activeDragTagId = '';
      }}
    >
      <div className="section-header lyrics-toolbar">
        <div>
          <h2>Текст песни</h2>
          <p>Метатеги остаются обычным текстом. При перетаскивании тег вставляется отдельной строкой.</p>
        </div>
        <button className="button secondary" onClick={() => insertLyricsTag('[Chorus: full production, catchy hook]', viewRef.current?.state.selection.main.head)}>
          + [Chorus]
        </button>
      </div>
      <div className="codemirror-shell" ref={editorRef} data-testid="lyrics-editor">
        {dropGuide && (
          <div className="lyrics-drop-guide" style={{ top: dropGuide.top }} data-testid="lyrics-drop-guide">
            <span>{dropGuide.label}</span>
          </div>
        )}
      </div>
    </section>
  );
}

function Workspace({ onDropTag }: { onDropTag: (drop: PendingTagDrop) => void }) {
  return (
    <main className="workspace">
      <StylePromptEditor onDropTag={onDropTag} />
      <LyricsEditor onDropTag={onDropTag} />
    </main>
  );
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back to a hidden textarea for browsers that block Clipboard API.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.top = '-1000px';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Не удалось скопировать текст');
}

function downloadFile(name: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function ExportDrawer({ onClose }: { onClose: () => void }) {
  const { project } = useProjectStore();
  const [status, setStatus] = useState<string | null>(null);
  const outline = extractOutline(project.lyrics);
  const counts = project.warnings.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.severity]: (acc[item.severity] ?? 0) + 1 }), {});

  const handleCopy = async (label: string, text: string) => {
    try {
      await copyText(text);
      setStatus(`${label}: скопировано`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Не удалось скопировать текст');
    }
  };

  const handleDownload = () => {
    downloadFile(`${project.title}.txt`, exportTxt(project));
    setStatus('.txt: файл подготовлен');
  };

  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className="export-drawer" data-testid="export-drawer" aria-label="Экспорт и проверка проекта">
        <div className="drawer-header">
          <div>
            <span>ЭКСПОРТ</span>
            <strong>Структура / Проверка / Экспорт</strong>
            <p>Проверьте структуру и выгрузите данные без скрытой разметки.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть экспорт"><X size={17} /></button>
        </div>
        <div className="health-row">
          <div><b>{outline.length}</b><small>разделов</small></div>
          <div><b>{project.warnings.length}</b><small>предупреждений</small></div>
          <div><b>6</b><small>форматов</small></div>
        </div>
        <div className="drawer-body">
          <section className="side-block">
            <div className="panel-title">Структура</div>
            <div className="outline-list">
              {outline.map((item, index) => (
                <button key={`${item.line}-${index}`}>
                  <span>{item.tag}</span>
                  <small>стр. {item.line}</small>
                </button>
              ))}
            </div>
          </section>
          <section className="side-block">
            <div className="panel-title">Проверка</div>
            <div className="warning-summary">
              <span>{counts.error ?? 0} ошибок</span>
              <span>{counts.warning ?? 0} предупреждений</span>
              <span>{counts.info ?? 0} советов</span>
            </div>
            <div className="warnings-list">
              {project.warnings.map((warning) => (
                <div key={warning.id} className={`warning-card ${warning.severity}`}>
                  <AlertTriangle size={15} />
                  <div>
                    <strong>{warning.title}</strong>
                    <p>{warning.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="side-block">
            <div className="panel-title">Экспорт</div>
            <div className="export-grid">
              <button onClick={() => handleCopy('Стиль', exportStyle(project))}><Copy size={15} />Копировать стиль</button>
              <button onClick={() => handleCopy('Текст песни', exportLyrics(project))}><Copy size={15} />Копировать текст</button>
              <button onClick={() => handleCopy('Стиль и текст', exportBoth(project))}><Copy size={15} />Копировать стиль и текст</button>
              <button onClick={() => handleCopy('Markdown', exportMarkdown(project))}>Markdown для заметок</button>
              <button onClick={() => handleCopy('JSON проекта', JSON.stringify(exportJson(project), null, 2))}>JSON проекта</button>
              <button onClick={handleDownload}>Скачать .txt</button>
            </div>
            {status && <div className="export-status">{status}</div>}
          </section>
        </div>
      </aside>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function AccountPage() {
  const {
    project,
    ui,
    user,
    projects,
    syncStatus,
    syncError,
    syncProject,
    loadProjects,
    loadCustomTags,
    loadProject,
    deleteProject,
    deleteCustomTag,
    logout,
    setFilter
  } = useProjectStore();
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  return (
    <main className="account-page" data-testid="account-page">
      <section className="account-hero">
        <div>
          <div className="settings-kicker"><Cloud size={14} /> Аккаунт</div>
          <h1>{user ? 'Профиль и сохранённые проекты' : 'Войдите, чтобы сохранять проекты'}</h1>
          <p>{user ? 'Проекты хранятся на сервере и доступны после входа с другого устройства.' : 'Локальный черновик остаётся в браузере. После входа текущий проект можно сохранить в облако.'}</p>
        </div>
        <div className={`account-status ${syncStatus}`}>
          <span>{syncStatusLabels[syncStatus]}</span>
          {syncError && <small>{syncError}</small>}
        </div>
      </section>

      {!user ? (
        <section className="account-auth-card">
          <div>
            <h2>Нет активной сессии</h2>
            <p>Выберите вход для существующего аккаунта или регистрацию для нового пользователя.</p>
          </div>
          <div className="account-actions">
            <button className="button primary" onClick={() => setAuthMode('register')}>Зарегистрироваться</button>
            <button className="button secondary" onClick={() => setAuthMode('login')}><LogIn size={16} />Войти</button>
            <button className="button secondary" onClick={() => setFilter('activeView', 'editor')}>Вернуться в редактор</button>
          </div>
        </section>
      ) : (
        <div className="account-grid">
          <section className="account-card">
            <div className="account-card-head">
              <div>
                <span>Пользователь</span>
                <h2>{user.email}</h2>
              </div>
              <UserCircle size={34} />
            </div>
            <div className="account-meta">
              <span>Текущий проект</span>
              <strong>{project.title}</strong>
              <small>ID: {project.id}</small>
            </div>
            <div className="account-actions">
              <button className="button primary" onClick={syncProject}><Save size={16} />Сохранить текущий проект</button>
              <button className="button secondary" onClick={() => { void loadProjects(); void loadCustomTags(); }}><RefreshCw size={16} />Обновить список</button>
              <button className="button secondary" onClick={() => setFilter('activeView', 'editor')}>Вернуться в редактор</button>
              <button className="button secondary" onClick={logout}><LogOut size={16} />Выйти</button>
            </div>
          </section>

          <section className="account-card projects-card">
            <div className="account-card-head">
              <div>
                <span>Сохранённые проекты</span>
                <h2>{projects.length ? `${projects.length} в облаке` : 'Пока пусто'}</h2>
              </div>
              <FolderOpen size={32} />
            </div>
            <div className="project-list" data-testid="account-project-list">
              {projects.map((item) => (
                <article className={item.id === project.id ? 'project-row active' : 'project-row'} key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <small>Обновлён {formatDate(item.updatedAt)}</small>
                  </div>
                  <div className="project-row-actions">
                    <button className="button secondary" onClick={() => loadProject(item.id)}>Открыть</button>
                    <button
                      className="icon-button danger"
                      aria-label={`Удалить ${item.title}`}
                      onClick={() => {
                        if (confirm(`Удалить проект "${item.title}" из облака? Локальный текст останется в редакторе.`)) void deleteProject(item.id);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))}
              {!projects.length && (
                <div className="empty-projects">
                  <strong>Нет сохранённых проектов</strong>
                  <p>Нажмите «Сохранить текущий проект», чтобы создать первую облачную копию.</p>
                </div>
              )}
            </div>
          </section>

          <section className="account-card custom-tags-card">
            <div className="account-card-head">
              <div>
                <span>Свои теги</span>
                <h2>{ui.customTags.length ? `${ui.customTags.length} в аккаунте` : 'Пока пусто'}</h2>
              </div>
              <Braces size={32} />
            </div>
            <div className="project-list" data-testid="account-custom-tags-list">
              {ui.customTags.map((item) => (
                <article className="project-row custom-tag-row" key={item.id}>
                  <div>
                    <strong>{item.label} <code>{item.sunoText}</code></strong>
                    <small>{placementLabels[item.placement]} · настроек: {item.parameters?.length ?? 0}</small>
                    <p>{item.descriptionRu}</p>
                  </div>
                  <div className="project-row-actions">
                    <button className="button secondary" onClick={() => setEditingTag(item)}>Редактировать</button>
                    <button
                      className="icon-button danger"
                      aria-label={`Удалить тег ${item.label}`}
                      onClick={() => {
                        if (confirm(`Удалить свой тег \"${item.label}\"? Уже вставленный текст песни останется.`)) void deleteCustomTag(item.id);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))}
              {!ui.customTags.length && (
                <div className="empty-projects">
                  <strong>Нет своих тегов</strong>
                  <p>Откройте редактор и нажмите «Создать тег» в библиотеке тегов.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {authMode && <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} />}
      {editingTag && <CustomTagBuilder tag={editingTag} onClose={() => setEditingTag(null)} />}
    </main>
  );
}

function PresetRail() {
  const { project, applyPreset } = useProjectStore();
  return (
    <div className="preset-rail">
      {presets.map((preset) => (
        <button
          key={preset.id}
          className={project.selectedPresetId === preset.id ? 'active' : ''}
          onClick={() => {
            const replaceLyrics = confirm(`Применить структуру пресета "${preset.name}" к тексту песни?`);
            applyPreset(preset.id, replaceLyrics);
          }}
        >
          <span>{preset.name}</span>
          <small>{preset.bpmRange[0]}–{preset.bpmRange[1]} BPM</small>
        </button>
      ))}
    </div>
  );
}

export function App() {
  const { hydrate, hydrateAuth, persist, ui } = useProjectStore();
  const hydrated = useRef(false);
  const [settingsTag, setSettingsTag] = useState<Tag | null>(null);
  const [pendingTagDrop, setPendingTagDrop] = useState<PendingTagDrop | null>(null);

  useEffect(() => {
    if (!hydrated.current) {
      hydrate();
      if (import.meta.env.VITE_AUTH_PROBE !== 'false') void hydrateAuth();
      hydrated.current = true;
    }
    const timer = window.setInterval(persist, 3000);
    return () => window.clearInterval(timer);
  }, [hydrate, hydrateAuth, persist]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', ui.darkMode);
  }, [ui.darkMode]);

  return (
    <div className="app-shell">
      <div className="ambient-grid" aria-hidden="true" />
      <AppHeader />
      {ui.activeView === 'account' ? (
        <AccountPage />
      ) : (
        <div className="app-grid">
          <TagLibrary onConfigure={setSettingsTag} />
          <Workspace onDropTag={setPendingTagDrop} />
        </div>
      )}
      {settingsTag && <TagSettingsPanel key={settingsTag.id} tag={settingsTag} onClose={() => setSettingsTag(null)} />}
      {pendingTagDrop && (
        <TagSettingsPanel
          key={`${pendingTagDrop.target}-${pendingTagDrop.tag.id}-${pendingTagDrop.cursor ?? 'style'}`}
          tag={pendingTagDrop.tag}
          mode="drop"
          target={pendingTagDrop.target}
          cursor={pendingTagDrop.cursor}
          onClose={() => setPendingTagDrop(null)}
        />
      )}
    </div>
  );
}
