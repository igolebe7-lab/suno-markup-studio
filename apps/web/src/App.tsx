import { EditorView, basicSetup } from 'codemirror';
import { autocompletion, CompletionContext } from '@codemirror/autocomplete';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView as CodeMirrorView, ViewPlugin, ViewUpdate, keymap } from '@codemirror/view';
import { tags } from './data/tags';
import { presets } from './data/presets';
import { exportBoth, exportJson, exportLyrics, exportMarkdown, exportStyle, exportTxt } from './domain/exporters';
import { extractOutline } from './domain/lyrics';
import { useProjectStore } from './stores/projectStore';
import { AlertTriangle, Braces, CheckCircle2, Cloud, Copy, Download, LogIn, LogOut, Moon, Save, Search, Settings, SlidersHorizontal, Star, Sun, Undo2, Redo2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent as ReactDragEvent } from 'react';
import Fuse from 'fuse.js';
import type { Tag } from './domain/types';

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
  avoid: 'Avoid'
};

const categoryRailItems = [
  ['all', 'ALL'],
  ['structure', 'SEC'],
  ['vocal', 'VOC'],
  ['instrument', 'INS'],
  ['production', 'MIX'],
  ['avoid', 'NO']
] as const;

const styleLaneOrder = [
  'genre',
  'mood',
  'tempo',
  'vocal',
  'instrument',
  'production',
  'avoid'
] as const;

const confidenceLabels: Record<Tag['confidence'], string> = {
  official: 'официальная/глоссарная основа',
  common: 'частая практика',
  experimental: 'экспериментально'
};

type TagSettingState = {
  values: Record<string, string>;
  custom: string;
};

type TagSettingField = {
  key: string;
  label: string;
  options: string[];
};

