import type { OfficialTagEvidence, Tag, TagCategory } from '../domain/types';

export const officialSources = [
  { id: 'O01', title: 'Music Glossary for Suno', url: 'https://help.suno.com/en/articles/9010177', supports: 'Музыкальные термины, предложенные Suno для запросов; не спецификация команд в скобках.' },
  { id: 'O02', title: 'Lyrics improvements on Web', url: 'https://suno.com/release-notes/lyrics-improvements-on-web', supports: 'Явно названы структурные метки Verse и Outro.' },
  { id: 'O03', title: 'Replace Section', url: 'https://suno.com/release-notes/replace-section', supports: 'Прямой пример записи [drum break] в Lyrics; исторический анонс 2024 года.' },
  { id: 'O04', title: 'Exclude Styles', url: 'https://suno.com/release-notes/exclude-styles', supports: 'Прямой пример [female vocals] и исключения male vocals; исторический анонс 2024 года.' },
  { id: 'O05', title: 'Can I choose the gender of the singer in my song?', url: 'https://help.suno.com/en/articles/10153473', supports: 'Примеры голосовых описаний в Style; не подтверждение любого вокального метатега.' }
];

type VocabularyEntry = {
  term: string;
  category: TagCategory;
  descriptionRu: string;
  example?: string;
  sourceId: string;
  kind: OfficialTagEvidence['kind'];
};

const group = (category: TagCategory, entries: Array<[string, string, string?]>): VocabularyEntry[] =>
  entries.map(([term, descriptionRu, example]) => ({ term, category, descriptionRu, example, sourceId: 'O01', kind: 'glossary-term' }));

