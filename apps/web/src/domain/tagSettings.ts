import type { Tag, TagParameter } from './types';

export type TagSettingsTarget = 'style' | 'lyrics';

export type TagSettingState = {
  values: Record<string, string>;
  custom: string;
};

export type TagSettingField = TagParameter & {
  options?: string[];
};

export type TagSettingProfile = {
  title: string;
  guidance: string;
  fields: TagSettingField[];
};

export const settingCatalog: TagSettingField[] = [
  field('number', 'Номер секции', ['1', '2', '3', 'final']),
  field('sectionEnergy', 'Энергия секции', ['low energy', 'medium energy', 'high energy', 'build tension', 'drop energy', 'stripped down']),
  field('arrangement', 'Аранжировка секции', ['minimal beat', 'full band', 'acoustic only', 'no drums', 'wide harmonies', 'instrumental hook']),
  field('transition', 'Переход', ['fade in', 'fade out', 'hard stop', 'riser', 'snare roll', 'tape stop']),
  field('vocalRange', 'Диапазон / роль', ['lead vocal', 'backing vocals', 'alto', 'tenor', 'falsetto', 'choir']),
  field('vocalDelivery', 'Подача', ['soft vocal', 'breathy vocal', 'raspy vocal', 'spoken word', 'belted vocal', 'rap delivery']),
  field('vocalLayer', 'Слои', ['single voice', 'stacked harmonies', 'call and response', 'gang vocals', 'doubled vocal']),
  field('vocalEffect', 'Эффект голоса', ['dry vocal', 'wide reverb', 'slapback delay', 'auto-tuned', 'vocal chops']),
  field('instrumentRole', 'Роль', ['solo spotlight', 'background motif', 'riff answer', 'hook lead', 'rhythmic pulse', 'texture layer']),
  field('instrumentTone', 'Тембр', ['clean tone', 'warm tone', 'bright tone', 'distorted tone', 'muted tone', 'wide stereo']),
  field('dynamicShape', 'Форма', ['gradual', 'sudden', 'short accent', 'long swell', 'one bar', 'two bars']),
  field('dynamicLevel', 'Интенсивность', ['soft', 'medium', 'loud', 'very loud', 'drop to silence']),
  field('timing', 'Момент', ['before chorus', 'after chorus', 'before drop', 'end of section', 'last bar']),
  field('productionSpace', 'Пространство', ['dry', 'room reverb', 'plate reverb', 'hall reverb', 'wide stereo', 'mono center']),
  field('productionTexture', 'Текстура', ['clean mix', 'dirty mix', 'warm analog', 'tape saturation', 'vinyl crackle', 'glitch edits']),
  field('effectAmount', 'Сила эффекта', ['subtle', 'moderate', 'heavy', 'only on hook', 'tail only']),
  field('mixFocus', 'Фокус', ['lead vocal', 'drums', 'bass', 'synth hook', 'guitars', 'choir']),
  field('tempoFeel', 'Ощущение', ['laid back', 'tight pocket', 'driving', 'danceable', 'human feel', 'metronomic']),
  field('grooveDensity', 'Плотность грува', ['sparse', 'medium density', 'busy', 'syncopated', 'straight']),
  field('drumFeel', 'Барабаны', ['no drums', 'live drums', '808 drums', 'brush drums', 'breakbeat drums']),
  field('diction', 'Дикция', ['clear diction', 'soft consonants', 'accent-neutral', 'street delivery', 'theatrical diction']),
  field('languageMode', 'Режим', ['single language', 'bilingual hook', 'code-switching verses', 'chorus in English', 'rap delivery']),
  field('avoidScope', 'Где избегать', ['whole song', 'verses only', 'chorus only', 'intro only', 'outro only']),
  field('strictness', 'Жесткость', ['lightly avoid', 'strongly avoid', 'replace with acoustic texture', 'replace with clean mix']),
  field('styleEnergy', 'Энергия', ['low energy', 'medium energy', 'high energy', 'anthemic', 'intimate', 'cinematic']),
  field('styleTexture', 'Фактура', ['sparse', 'dense', 'warm analog', 'polished', 'raw', 'wide stereo']),
  field('styleArrangement', 'Аранжировка', ['minimal beat', 'full band', 'acoustic only', 'synth-heavy', 'orchestral layer'])
];

function field(key: string, label: string, options: string[]): TagSettingField {
  return { key, label, type: 'select', options: ['none', ...options] };
}

function pick(keys: string[]): TagSettingField[] {
  return keys.map((key) => settingCatalog.find((item) => item.key === key)).filter(Boolean) as TagSettingField[];
}