type TagSettingProfile = {
  title: string;
  guidance: string;
  fields: TagSettingField[];
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

function getDraggedTag(event: ReactDragEvent): Tag | undefined {
  const id = event.dataTransfer.getData(dragMime) || activeDragTagId;
  return tags.find((tag) => tag.id === id);
}

function splitCustomModifiers(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function field(key: string, label: string, options: string[]): TagSettingField {
  return { key, label, options: ['none', ...options] };
}

function getTagSettingProfile(tag: Tag): TagSettingProfile {
  if (tag.category === 'structure') {
    return {
      title: 'Секция песни',
      guidance: 'Настраивайте только то, что относится к этой секции: номер, энергию, аранжировку и переход. Ставьте тег отдельной строкой перед текстом секции.',
      fields: [
        field('number', 'Номер секции', ['1', '2', '3', 'final']),
        field('sectionEnergy', 'Энергия секции', ['low energy', 'medium energy', 'high energy', 'build tension', 'drop energy', 'stripped down']),
        field('arrangement', 'Аранжировка секции', ['minimal beat', 'full band', 'acoustic only', 'no drums', 'wide harmonies', 'instrumental hook']),
        field('transition', 'Переход', ['fade in', 'fade out', 'hard stop', 'riser', 'snare roll', 'tape stop'])
      ]
    };
  }

  if (tag.category === 'vocal') {
    return {
      title: 'Вокальная подача',
      guidance: 'Эти настройки влияют на исполнение голоса. Не добавляйте сюда инструменты: для них есть отдельные instrument-теги и Style-дескрипторы.',
      fields: [
        field('vocalRange', 'Диапазон / роль', ['lead vocal', 'backing vocals', 'alto', 'tenor', 'falsetto', 'choir']),
        field('vocalDelivery', 'Подача', ['soft vocal', 'breathy vocal', 'raspy vocal', 'spoken word', 'belted vocal', 'rap delivery']),
        field('vocalLayer', 'Слои', ['single voice', 'stacked harmonies', 'call and response', 'gang vocals', 'doubled vocal']),
        field('vocalEffect', 'Эффект голоса', ['dry vocal', 'wide reverb', 'slapback delay', 'auto-tuned', 'vocal chops'])
      ]
    };
  }

  if (tag.category === 'instrument') {
    return {
      title: 'Инструментальная роль',
      guidance: 'Уточняйте роль инструмента, его плотность и переход. Вокальные параметры здесь намеренно скрыты, чтобы не смешивать разные типы инструкций.',
      fields: [
        field('instrumentRole', 'Роль', ['solo spotlight', 'background motif', 'riff answer', 'hook lead', 'rhythmic pulse', 'texture layer']),
        field('instrumentTone', 'Тембр', ['clean tone', 'warm tone', 'bright tone', 'distorted tone', 'muted tone', 'wide stereo']),
        field('sectionEnergy', 'Энергия', ['low energy', 'medium energy', 'high energy', 'build tension', 'drop energy']),
        field('transition', 'Переход', ['fade in', 'fade out', 'hard stop', 'riser', 'snare roll', 'tape stop'])
      ]
    };
  }

  if (tag.category === 'dynamics') {
    return {
      title: 'Динамика и переход',
      guidance: 'Используйте для управления громкостью, артикуляцией, темпом или моментом перехода. Лучше одна ясная динамическая команда, чем несколько конфликтующих.',
      fields: [
        field('dynamicShape', 'Форма', ['gradual', 'sudden', 'short accent', 'long swell', 'one bar', 'two bars']),
        field('dynamicLevel', 'Интенсивность', ['soft', 'medium', 'loud', 'very loud', 'drop to silence']),
        field('timing', 'Момент', ['before chorus', 'after chorus', 'before drop', 'end of section', 'last bar']),
        field('transition', 'Сцепка', ['smooth transition', 'hard cut', 'tape stop', 'reverse swell', 'impact hit'])
      ]
    };
  }

  if (tag.category === 'production') {
    return {
      title: 'Звук и микс',
      guidance: 'Эти параметры описывают пространство, обработку и характер микса. Они подходят для Style prompt и для секционных подсказок в Lyrics.',
      fields: [
        field('productionSpace', 'Пространство', ['dry', 'room reverb', 'plate reverb', 'hall reverb', 'wide stereo', 'mono center']),
        field('productionTexture', 'Текстура', ['clean mix', 'dirty mix', 'warm analog', 'tape saturation', 'vinyl crackle', 'glitch edits']),
        field('effectAmount', 'Сила эффекта', ['subtle', 'moderate', 'heavy', 'only on hook', 'tail only']),
        field('mixFocus', 'Фокус', ['lead vocal', 'drums', 'bass', 'synth hook', 'guitars', 'choir'])
      ]
    };
  }

  if (tag.category === 'tempo' || tag.category === 'rhythm') {
    return {
      title: 'Темп и groove',
      guidance: 'Добавляйте только ритмические уточнения: ощущение пульса, плотность грува и характер барабанов. Инструменты лучше держать в instrument-тегах.',
      fields: [
        field('tempoFeel', 'Ощущение', ['laid back', 'tight pocket', 'driving', 'danceable', 'human feel', 'metronomic']),
        field('grooveDensity', 'Плотность groove', ['sparse', 'medium density', 'busy', 'syncopated', 'straight']),
        field('drumFeel', 'Барабаны', ['no drums', 'live drums', '808 drums', 'brush drums', 'breakbeat drums'])
      ]
    };
  }

  if (tag.category === 'language') {
    return {
      title: 'Язык и дикция',
      guidance: 'Эти настройки полезны для Style prompt: язык, акцент, четкость произношения и смешение языков.',
      fields: [
        field('diction', 'Дикция', ['clear diction', 'soft consonants', 'accent-neutral', 'street delivery', 'theatrical diction']),
        field('languageMode', 'Режим', ['single language', 'bilingual hook', 'code-switching verses', 'chorus in English', 'rap delivery'])
      ]
    };
  }

  if (tag.category === 'avoid') {
    return {
      title: 'Исключение',
      guidance: 'Avoid-теги лучше держать короткими и конкретными. Они не запрещают результат железно, но помогают убрать нежелательные стилистические решения.',
      fields: [
        field('avoidScope', 'Где избегать', ['whole song', 'verses only', 'chorus only', 'intro only', 'outro only']),
        field('strictness', 'Жесткость', ['lightly avoid', 'strongly avoid', 'replace with acoustic texture', 'replace with clean mix'])
      ]
    };
  }

  return {
    title: 'Style descriptor',
    guidance: 'Эти настройки добавляются к Style prompt как plain-text уточнения. Используйте их для жанра, эпохи, настроения и общей фактуры.',
    fields: [
      field('styleEnergy', 'Энергия', ['low energy', 'medium energy', 'high energy', 'anthemic', 'intimate', 'cinematic']),
      field('styleTexture', 'Фактура', ['sparse', 'dense', 'warm analog', 'polished', 'raw', 'wide stereo']),
      field('styleArrangement', 'Аранжировка', ['minimal beat', 'full band', 'acoustic only', 'synth-heavy', 'orchestral layer'])
    ]
  };
}

function getSelectedModifiers(settings: TagSettingState): string[] {
  return Object.entries(settings.values)
    .filter(([key, value]) => key !== 'number' && value && value !== 'none')
    .map(([, value]) => value);
}

function buildConfiguredTagText(tag: Tag, settings: TagSettingState): string {
  const modifiers = [...getSelectedModifiers(settings), ...splitCustomModifiers(settings.custom)];
  if (!tag.sunoText.startsWith('[')) {
    return [tag.sunoText, ...modifiers].join(', ');
  }

  const inner = tag.sunoText.slice(1, -1);
  const [rawBase, ...existingParts] = inner.split(':');
  let base = rawBase.trim();
  const sectionNumber = settings.values.number;
  if (sectionNumber && sectionNumber !== 'none') {
    base = sectionNumber === 'final' ? (base.toLowerCase().includes('chorus') ? 'Final Chorus' : `Final ${base}`) : `${base} ${sectionNumber}`;
  }
  const existing = existingParts.join(':').split(',').map((part) => part.trim()).filter(Boolean);
  const allModifiers = [...existing, ...modifiers];
  return allModifiers.length ? `[${base}: ${allModifiers.join(', ')}]` : `[${base}]`;
}

function getPlacementHint(tag: Tag): string {
  if (tag.placement === 'style') return 'Используется в Style prompt как текстовый дескриптор без квадратных скобок.';
  if (tag.placement === 'lyrics') return 'Используется в Lyrics как отдельная строка-метатег в квадратных скобках.';
  return 'Можно использовать и в Style prompt, и в Lyrics; в Lyrics лучше ставить отдельной строкой.';
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
    applyPreset,
    validate,
    undo,
    redo,
    setFilter,
    loadProject,
    syncProject,
    logout
  } = useProjectStore();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-mark"><Braces size={18} /></div>
        <div>
          <div className="brand-title">Suno Markup Studio</div>
          <input value={project.title} onChange={(event) => setTitle(event.target.value)} className="project-title" aria-label="Название проекта" />
        </div>
      </div>
      <div className="header-actions">
        {user && (
          <select
            className="select"
            value={project.id}
            onChange={(event) => loadProject(event.target.value)}
            aria-label="Проекты"
          >
            <option value={project.id}>{project.title}</option>
            {projects.filter((item) => item.id !== project.id).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        )}
        <select
          className="select"
          value={project.selectedPresetId}
          onChange={(event) => {
            const replaceLyrics = project.lyrics.trim().length < 20 || confirm('Заменить текущую структуру Lyrics шаблоном пресета?');
            applyPreset(event.target.value, replaceLyrics);
          }}
          aria-label="Пресет"
        >
          {presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
        </select>
        <button className="icon-button" onClick={undo} aria-label="Undo"><Undo2 size={17} /></button>
        <button className="icon-button" onClick={redo} aria-label="Redo"><Redo2 size={17} /></button>
        <button className="button secondary" onClick={validate}><CheckCircle2 size={16} />Проверить</button>
        {user ? (
          <>
            <button className="button secondary" onClick={syncProject}><Save size={16} />Сохранить</button>
            <span className={`sync-pill ${syncStatus}`} title={syncError}>{syncStatus === 'synced' ? 'cloud saved' : syncStatus}</span>
            <button className="icon-button" onClick={logout} aria-label="Выйти"><LogOut size={17} /></button>
          </>
        ) : (
          <button className="button secondary" onClick={() => setAuthOpen(true)}><LogIn size={16} />Войти</button>
        )}
        <button className="button primary" onClick={() => document.getElementById('export-panel')?.scrollIntoView({ behavior: 'smooth' })}><Download size={16} />Экспорт</button>
        <button className="icon-button" onClick={() => setFilter('darkMode', !ui.darkMode)} aria-label="Тема">{ui.darkMode ? <Sun size={17} /> : <Moon size={17} />}</button>
        <button className="icon-button" aria-label="Настройки"><Settings size={17} /></button>
      </div>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </header>
  );
}

function CategoryRail() {
  const { ui, setFilter } = useProjectStore();
  return (
    <nav className="category-rail" aria-label="Категории тегов">
      <div className="rail-group">
        {categoryRailItems.map(([key, label]) => (
          <button
            key={key}
            className={ui.categoryFilter === key ? 'active' : ''}
            onClick={() => setFilter('categoryFilter', key)}
            title={categoryLabels[key]}
          >
            {label}
          </button>
        ))}
      </div>
      <div />
      <div className="rail-count">{tags.length}</div>
    </nav>
  );
}

function AuthModal({ onClose }: { onClose: () => void }) {
  const { login, register, syncStatus, syncError } = useProjectStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function submit() {
    if (mode === 'login') await login(email, password);
    else await register(email, password);
    onClose();
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
            <p>После входа проекты сохраняются на backend и доступны с других устройств.</p>
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
        {syncError && <p className="auth-error">{syncError}</p>}
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
        <small>{categoryLabels[tag.category]} · {tag.confidence}</small>
        <em>{tag.descriptionRu}</em>
      </button>
    </div>
  );
}

function TagLibrary({ onConfigure }: { onConfigure: (tag: Tag) => void }) {
  const { ui, setQuery, setFilter } = useProjectStore();
  const fuse = useMemo(() => new Fuse(tags, { keys: ['label', 'sunoText', 'aliases', 'descriptionRu', 'category'], threshold: 0.35 }), []);
  const filtered = useMemo(() => {
    const base = ui.query ? fuse.search(ui.query).map((item) => item.item) : tags;
    return base.filter((tag) => {
      const placementOk = ui.placementFilter === 'all' || tag.placement === ui.placementFilter || (ui.placementFilter !== 'both' && tag.placement === 'both');
      const confidenceOk = ui.confidenceFilter === 'all' || tag.confidence === ui.confidenceFilter;
      const categoryOk = ui.categoryFilter === 'all' || tag.category === ui.categoryFilter;
      return placementOk && confidenceOk && categoryOk;
    });
  }, [fuse, ui.categoryFilter, ui.confidenceFilter, ui.placementFilter, ui.query]);

  return (
    <aside className="tag-library" data-testid="tag-library">
      <div className="module-head">
        <div className="module-title">
          <strong>Библиотека тегов</strong>
          <span>Категория, совместимость и confidence читаются до настройки.</span>
        </div>
        <span className="status-pill">⌘K</span>
      </div>
      <label className="search-box">
        <Search size={16} />
        <input value={ui.query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по тегам, alias, описанию" />
      </label>
      <div className="filter-grid">
        <select value={ui.placementFilter} onChange={(e) => setFilter('placementFilter', e.target.value as typeof ui.placementFilter)}>
          <option value="all">Все поля</option>
          <option value="style">Style only</option>
          <option value="lyrics">Lyrics only</option>
          <option value="both">Both</option>
        </select>
        <select value={ui.confidenceFilter} onChange={(e) => setFilter('confidenceFilter', e.target.value as typeof ui.confidenceFilter)}>
          <option value="all">Все confidence</option>
          <option value="official">official</option>
          <option value="common">common</option>
          <option value="experimental">experimental</option>
        </select>
      </div>
      <div className="category-tabs">
        {Object.entries(categoryLabels).map(([key, label]) => (
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
    </aside>
  );
}

function TagSettingsPanel({ tag, onClose }: { tag: Tag; onClose: () => void }) {
  const { addStyleTag, appendStyleDescriptor, insertLyricsTag } = useProjectStore();
  const profile = getTagSettingProfile(tag);
  const [settings, setSettings] = useState<TagSettingState>({
    values: Object.fromEntries(profile.fields.map((item) => [item.key, 'none'])),
    custom: ''
  });
  const preview = buildConfiguredTagText(tag, settings);
  const canUseInStyle = tag.placement === 'style' || tag.placement === 'both';
  const canUseInLyrics = tag.placement === 'lyrics' || tag.placement === 'both';

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
            <div className="settings-kicker"><SlidersHorizontal size={14} /> Настройки тега</div>
            <h2>{tag.label}</h2>
            <p className="settings-short-description">{tag.descriptionRu}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть настройки"><X size={17} /></button>
        </div>

        <div className="tag-meta-grid">
          <span>{categoryLabels[tag.category]}</span>
          <span>{tag.placement === 'both' ? 'Style + Lyrics' : tag.placement}</span>
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
              <select value={settings.values[item.key] ?? 'none'} onChange={(event) => setModifier(item.key, event.target.value)}>
                {item.options.map((option) => <option key={option} value={option}>{option === 'none' ? 'без изменения' : option}</option>)}
              </select>
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
          <span>Alias</span>
          <p>{tag.aliases.length ? tag.aliases.join(', ') : 'нет alias'}</p>
        </div>

        <div className="preview-box">
          <span>Preview</span>
          <code data-testid="tag-preview">{preview}</code>
        </div>

        <div className="settings-actions">
          {canUseInLyrics && (
            <button className="button primary" onClick={() => {
              insertLyricsTag(preview);
              onClose();
            }}>
              Вставить в Lyrics
            </button>
          )}
          {canUseInStyle && (
            <button className="button secondary" onClick={() => {
              if (preview === tag.sunoText) addStyleTag(tag.id);
              else appendStyleDescriptor(preview);
              onClose();
            }}>
              Добавить в Style
            </button>
          )}
          <button className="button secondary" onClick={() => copyText(preview)}>Копировать preview</button>
        </div>
      </section>
    </div>
  );
}

function StylePromptEditor() {
  const { project, ui, setRawStyleDraft, commitRawStyle, removeStyleTag, addStyleTag } = useProjectStore();
  const [isOver, setIsOver] = useState(false);
  const chips = project.styleChips.map((id) => tags.find((tag) => tag.id === id)).filter(Boolean) as Tag[];
  const styleLanes = styleLaneOrder.map((category) => ({
    category,
    chips: chips.filter((tag) => tag.category === category)
  }));

  return (
    <section
      className={`editor-panel style-panel style-compiler ${isOver ? 'over' : ''}`}
      data-testid="style-dropzone"
      onDragOver={(event) => {
        const tag = getDraggedTag(event);
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
        const tag = getDraggedTag(event);
        if (tag && tag.placement !== 'lyrics') addStyleTag(tag.id);
        activeDragTagId = '';
      }}
    >
      <aside className="compiler-aside">
        <div>
          <div className="kicker">Style compiler</div>
          <h2>Стиль / жанр</h2>
          <p>Style prompt собирается дорожками в порядке Suno: genre → mood → tempo → vocal → instrument → production → avoid.</p>
        </div>
        <div className="compiler-score">
          <div><strong>{project.stylePrompt.length}</strong><small>chars</small></div>
          <div><strong>{project.warnings.filter((item) => item.target === 'style').length}</strong><small>style warnings</small></div>
        </div>
      </aside>
      <div className="compiler-main">
        <div className="lane-grid">
          {styleLanes.map((lane) => (
            <div className="lane" key={lane.category}>
              <label>{lane.category}</label>
              <div>
                {lane.chips.slice(0, 3).map((tag) => (
                  <button className="style-chip" key={tag.id} onClick={() => removeStyleTag(tag.id)}>
                    {tag.sunoText}<X size={11} />
                  </button>
                ))}
                {!lane.chips.length && <span className="empty-lane">drop</span>}
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
            aria-label="Raw Style prompt"
          />
          <button className="button primary" onClick={commitRawStyle}>Обновить prompt</button>
        </div>
        <div className="prompt-output" data-testid="style-output">{project.stylePrompt}</div>
      </div>
    </section>
  );
}

function LyricsEditor() {
  const { project, setLyrics, insertLyricsTag } = useProjectStore();
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
            event.stopPropagation();
            return true;
          },
          drop(event) {
            if (!activeDragTagId && !event.dataTransfer?.types.includes(dragMime)) return false;
            event.preventDefault();
            event.stopPropagation();
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
        const tag = getDraggedTag(event);
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
        const tag = getDraggedTag(event);
        const guide = dropGuide ?? computeDropGuide(event);
        setDropGuide(null);
        if (tag) insertLyricsTag(tag.sunoText, guide?.cursor);
        activeDragTagId = '';
      }}
    >
      <div className="section-header lyrics-toolbar">
        <div>
          <h2>Lyrics plain text</h2>
          <p>CodeMirror · brackets stay text · line-boundary drop</p>
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

function Workspace() {
  return (
    <main className="workspace">
      <StylePromptEditor />
      <LyricsEditor />
    </main>
  );
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

function downloadFile(name: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function RightPanel() {
  const { project } = useProjectStore();
  const outline = extractOutline(project.lyrics);
  const counts = project.warnings.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.severity]: (acc[item.severity] ?? 0) + 1 }), {});

  return (
    <aside className="right-panel">
      <div className="inspector-hero">
        <strong>Готовность экспорта</strong>
        <p>Экспорт не блокируется, но предупреждения и структура видны до копирования.</p>
        <div className="health-row">
          <div><b>{outline.length}</b><small>sections</small></div>
          <div><b>{project.warnings.length}</b><small>warnings</small></div>
          <div><b>6</b><small>formats</small></div>
        </div>
      </div>
      <div className="inspector-scroll">
        <section className="side-block">
          <div className="panel-title">Outline</div>
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
          <div className="panel-title">Validation</div>
          <div className="warning-summary">
            <span>{counts.error ?? 0} errors</span>
            <span>{counts.warning ?? 0} warnings</span>
            <span>{counts.info ?? 0} info</span>
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
      </div>
      <section className="export-dock" id="export-panel">
        <div className="export-grid">
          <button onClick={() => copyText(exportStyle(project))}><Copy size={15} />Копировать Style</button>
          <button onClick={() => copyText(exportLyrics(project))}><Copy size={15} />Копировать Lyrics</button>
          <button onClick={() => copyText(exportBoth(project))}><Copy size={15} />Copy both</button>
          <button onClick={() => copyText(exportMarkdown(project))}>Markdown</button>
          <button onClick={() => copyText(JSON.stringify(exportJson(project), null, 2))}>JSON</button>
          <button onClick={() => downloadFile(`${project.title}.txt`, exportTxt(project))}>.txt</button>
        </div>
      </section>
    </aside>
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
            const replaceLyrics = confirm(`Применить структуру пресета "${preset.name}" к Lyrics?`);
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
      <div className="app-grid">
        <CategoryRail />
        <TagLibrary onConfigure={setSettingsTag} />
        <Workspace />
        <RightPanel />
      </div>
      {settingsTag && <TagSettingsPanel key={settingsTag.id} tag={settingsTag} onClose={() => setSettingsTag(null)} />}
    </div>
  );
}