// This inventory records terms, not an invented grammar of bracket commands.
export const officialVocabulary: VocabularyEntry[] = [
  ...group('tempo', [
    ['Tempo', 'Общее указание скорости. Добавьте значение BPM или словесный темп.', 'pop, 110 BPM'],
    ['Adagio', 'Медленное, спокойное движение; характер исполнения уточняется отдельно.'],
    ['Allegro', 'Быстрое, оживлённое движение. Не означает обязательной громкости.'],
    ['Andante', 'Умеренное движение, сопоставимое с размеренной ходьбой.'],
    ['Presto', 'Очень быстрое движение; читаемость текста может потребовать проверки.'],
    ['Rubato', 'Выразительно свободный пульс с небольшими ускорениями и замедлениями.']
  ]),
  ...group('rhythm', [
    ['Syncopation', 'Смещение акцентов относительно устойчивой сильной доли.'],
    ['Polyrhythm', 'Сочетание разных ритмических рисунков одновременно.'],
    ['Groove', 'Характер ритмического взаимодействия партий, а не отдельный инструмент.'],
    ['Downbeat', 'Начальная сильная доля такта; уточните желаемое действие на ней.', 'funk, bass accents on the downbeat'],
    ['Upbeat', 'Подводящее к сильной доле движение или акцент между опорными долями.']
  ]),
  ...group('dynamics', [
    ['Dynamics', 'Изменения громкости и интенсивности исполнения.', 'piano ballad, wide dynamics'],
    ['Crescendo', 'Постепенное нарастание звучания, а не автоматическое ускорение.'],
    ['Diminuendo', 'Постепенное ослабление звучания.'],
    ['Decrescendo', 'Постепенное уменьшение громкости; близко по смыслу к diminuendo.'],
    ['Forte', 'Громкая динамика исполнения; не числовой уровень микса.'],
    ['Piano', 'Здесь это тихая динамика, а не инструмент фортепиано.', 'chamber strings, soft dynamics'],
    ['Fortissimo', 'Очень громкая, сильная подача; не команда максимизации мастера.'],
    ['Pianissimo', 'Очень тихая подача; слышимость голоса зависит от аранжировки.'],
    ['Accent', 'Выделение ноты или доли относительно соседних звуков.'],
    ['Staccato', 'Раздельное, короткое исполнение звуков.'],
    ['Legato', 'Связное исполнение с плавными переходами между нотами.'],
    ['Vibrato', 'Небольшое колебание высоты выдерживаемого звука.'],
    ['Tremolo', 'Быстрое повторение или чередование звуков; инструмент уточняется отдельно.']
  ]),
  ...group('structure', [
    ['Verse', 'Куплет: секция для развития истории и нового текста.'],
    ['Chorus', 'Припев: возвращающаяся центральная часть песни.'],
    ['Bridge', 'Контрастная связующая секция, отличающаяся от куплета и припева.'],
    ['Pre-Chorus', 'Подводящая к припеву секция.'],
    ['Intro', 'Вступительная секция.'],
    ['Outro', 'Заключительная секция.'],
    ['Hook', 'Запоминающаяся фраза или музыкальная идея; не обязательно отдельный припев.'],
    ['Refrain', 'Возвращающаяся строка или фраза.'],
    ['Break', 'Фрагмент с изменением или снятием части сопровождения.'],
    ['Drop', 'Момент выхода накопленной энергии, часто в электронной аранжировке.'],
    ['Coda', 'Заключительное продолжение после основной формы.']
  ]),
  ...group('production', [
    ['Melody', 'Ведущая последовательность нот; конкретный рисунок описывается дополнительно.'],
    ['Harmony', 'Совместное звучание нот и гармоническая опора мелодии.'],
    ['Chord', 'Совместное звучание нескольких нот.', 'soul, sustained minor chords'],
    ['Chord Progression', 'Последовательность аккордов; можно дописать желаемую схему.'],
    ['Key', 'Тональный центр. Само слово без уточнения не задаёт конкретную тональность.', 'folk, key of D minor'],
    ['Major', 'Мажорная ладовая окраска; настроение определяется не только ладом.'],
    ['Minor', 'Минорная ладовая окраска; не обязательное требование печального текста.'],
    ['Scale', 'Набор ступеней для мелодического движения; уточните нужный лад.'],
    ['Interval', 'Расстояние между высотами нот; требуется конкретизация.'],
    ['Octave', 'Октавное расстояние или удвоение партии.', 'synth-pop, octave bass doubling'],
    ['Arpeggio', 'Последовательное проигрывание нот аккорда.'],
    ['Counterpoint', 'Совмещение самостоятельных мелодических линий.'],
    ['Dissonance', 'Напряжённое совместное звучание; не обязательно искажение.'],
    ['Resolution', 'Гармоническое или мелодическое разрешение напряжения.'],
    ['Instrumentation', 'Состав инструментов; перечислите нужные партии.', 'folk, instrumentation: guitar and flute'],
    ['Arrangement', 'Распределение ролей и развитие партий по форме.'],
    ['Texture', 'Характер сочетания слоёв звучания.'],
    ['Monophonic', 'Одна мелодическая линия без гармонического сопровождения.'],
    ['Homophonic', 'Главная мелодия с подчинённым гармоническим сопровождением.'],
    ['Polyphonic', 'Несколько относительно самостоятельных мелодических линий.'],
    ['Orchestration', 'Распределение музыкального материала между инструментами.'],
    ['Timbre', 'Тембровая окраска звука, отличная от высоты и громкости.'],
    ['Layering', 'Наложение звуковых слоёв; не обязательно увеличение громкости.'],
    ['Sparse', 'Разреженная фактура с небольшим числом одновременно активных партий.'],
    ['Dense', 'Плотная фактура с несколькими одновременно активными слоями.']
  ]),
  ...group('genre', [
    ['Blues', 'Блюзовая стилистика и характерная выразительная фразировка.'],
    ['Jazz', 'Джазовая стилистика; поджанр и состав лучше уточнить.'],
    ['Rock', 'Роковая стилистика с выраженной ритмической опорой.'],
    ['Pop', 'Поп-стилистика с ясной формой и запоминающимися мотивами.'],
    ['Electronic', 'Электронная стилистика; не обязательно танцевальный трек.'],
    ['EDM', 'Электронная танцевальная стилистика.'],
    ['Hip-Hop', 'Хип-хоп-стилистика, ритмическая подача и бит.'],
    ['R&B', 'R&B-стилистика с акцентом на вокальную фразировку и грув.'],
    ['Country', 'Кантри-стилистика; эпоху и инструменты можно уточнить.'],
    ['Classical', 'Академическая музыкальная стилистика; форма и состав уточняются отдельно.'],
    ['Folk', 'Фолковая стилистика; региональную традицию лучше назвать явно.'],
    ['Funk', 'Фанковая стилистика с активным взаимодействием ритмических партий.'],
    ['Soul', 'Соул-стилистика с выразительным вокалом.'],
    ['Reggae', 'Регги-стилистика с характерными ритмическими акцентами.'],
    ['Metal', 'Метал-стилистика; конкретный поджанр предотвращает слишком общий запрос.'],
    ['Ambient', 'Атмосферная стилистика с акцентом на пространство и фактуру.']
  ]),
  ...group('vocal', [
    ['Falsetto', 'Фальцетная подача; не синоним любой высокой ноты.'],
    ['Belt', 'Мощная вокальная подача с выраженной опорой.'],
    ['Melisma', 'Несколько нот на одном слоге.'],
    ['Vocal Run', 'Быстрый мелодический пассаж голосом.'],
    ['Harmonization', 'Голосовое гармоническое сопровождение основной линии.'],
    ['A Cappella', 'Пение без инструментального сопровождения.'],
    ['Call and Response', 'Чередование ведущей фразы и ответной партии.'],
    ['Scat', 'Вокальная импровизация с несловесными слогами.'],
    ['Crooning', 'Мягкая, близкая и камерная певческая подача.'],
    ['Rapping', 'Ритмически организованное речевое исполнение.']
  ]),
  ...group('production', [
    ['Reverb', 'Пространственный хвост звучания; помещение и выраженность уточняются отдельно.'],
    ['Delay', 'Повтор звука с временной задержкой.'],
    ['Echo', 'Слышимые повторения исходного звука.'],
    ['Compression', 'Обработка динамических различий в сигнале; не архивирование файла.'],
    ['Distortion', 'Искажение тембра с дополнительной шероховатостью звучания.'],
    ['Filter', 'Выделение или ослабление частотных областей.'],
    ['Modulation', 'Изменение параметра обработки во времени; не обязательно смена тональности.'],
    ['Panning', 'Размещение источников между левым и правым каналами.'],
    ['EQ', 'Изменение баланса частотных областей.', 'indie pop, gentle EQ, clear vocal'],
    ['Equalization', 'Частотная коррекция; числовые настройки не гарантируются текстовым запросом.'],
    ['Sampling', 'Использование записанного материала; слово не загружает реальный аудиофайл.'],
    ['Loop', 'Повторяющийся музыкальный фрагмент.'],
    ['Fade In', 'Плавное появление звучания.'],
    ['Fade Out', 'Плавное исчезновение звучания.'],
    ['Modulation (Key Change)', 'Гармонический переход в другую тональность.', 'pop, key change in the final chorus'],
    ['Time Signature', 'Метрическая организация; укажите нужный размер.', 'folk waltz, time signature 3/4'],
    ['Cadence', 'Оборот, создающий завершение или остановку музыкальной мысли.'],
    ['Ostinato', 'Повторяющийся музыкальный рисунок.'],
    ['Pedal Point', 'Выдерживаемый или повторяемый тон при смене гармонии.'],
    ['Augmentation', 'Увеличение длительностей в музыкальном рисунке.'],
    ['Diminution', 'Уменьшение длительностей в музыкальном рисунке.'],
    ['Suspension', 'Задержание ноты на фоне смены гармонии с последующим разрешением.'],
    ['Anacrusis', 'Затактовое начало фразы перед первой полной сильной долей.']
  ]),
  { term: '[drum break]', category: 'instrument', descriptionRu: 'Барабанный фрагмент: буквальный пример инструкции Lyrics в анонсе Replace Section.', sourceId: 'O03', kind: 'lyrics-example' },
  { term: '[female vocals]', category: 'vocal', descriptionRu: 'Женский вокал: буквальный пример инструкции Lyrics из анонса Exclude Styles.', sourceId: 'O04', kind: 'lyrics-example' },
  { term: 'female vocals', category: 'vocal', descriptionRu: 'Описание женского вокала в запросе стиля.', sourceId: 'O05', kind: 'style-example' },
  { term: 'male vocals', category: 'vocal', descriptionRu: 'Описание мужского вокала; в Exclude обозначает нежелательный элемент.', sourceId: 'O04', kind: 'style-example' },
  { term: 'gritty male vocal', category: 'vocal', descriptionRu: 'Шероховатая мужская подача: пример описания голоса в поле Style из справки Suno.', example: 'blues rock, gritty male vocal', sourceId: 'O05', kind: 'style-example' },
  { term: 'gritty', category: 'vocal', descriptionRu: 'Шероховатая окраска голоса. В статье Suno это описание подачи, а не эффект перегруза всего микса.', example: 'soul, gritty lead vocal', sourceId: 'O05', kind: 'style-example' },
  { term: 'soft', category: 'vocal', descriptionRu: 'Мягкая вокальная подача. Не означает обязательную тихую громкость всей песни.', example: 'acoustic pop, soft lead vocal', sourceId: 'O05', kind: 'style-example' }
];