function normalizeParameter(parameter: TagParameter): TagSettingField {
  if (parameter.type === 'select' || parameter.type === 'multi-select') {
    return { ...parameter, options: ['none', ...(parameter.options ?? [])] };
  }
  return parameter;
}

export function buildTagSettingProfile(tag: Tag): TagSettingProfile {
  if (tag.category === 'custom' && tag.parameters?.length) {
    return {
      title: 'Пользовательские настройки',
      guidance: 'Этот тег использует настройки, выбранные в конструкторе. Они добавляются в предпросмотр как текстовые модификаторы.',
      fields: tag.parameters.map(normalizeParameter)
    };
  }

  if (tag.category === 'structure') {
    return {
      title: 'Секция песни',
      guidance: 'Настраивайте только то, что относится к этой секции: номер, энергию, аранжировку и переход. Ставьте тег отдельной строкой перед текстом секции.',
      fields: pick(['number', 'sectionEnergy', 'arrangement', 'transition'])
    };
  }

  if (tag.category === 'vocal') {
    return {
      title: 'Вокальная подача',
      guidance: 'Эти настройки влияют на исполнение голоса. Не добавляйте сюда инструменты: для них есть отдельные теги инструментов и дескрипторы стиля.',
      fields: pick(['vocalRange', 'vocalDelivery', 'vocalLayer', 'vocalEffect'])
    };
  }

  if (tag.category === 'instrument') {
    return {
      title: 'Инструментальная роль',
      guidance: 'Уточняйте роль инструмента, его плотность и переход. Вокальные параметры здесь намеренно скрыты, чтобы не смешивать разные типы инструкций.',
      fields: pick(['instrumentRole', 'instrumentTone', 'sectionEnergy', 'transition'])
    };
  }

  if (tag.category === 'dynamics') {
    return {
      title: 'Динамика и переход',
      guidance: 'Используйте для управления громкостью, артикуляцией, темпом или моментом перехода. Лучше одна ясная динамическая команда, чем несколько конфликтующих.',
      fields: pick(['dynamicShape', 'dynamicLevel', 'timing', 'transition'])
    };
  }

  if (tag.category === 'production') {
    return {
      title: 'Звук и микс',
      guidance: 'Эти параметры описывают пространство, обработку и характер микса. Они подходят для описания стиля и для секционных подсказок в тексте песни.',
      fields: pick(['productionSpace', 'productionTexture', 'effectAmount', 'mixFocus'])
    };
  }

  if (tag.category === 'tempo' || tag.category === 'rhythm') {
    return {
      title: 'Темп и грув',
      guidance: 'Добавляйте только ритмические уточнения: ощущение пульса, плотность грува и характер барабанов. Инструменты лучше держать в тегах инструментов.',
      fields: pick(['tempoFeel', 'grooveDensity', 'drumFeel'])
    };
  }

  if (tag.category === 'language') {
    return {
      title: 'Язык и дикция',
      guidance: 'Эти настройки полезны для описания стиля: язык, акцент, четкость произношения и смешение языков.',
      fields: pick(['diction', 'languageMode'])
    };
  }

  if (tag.category === 'avoid') {
    return {
      title: 'Исключение',
      guidance: 'Исключающие теги лучше держать короткими и конкретными. Они не запрещают результат железно, но помогают убрать нежелательные стилистические решения.',
      fields: pick(['avoidScope', 'strictness'])
    };
  }

  return {
    title: 'Описание стиля',
    guidance: 'Эти настройки добавляются к описанию стиля как обычный текст. Используйте их для жанра, эпохи, настроения и общей фактуры.',
    fields: pick(['styleEnergy', 'styleTexture', 'styleArrangement'])
  };
}

export function createInitialTagSettings(profile: TagSettingProfile): TagSettingState {
  return {
    values: Object.fromEntries(profile.fields.map((item) => [item.key, String(item.defaultValue ?? 'none')])),
    custom: ''
  };
}

export function splitCustomModifiers(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getSelectedModifiers(settings: TagSettingState): string[] {
  return Object.entries(settings.values)
    .filter(([key, value]) => key !== 'number' && value && value !== 'none')
    .map(([, value]) => value);
}

export function buildConfiguredTagText(tag: Tag, settings: TagSettingState, target: TagSettingsTarget = 'style'): string {
  const modifiers = [...getSelectedModifiers(settings), ...splitCustomModifiers(settings.custom)];
  if (target === 'style' && !tag.sunoText.startsWith('[')) {
    return [tag.sunoText, ...modifiers].join(', ');
  }

  if (!tag.sunoText.startsWith('[')) {
    return modifiers.length ? `[${tag.sunoText}: ${modifiers.join(', ')}]` : `[${tag.sunoText}]`;
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
