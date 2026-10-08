import type { Tag, TagParameter } from './types';

export type TagSettingsTarget = 'style' | 'lyrics';

export type TagSettingState = {
  values: Record<string, string>;
  custom: string;
};

export type TagSettingField = TagParameter & {
  options?: string[];
  explanationRu?: string;
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
  field('styleArrangement', 'Аранжировка', ['minimal beat', 'full band', 'acoustic only', 'synth-heavy', 'orchestral layer']),
  field('vocalRole', 'Роль голоса', ['lead vocal', 'backing vocals', 'choir', 'duet'], 'Уточняет место голоса в аранжировке, а не высоту нот.'),
  field('vocalRegister', 'Регистр голоса', ['low register', 'middle register', 'high register', 'alto', 'tenor'], 'Описывает высотную область исполнения; это текстовая просьба, не ограничитель диапазона.'),
  field('effectScope', 'Область обработки', ['whole mix', 'lead vocal', 'drums', 'guitars', 'synths', 'section only', 'tail only'], 'Уточняет, к какой партии или части фразы относится эффект. Не создаёт отдельную дорожку в Suno.'),
  field('effectStrength', 'Выраженность эффекта', ['subtle', 'moderate', 'strong'], 'Описывает заметность обработки без обещания численного значения или точного повторения.'),
  field('dynamicTarget', 'Завершение изменения', ['to silence', 'to a soft level', 'to a loud peak'], 'Называет желаемый итог нарастания или затихания; не задаёт точный уровень громкости.'),
  { key: 'harmonicDestination', label: 'Тональность или гармония', type: 'text', explanationRu: 'Свободное описание гармонического направления, например D minor. Результат генерации требует проверки в Suno.' },
  { key: 'musicalDetail', label: 'Музыкальное уточнение', type: 'text', explanationRu: 'Конкретизирует музыкальную идею: например ascending melody, chord progression Am-F-C-G или time signature 3/4. Это словесная просьба, не настройка нотного редактора.' },
  { key: 'targetPart', label: 'Партия или инструмент', type: 'text', explanationRu: 'Уточняет, какая партия исполняет приём: например lead vocal, piano или strings. Не создаёт дорожку и не включает отдельный инструмент автоматически.' }
];

const legacySettingKeys = new Set(['vocalRange', 'effectAmount', 'avoidScope', 'strictness']);
export const availableSettingCatalog = settingCatalog.filter((item) => !legacySettingKeys.has(item.key));

export function buildCustomSettingCatalog(parameters: TagParameter[] = []): TagSettingField[] {
  return settingCatalog.map((item) => parameters.find((parameter) => parameter.key === item.key) ?? item);
}