const normalized = (text: string) => text.replace(/^\[|\]$/g, '').trim().toLowerCase();
const scopes: Record<OfficialTagEvidence['kind'], string> = {
  'glossary-term': 'Suno предлагает этот музыкальный термин в глоссарии. Источник не подтверждает запись в скобках или придуманные модификаторы.',
  'lyrics-example': 'Именно эта запись приведена Suno как пример текста в Lyrics. Это не гарантия исполнения на каждой модели.',
  'structure-label': 'Suno явно называет эту метку структуры; отдельная грамматика модификаторов не опубликована.',
  'style-example': 'Suno использует это описание в примере запроса. Это свободный текст, не специальный параметр модели.'
};

export function applyOfficialCatalog(seed: Tag[]): Tag[] {
  const result: Tag[] = seed.map((tag) => ({ ...tag, confidence: tag.confidence === 'official' ? 'common' : tag.confidence }));
  for (const entry of officialVocabulary) {
    let tag = result.find((item) => item.category === entry.category
      && normalized(item.sunoText) === normalized(entry.term)
      && (entry.kind !== 'lyrics-example' || item.sunoText.startsWith('[')));
    if (!tag) {
      const sunoText = entry.category === 'structure' ? `[${entry.term}]` : entry.term.toLowerCase();
      const placement = entry.category === 'structure' || entry.kind === 'lyrics-example' ? 'lyrics' : 'style';
      tag = {
        id: `official-${entry.category}-${entry.term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
        label: sunoText, sunoText, category: entry.category, placement, confidence: 'official', aliases: [],
        descriptionRu: entry.descriptionRu,
        examples: [placement === 'lyrics' ? `${sunoText}\n${entry.kind === 'lyrics-example' ? '[Chorus]\nПесня продолжается.' : 'Строка песни.'}` : entry.example ?? `indie pop, ${sunoText}`]
      };
      result.push(tag);
    }
    const evidence: OfficialTagEvidence = { term: entry.term, sourceId: entry.sourceId, kind: entry.kind, scope: scopes[entry.kind], checkedAt: '2026-10-08' };
    tag.confidence = 'official';
    tag.officialEvidence = [...(tag.officialEvidence ?? []), evidence];
    if (entry.term === 'Verse' || entry.term === 'Outro') {
      tag.officialEvidence.push({ ...evidence, sourceId: 'O02', kind: 'structure-label', scope: scopes['structure-label'] });
    }
  }
  return result;
}

export function getOfficialEvidence(tag: Tag): OfficialTagEvidence[] {
  return tag.category === 'custom' ? [] : tag.officialEvidence ?? [];
}