function field(key: string, label: string, options: string[], explanationRu?: string): TagSettingField {
  return { key, label, type: 'select', options: ['none', ...options], explanationRu };
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
  if (tag.category === 'custom') {
    return {
      title: 'Пользовательские настройки',
      guidance: 'Этот тег использует настройки, выбранные в конструкторе. Они добавляются в предпросмотр как текстовые модификаторы.',
      fields: (tag.parameters ?? []).map(normalizeParameter)
    };
  }

  const name = tag.sunoText.replace(/^\[|\]$/g, '').toLowerCase();
  if (/key change/.test(name) || (tag.category === 'dynamics' && /modulation/.test(name))) {
    return { title: 'Гармонический переход', guidance: 'Уточните направление гармонии. Громкость и артикуляция не задают новую тональность.', fields: pick(['harmonicDestination', 'timing']) };
  }
  if (/^(end|hard stop|big finish)$/.test(name)) {
    return { title: 'Завершение', guidance: 'Номер секции здесь не нужен. Окончание — текстовая подсказка, а не гарантия точной остановки аудио.', fields: name === 'hard stop' ? pick(['timing']) : [] };
  }
  if (/^instrumental(?: intro| break| interlude)?$/.test(name)) {
    return { title: 'Инструментальный фрагмент', guidance: 'Уточните фактуру и переход фрагмента без пения. Роль солиста и вокальные параметры к этой инструкции не относятся.', fields: pick(['sectionEnergy', 'arrangement', 'transition']) };
  }

  if (tag.category === 'structure') {
    return {
      title: 'Секция песни',
      guidance: 'Настраивайте только то, что относится к этой секции: номер, энергию, аранжировку и переход. Ставьте тег отдельной строкой перед текстом секции.',
      fields: pick([...(/^(verse|chorus|pre-chorus|post-chorus|bridge|hook|refrain)(?: variation)?$/.test(name) ? ['number'] : []), 'sectionEnergy', 'arrangement', 'transition'])
    };
  }

  if (tag.category === 'vocal') {
    return {
      title: 'Вокальная подача',
      guidance: 'Эти настройки влияют на исполнение голоса. Не добавляйте сюда инструменты: для них есть отдельные теги инструментов и дескрипторы стиля.',
      fields: pick(['vocalRole', ...(/falsetto/.test(name) ? [] : ['vocalRegister']), 'vocalDelivery', 'vocalLayer', 'vocalEffect'])
    };
  }

  if (tag.category === 'instrument') {
    return {
      title: 'Инструментальная роль',
      guidance: 'Уточняйте роль инструмента, его плотность и переход. Вокальные параметры здесь намеренно скрыты, чтобы не смешивать разные типы инструкций.',
      fields: pick([...(/solo|break|fill|roll|crash/.test(name) ? [] : ['instrumentRole']), 'instrumentTone', 'sectionEnergy', 'transition'])
    };
  }

  if (tag.category === 'dynamics' || /^fade (?:in|out)$/.test(name)) {
    if (/staccato|legato|accent|vibrato|tremolo/.test(name)) {
      return { title: 'Артикуляция и исполнение', guidance: 'Тег описывает способ исполнения, а не громкость. Укажите момент его применения при необходимости.', fields: pick(['timing']) };
    }
    if (/rubato|half-time|double-time/.test(name)) {
      return { title: 'Ритмическая подача', guidance: 'Это ощущение времени и пульса, а не настройка громкости.', fields: pick(['tempoFeel', 'timing']) };
    }
    return {
      title: 'Динамика и переход',
      guidance: 'Используйте для управления громкостью, артикуляцией, темпом или моментом перехода. Лучше одна ясная динамическая команда, чем несколько конфликтующих.',
      fields: pick(/^(piano|pianissimo|forte|fortissimo)$/.test(name) ? ['timing'] : ['dynamicShape', 'dynamicTarget', 'timing']).map((item) =>
        item.key !== 'dynamicTarget' ? item : { ...item, options: item.options?.filter((value) =>
          /decrescendo|diminuendo|fade out/.test(name) ? value !== 'to a loud peak'
            : /crescendo|fade in/.test(name) ? !['to silence', 'to a soft level'].includes(value) : true) })
    };
  }

  if (tag.category === 'production') {
    if (/^(melody|harmony|chord(?: progression)?|key|major|minor|scale|interval|octave|arpeggio|counterpoint|dissonance|resolution|cadence|ostinato|pedal point|augmentation|diminution|suspension|anacrusis|time signature)$/.test(name)) {
      return { title: 'Музыкальный приём', guidance: 'Уточните сам приём и партию, которая его исполняет. Параметры микса не заменяют гармоническую или ритмическую задачу.', fields: pick(['musicalDetail', 'targetPart', 'timing']) };
    }
    if (/^(instrumentation|arrangement|texture|monophonic|homophonic|polyphonic|orchestration|timbre|layering|sparse|dense)$/.test(name)) {
      return { title: 'Состав и фактура', guidance: 'Уточните инструменты и их взаимодействие. Громкость и обработку лучше описывать отдельными эффектами.', fields: pick(['targetPart', 'styleTexture', 'styleArrangement']) };
    }
    return {
      title: 'Звук и микс',
      guidance: 'Эти параметры описывают пространство, обработку и характер микса. Они подходят для описания стиля и для секционных подсказок в тексте песни.',
      fields: pick(/reverb|delay|echo|distort|compression|filter|phaser|flanger|chorus effect|tremolo effect|bitcrush|saturation|modulation/.test(name)
        ? ['effectStrength', 'effectScope', 'timing']
        : ['productionSpace', 'productionTexture', 'mixFocus'])
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
      fields: []
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
    values: Object.fromEntries(profile.fields.map((item) => [item.key, String(item.defaultValue ?? (item.type === 'select' || item.type === 'multi-select' ? 'none' : ''))])),
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
  const allowed = new Set(buildTagSettingProfile(tag).fields.map((item) => item.key));
  const filteredSettings = { ...settings, values: Object.fromEntries(Object.entries(settings.values).filter(([key]) => allowed.has(key))) };
  const modifiers = [...getSelectedModifiers(filteredSettings), ...splitCustomModifiers(settings.custom)];
  if (target === 'style' && !tag.sunoText.startsWith('[')) {
    return [tag.sunoText, ...modifiers].join(', ');
  }

  if (!tag.sunoText.startsWith('[')) {
    return modifiers.length ? `[${tag.sunoText}: ${modifiers.join(', ')}]` : `[${tag.sunoText}]`;
  }

  const inner = tag.sunoText.slice(1, -1);
  const [rawBase, ...existingParts] = inner.split(':');
  let base = rawBase.trim();
  const sectionNumber = filteredSettings.values.number;
  if (sectionNumber && sectionNumber !== 'none') {
    base = sectionNumber === 'final' ? (base.toLowerCase().includes('chorus') ? 'Final Chorus' : `Final ${base}`) : `${base} ${sectionNumber}`;
  }
  const existing = existingParts.join(':').split(',').map((part) => part.trim()).filter(Boolean);
  const allModifiers = [...existing, ...modifiers];
  return allModifiers.length ? `[${base}: ${allModifiers.join(', ')}]` : `[${base}]`;
}
