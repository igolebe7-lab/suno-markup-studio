import type { TagKnowledge, TagKnowledgeSetting } from '../domain/types';

const sourceNotes = {
  officialCustomMode: 'Официальные материалы Suno: Custom Mode разделяет lyrics и style/advanced context.',
  officialLyricsPrompt: 'Официальные материалы Suno v4.5: дополнительный контекст можно давать прямо в Lyrics.',
  officialExclude: 'Официальные материалы Suno: нежелательные элементы лучше формулировать через Exclude/avoid.',
  communityStructure: 'Пользовательская практика Suno: секционные метатеги надёжнее работают отдельной строкой перед секцией.',
  communityLocal: 'Пользовательская практика Suno: инструкции в Lyrics обычно работают локально и последовательно.',
  heuristic: 'Правило приложения: формулировка является эвристикой, а не гарантией результата модели.'
} as const;

const structureSettings: TagKnowledgeSetting[] = [
  {
    key: 'number',
    label: 'Номер секции',
    explanation: 'Помогает различать повторяющиеся секции: [Verse 1], [Verse 2], [Final Chorus]. Особенно полезно, когда куплеты или припевы должны отличаться.',
    goodValues: ['1', '2', 'final'],
    riskyValues: ['несколько разных номеров в одном и том же теге']
  },
  {
    key: 'sectionEnergy',
    label: 'Энергия секции',
    explanation: 'Добавляет локальную подсказку о плотности и эмоциональном уровне секции. Хорошо работает, когда энергия должна измениться между verse, build и chorus.',
    goodValues: ['low energy', 'build tension', 'high energy'],
    riskyValues: ['high energy вместе с stripped down без объяснения']
  },
  {
    key: 'arrangement',
    label: 'Аранжировка секции',
    explanation: 'Уточняет, какие слои должны звучать в конкретной секции: минимальный бит, полный состав, акустическая версия, отсутствие барабанов.',
    goodValues: ['minimal beat', 'full band', 'no drums'],
    riskyValues: ['no drums вместе с 808 drums или full band']
  },
  {
    key: 'transition',
    label: 'Переход',
    explanation: 'Описывает вход или выход секции: fade, hard stop, riser, snare roll. Лучше использовать один главный переход на секцию.',
    goodValues: ['fade in', 'riser', 'hard stop'],
    riskyValues: ['несколько переходов подряд без музыкальной причины']
  }
];

const vocalSettings: TagKnowledgeSetting[] = [
  {
    key: 'vocalRange',
    label: 'Диапазон / роль',
    explanation: 'Задаёт роль голоса: лид, бэки, хор, фальцет. Это влияет на распределение вокальных партий, а не на инструменты.',
    goodValues: ['lead vocal', 'backing vocals', 'falsetto', 'choir']
  },
  {
    key: 'vocalDelivery',
    label: 'Подача',
    explanation: 'Уточняет манеру исполнения: мягко, хрипло, речитативно, мощно. Лучше сочетать с эмоцией секции.',
    goodValues: ['breathy vocal', 'raspy vocal', 'belted vocal', 'rap delivery']
  },
  {
    key: 'vocalLayer',
    label: 'Слои',
    explanation: 'Описывает количество и взаимодействие голосов: один голос, дабл, гармонии, call and response.',
    goodValues: ['single voice', 'stacked harmonies', 'call and response']
  },
  {
    key: 'vocalEffect',
    label: 'Эффект голоса',
    explanation: 'Уточняет обработку вокала: сухой центр, реверберация, delay, auto-tune, chops. Сильные эффекты лучше применять точечно.',
    goodValues: ['dry vocal', 'slapback delay', 'auto-tuned'],
    riskyValues: ['heavy reverb вместе с clear diction']
  }
];

const instrumentSettings: TagKnowledgeSetting[] = [
  {
    key: 'instrumentRole',
    label: 'Роль',
    explanation: 'Определяет, инструмент должен быть главным солистом, фоном, ответом вокалу, хуком или ритмическим пульсом.',
    goodValues: ['solo spotlight', 'hook lead', 'background motif']
  },
  {
    key: 'instrumentTone',
    label: 'Тембр',
    explanation: 'Уточняет характер звука инструмента: чистый, тёплый, яркий, искажённый, приглушённый, широкий стерео.',
    goodValues: ['clean tone', 'warm tone', 'distorted tone']
  },
  {
    key: 'sectionEnergy',
    label: 'Энергия секции',
    explanation: 'Указывает, насколько плотным или энергичным должен быть инструментальный момент.',
    goodValues: ['medium energy', 'drop energy', 'stripped down']
  },
  {
    key: 'transition',
    label: 'Переход',
    explanation: 'Помогает превратить инструментальный фрагмент в связку: riser, snare roll, tape stop, fade.',
    goodValues: ['riser', 'snare roll', 'tape stop']
  }
];

const dynamicSettings: TagKnowledgeSetting[] = [
  {
    key: 'dynamicShape',
    label: 'Форма',
    explanation: 'Описывает, как меняется динамика: постепенно, резко, коротким акцентом или длинным нарастанием.',
    goodValues: ['gradual', 'sudden', 'long swell']
  },
  {
    key: 'dynamicLevel',
    label: 'Интенсивность',
    explanation: 'Уточняет силу изменения: мягко, средне, громко, очень громко или до полной паузы.',
    goodValues: ['soft', 'loud', 'drop to silence']
  },
  {
    key: 'timing',
    label: 'Момент',
    explanation: 'Привязывает эффект к месту в форме: перед припевом, перед drop, в конце секции, в последнем такте.',
    goodValues: ['before chorus', 'before drop', 'last bar']
  },
  {
    key: 'transition',
    label: 'Переход',
    explanation: 'Добавляет конкретный переходный жест. Полезно для riser, hard stop, fade и tape stop.',
    goodValues: ['fade out', 'hard stop', 'riser']
  }
];

function k(entry: TagKnowledge): TagKnowledge {
  return entry;
}

function structure(
  tagId: string,
  summaryRu: string,
  effectRu: string,
  howItWorksRu: string,
  examples: TagKnowledge['examples'],
  relatedTagIds: string[],
  mistakes: string[] = []
): TagKnowledge {
  return k({
    tagId,
    summaryRu,
    effectRu,
    howItWorksRu,
    usageRu: {
      lyrics: 'Ставьте тег отдельной строкой перед текстом секции. Локальные модификаторы пишите внутри скобок после двоеточия.',
      placementAdvice: 'Структурные теги не стоит переносить в Style prompt: там они превращаются в общий дескриптор и хуже управляют формой песни.'
    },
    settingsRu: structureSettings,
    examples,
    mistakes: [
      'Ставить несколько разных структурных тегов подряд без текста между ними.',
      'Писать длинную постановочную фразу внутри тега вместо коротких музыкальных модификаторов.',
      ...mistakes
    ],
    conflicts: ['genre/style tags inside Lyrics без секционного смысла', 'несколько Chorus с разными задачами без [Chorus Variation]'],
    relatedTagIds,
    reliability: 'community-tested',
    sourceNotes: [sourceNotes.officialLyricsPrompt, sourceNotes.communityStructure, sourceNotes.communityLocal, sourceNotes.heuristic]
  });
}

function vocal(
  tagId: string,
  summaryRu: string,
  effectRu: string,
  howItWorksRu: string,
  examples: TagKnowledge['examples'],
  relatedTagIds: string[],
  mistakes: string[] = []
): TagKnowledge {
  return k({
    tagId,
    summaryRu,
    effectRu,
    howItWorksRu,
    usageRu: {
      style: 'В Style prompt вокальный тег задаёт общий характер голоса на всю генерацию.',
      lyrics: 'В Lyrics вокальный тег лучше ставить перед конкретной секцией, если нужно локально изменить подачу.',
      placementAdvice: 'Если нужен постоянный вокальный тип, используйте Style. Если нужен эффект только в одном месте, используйте Lyrics.'
    },
    settingsRu: vocalSettings,
    examples,
    mistakes: [
      'Смешивать вокальные настройки с инструментальными командами в одном теге.',
      'Просить взаимоисключающие подачи без контекста, например whisper и belted vocal одновременно.',
      ...mistakes
    ],
    conflicts: ['instrumental sections', 'no vocals', 'несовместимые вокальные роли в одной секции'],
    relatedTagIds,
    reliability: 'community-tested',
    sourceNotes: [sourceNotes.officialCustomMode, sourceNotes.officialLyricsPrompt, sourceNotes.communityLocal, sourceNotes.heuristic]
  });
}

function instrument(
  tagId: string,
  summaryRu: string,
  effectRu: string,
  howItWorksRu: string,
  examples: TagKnowledge['examples'],
  relatedTagIds: string[],
  mistakes: string[] = []
): TagKnowledge {
  return k({
    tagId,
    summaryRu,
    effectRu,
    howItWorksRu,
    usageRu: {
      style: 'В Style prompt инструмент задаёт общий состав или звуковую палитру.',
      lyrics: 'В Lyrics инструментальный тег создаёт локальный момент: solo, break, fill, transition.',
      placementAdvice: 'Для отдельного соло или перехода используйте Lyrics. Для постоянного состава используйте Style.'
    },
    settingsRu: instrumentSettings,
    examples,
    mistakes: [
      'Добавлять инструментальный тег внутрь строки текста песни.',
      'Просить solo spotlight и background motif одновременно.',
      ...mistakes
    ],
    conflicts: ['a cappella', 'acoustic only vs heavy synths', 'no drums vs 808 drums'],
    relatedTagIds,
    reliability: 'community-tested',
    sourceNotes: [sourceNotes.officialCustomMode, sourceNotes.communityStructure, sourceNotes.communityLocal, sourceNotes.heuristic]
  });
}

function dynamic(
  tagId: string,
  summaryRu: string,
  effectRu: string,
  howItWorksRu: string,
  examples: TagKnowledge['examples'],
  relatedTagIds: string[],
  mistakes: string[] = []
): TagKnowledge {
  return k({
    tagId,
    summaryRu,
    effectRu,
    howItWorksRu,
    usageRu: {
      lyrics: 'Ставьте динамический тег перед местом, где должен начаться переход, спад, акцент или изменение плотности.',
      placementAdvice: 'Динамические теги лучше работают рядом с секцией, которую меняют, а не в начале всего текста.'
    },
    settingsRu: dynamicSettings,
    examples,
    mistakes: [
      'Ставить несколько переходов подряд, когда нужен один понятный жест.',
      'Использовать динамический тег без соседней секции, к которой он относится.',
      ...mistakes
    ],
    conflicts: ['fade out before a required final chorus', 'hard stop together with long fade out'],
    relatedTagIds,
    reliability: 'community-tested',
    sourceNotes: [sourceNotes.officialLyricsPrompt, sourceNotes.communityLocal, sourceNotes.heuristic]
  });
}

export const tagKnowledge: TagKnowledge[] = [
  structure('intro', 'Обозначает вступление песни.', 'Обычно даёт модели место для атмосферы, первого мотива, короткого instrumental hook или подготовки вокала.', 'Работает как начальная локальная секция. Если добавить модификаторы вроде ambient pads или filtered drums, модель чаще начинает с нужной фактуры.', [
    { title: 'Атмосферный вход', prompt: '[Intro: ambient pads, distant vocal chops]', whyItWorks: 'Коротко задаёт пространство и материал вступления.' },
    { title: 'Сразу к груву', prompt: '[Intro: tight drums, bass pulse]', whyItWorks: 'Подсказывает начать не с длинной атмосферы, а с ритмического основания.' }
  ], ['verse', 'instrumental-intro', 'interlude'], ['Делать intro слишком длинным, если в Style уже указан short intro.']),
  structure('verse', 'Куплет, где развивается текст и история.', 'Обычно снижает плотность по сравнению с припевом и оставляет место для слов.', 'Тег помогает отделить повествовательную часть от hook/chorus. Нумерация Verse 1/2 полезна, если куплеты должны отличаться.', [
    { title: 'Первый куплет', prompt: '[Verse 1: soft vocal, minimal beat]', whyItWorks: 'Номер и фактура показывают, что это первая спокойная секция.' },
    { title: 'Второй куплет плотнее', prompt: '[Verse 2: stronger drums, backing vocals]', whyItWorks: 'Сохраняет форму куплета, но добавляет развитие.' }
  ], ['pre-chorus', 'chorus', 'verse-variation']),
  structure('pre-chorus', 'Переходная секция между куплетом и припевом.', 'Обычно наращивает напряжение, гармонию, ритм или вокальную высоту перед chorus.', 'Работает лучше, когда стоит после Verse и перед Chorus. Модификаторы build tension, rising harmonies, snare roll помогают объяснить направление.', [
    { title: 'Нарастание', prompt: '[Pre-Chorus: build tension, rising harmonies]', whyItWorks: 'Задаёт функцию секции: не новый хук, а подготовка припева.' }
  ], ['verse', 'chorus', 'build']),
  structure('chorus', 'Главный припев и основной запоминающийся центр песни.', 'Обычно делает секцию шире, громче и повторяемее: hook, harmonies, full production.', 'Самый важный структурный тег. Работает надёжнее, если стоит непосредственно перед строками припева, а не только в начале lyrics.', [
    { title: 'Большой припев', prompt: '[Chorus: full production, wide harmonies, catchy hook]', whyItWorks: 'Объединяет функцию, плотность и вокальную ширину.' },
    { title: 'Тихий припев', prompt: '[Chorus: stripped down, intimate vocal]', whyItWorks: 'Поясняет, что припев нужен, но без максимальной плотности.' }
  ], ['hook', 'post-chorus', 'final-chorus', 'chorus-variation']),
  structure('hook', 'Короткий запоминающийся музыкальный или вокальный фрагмент.', 'Подталкивает модель к повторяемой фразе, chant, riff или мелодическому крючку.', 'Может быть отдельной секцией или модификатором припева. Хорош для коротких фраз, которые должны зацепить слушателя.', [
    { title: 'Вокальный hook', prompt: '[Hook: repeated chant, crowd energy]', whyItWorks: 'Показывает, что нужен не новый куплет, а повторяемый элемент.' }
  ], ['chorus', 'post-chorus', 'refrain']),
  structure('post-chorus', 'Секция сразу после припева.', 'Часто добавляет chant, instrumental hook, vocal chops или короткое продолжение энергии припева.', 'Полезен, когда после Chorus нужен дополнительный запоминающийся хвост, но не новый куплет.', [
    { title: 'Chant после припева', prompt: '[Post-Chorus: vocal chops, simple chant]', whyItWorks: 'Отделяет хвост hook от основного текста припева.' }
  ], ['chorus', 'hook', 'drop-chorus']),
  structure('bridge', 'Контрастная секция перед финальной частью.', 'Обычно меняет гармонию, плотность, настроение или перспективу текста.', 'Работает как “поворот” песни. Лучше не повторять в bridge тот же набор инструкций, что в chorus.', [
    { title: 'Контраст', prompt: '[Bridge: half-time, piano only, vulnerable vocal]', whyItWorks: 'Даёт заметное отличие от основного грува.' }
  ], ['break', 'final-chorus', 'chorus']),
  structure('break', 'Короткий спад, пауза или разрыв перед следующей секцией.', 'Снимает часть инструментов, даёт воздуху или создаёт reset перед chorus/drop.', 'Используйте, если песня звучит слишком непрерывно. Для сильного эффекта можно добавить one beat silence или drums drop out.', [
    { title: 'Перед припевом', prompt: '[Break: one beat silence, vocal tail]', whyItWorks: 'Создаёт ощущение подготовки к новому входу.' }
  ], ['dropout', 'silence', 'build']),
  structure('build', 'Нарастание перед drop, chorus или climax.', 'Увеличивает напряжение через riser, snare roll, фильтр, рост вокала или плотности.', 'Работает лучше, когда за ним следует понятная цель: Drop, Chorus или Climax.', [
    { title: 'EDM build', prompt: '[Build-Up: riser, snare roll, filtered synths]', whyItWorks: 'Указывает типичные элементы нарастания.' }
  ], ['drop', 'riser', 'pre-chorus']),
  structure('drop', 'Кульминационный вход энергии.', 'Обычно добавляет плотный бит, бас, синтезаторный hook или резкую смену фактуры.', 'Особенно полезен в EDM, trap, dubstep, phonk. В не-электронных жанрах лучше уточнять характер drop, чтобы он не стал generic EDM.', [
    { title: 'Bass drop', prompt: '[Drop: heavy sub bass, full drums, aggressive entry]', whyItWorks: 'Поясняет, какой именно тип энергии нужен.' }
  ], ['build', 'bass-drop', 'impact'], ['Использовать Drop в акустической балладе без пояснения.']),
  structure('interlude', 'Связка между крупными частями песни.', 'Даёт короткую музыкальную передышку, новый мотив или переход между настроениями.', 'Подходит для instrumental bridge, смены сцены или подготовки нового куплета.', [
    { title: 'Музыкальная связка', prompt: '[Interlude: synth motif, no lead vocal]', whyItWorks: 'Ясно отделяет связку от вокального текста.' }
  ], ['instrumental-interlude', 'break', 'solo']),
  structure('solo', 'Секция для ведущего инструмента.', 'Сдвигает фокус с вокала на инструментальный lead или импровизационный фрагмент.', 'Лучше уточнять инструмент: guitar solo, piano solo, synth solo. Без уточнения модель может выбрать любой lead.', [
    { title: 'Общее соло', prompt: '[Solo: melodic lead, wide stereo]', whyItWorks: 'Даёт роль и звук, даже без точного инструмента.' }
  ], ['guitar-solo', 'piano-solo', 'synth-solo']),
  structure('outro', 'Завершающая секция песни.', 'Помогает модели перейти к завершению: fade, reprise, final hook, instrumental tail.', 'Работает надёжнее, если после Outro стоит [End] или явно указан fade/hard stop.', [
    { title: 'Мягкое завершение', prompt: '[Outro: fade out, reprise the hook]', whyItWorks: 'Говорит, что песня должна закончиться, а не начать новый цикл.' }
  ], ['end', 'fade-out', 'coda']),
  structure('end', 'Явная финальная остановка песни.', 'Подсказывает модели закончить трек после предыдущей секции.', 'Часто полезен после Outro или Hard Stop. Не добавляет музыкальную секцию сам по себе, а маркирует конец.', [
    { title: 'Явный конец', prompt: '[Outro: final chord]\n[End]', whyItWorks: 'Снижает шанс, что генерация продолжит форму ещё одним куплетом.' }
  ], ['outro', 'hard-stop', 'fade-out']),

  vocal('male-vocal', 'Запрашивает мужской вокальный тембр.', 'Смещает вокальную партию к мужскому голосу или мужскому lead.', 'В Style работает как общий голос трека. В Lyrics может локально сменить вокал, но постоянная смена голоса не гарантируется.', [
    { title: 'Общий lead', prompt: 'male lead vocal, warm baritone', whyItWorks: 'Лучше работает в Style как общий вокальный портрет.' }
  ], ['female-vocal', 'duet', 'raspy-vocal']),
  vocal('female-vocal', 'Запрашивает женский вокальный тембр.', 'Смещает вокальную партию к женскому lead или женской вокальной окраске.', 'В Style задаёт общий vocal identity. В Lyrics полезен для дуэтов или локальных ответов.', [
    { title: 'Воздушный lead', prompt: 'female lead vocal, breathy, intimate', whyItWorks: 'Совмещает пол, роль и подачу.' }
  ], ['male-vocal', 'duet', 'breathy-vocal']),
  vocal('duet', 'Два вокальных голоса.', 'Подталкивает модель к распределению строк между двумя исполнителями или к совместному припеву.', 'Лучше явно указать роли: male/female, call and response, harmony chorus. Без ролей duet может превратиться в layered vocal.', [
    { title: 'Диалог', prompt: '[Duet: call and response, male and female vocals]', whyItWorks: 'Объясняет, как именно взаимодействуют два голоса.' }
  ], ['call-response', 'male-vocal', 'female-vocal']),
  vocal('choir', 'Хоровое многоголосное звучание.', 'Добавляет ощущение группы голосов, gospel/epic choir или широкого вокального слоя.', 'В Style задаёт общий хоровой характер, в Lyrics хорошо работает для climax, bridge или final chorus.', [
    { title: 'Финальный хор', prompt: '[Final Chorus: gospel choir, wide harmonies]', whyItWorks: 'Хор привязан к кульминационной секции.' }
  ], ['harmony', 'backing-vocals', 'choir-pad']),
  vocal('harmony', 'Дополнительные вокальные гармонии.', 'Добавляет дополнительные ноты вокруг lead vocal, делая припев или hook шире.', 'Лучше работает в Chorus/Final Chorus. В куплете может перегрузить текст, если не нужна плотность.', [
    { title: 'Широкий припев', prompt: '[Chorus: stacked harmonies, wide vocal layers]', whyItWorks: 'Уточняет тип гармоний и их масштаб.' }
  ], ['backing-vocals', 'layered-vocals', 'choir']),
  vocal('backing-vocals', 'Бэк-вокал вокруг основного голоса.', 'Добавляет ответы, подклад, гармонии или акцентные фразы позади lead vocal.', 'Полезен для припевов, post-chorus и финальных повторов. Уточняйте, должен ли бэк отвечать, поддерживать или усиливать.', [
    { title: 'Ответы в припеве', prompt: '[Chorus: lead vocal with backing vocal answers]', whyItWorks: 'Разделяет роль лида и бэков.' }
  ], ['harmony', 'call-response', 'ad-lib']),
  vocal('rap', 'Ритмическая рэп-подача вокала.', 'Смещает вокал к ритмической речи, flow и плотной артикуляции.', 'В Style задаёт общий жанровый вокал. В Lyrics можно применять к конкретному verse, если припев должен оставаться sung.', [
    { title: 'Рэп-куплет', prompt: '[Verse: rap delivery, tight pocket, clear diction]', whyItWorks: 'Локально задаёт flow для куплета.' }
  ], ['spoken-word', 'triplet flow', 'boom bap groove']),
  vocal('spoken-word', 'Разговорная повествовательная подача.', 'Даёт менее мелодический, более речитативный или narrative vocal.', 'Работает для intro, bridge, outro, cinematic narration. Если нужен рэп, лучше использовать Rap.', [
    { title: 'Рассказ во вступлении', prompt: '[Intro: spoken word, close mic, dry vocal]', whyItWorks: 'Сочетает речь, близость и сухую обработку.' }
  ], ['narration', 'rap', 'spoken-outro']),
  vocal('whisper', 'Шёпот или очень тихая интимная подача.', 'Снижает громкость и плотность вокала, добавляет близость и напряжение.', 'Лучше применять локально: intro, verse, bridge. В full chorus может конфликтовать с belted/full production.', [
    { title: 'Тихий куплет', prompt: '[Verse: whisper vocal, minimal beat, close mic]', whyItWorks: 'Поддерживает шёпот разреженной аранжировкой.' }
  ], ['breathy-vocal', 'spoken-word', 'silence']),
  vocal('scream', 'Крик, скрим или агрессивная вокальная атака.', 'Добавляет harsh/metal/punk энергию и высокую интенсивность вокала.', 'Требует жанрового контекста. Без metalcore/punk/aggressive модель может дать просто громкий вокал.', [
    { title: 'Metal chorus', prompt: '[Chorus: screamed vocals, heavy guitars, double-time drums]', whyItWorks: 'Скрим связан с жанровой фактурой.' }
  ], ['belted-vocal', 'aggressive', 'metal']),
  vocal('auto-tune', 'Питч-коррекция и роботизированная pop/trap окраска.', 'Даёт вокалу более обработанный, ровный или намеренно синтетический характер.', 'В Style работает как общий vocal effect. В Lyrics можно применить к hook или post-chorus.', [
    { title: 'Trap hook', prompt: '[Hook: auto-tuned vocal, melodic rap, wide delay]', whyItWorks: 'Auto-Tune связан с жанром и ролью hook.' }
  ], ['vocal-chops', 'rap', 'wet vocals']),

  instrument('instrumental', 'Секция без основного вокала.', 'Освобождает место для инструментов, groove, solo или перехода.', 'Один из самых полезных тегов, если нужно убрать вокал локально. Для полностью инструментальной песни лучше использовать instrumental в общем prompt/режиме.', [
    { title: 'Без вокала между куплетами', prompt: '[Instrumental: synth motif, no lead vocal]', whyItWorks: 'Явно задаёт отсутствие лида и материал секции.' }
  ], ['instrumental-break', 'instrumental-interlude', 'solo']),
  instrument('guitar-solo', 'Выделенное гитарное соло.', 'Фокусирует секцию на lead guitar: мелодия, riff, bend, distortion или clean tone.', 'Надёжнее работает, если стиль уже допускает гитары. В synth-pop без гитар лучше уточнять clean electric guitar или короткое solo.', [
    { title: 'Рок-соло', prompt: '[Guitar Solo: distorted tone, solo spotlight, high energy]', whyItWorks: 'Даёт инструмент, тон и роль.' }
  ], ['solo', 'distorted electric guitar', 'clean electric guitar']),
  instrument('piano-solo', 'Выделенное фортепианное соло.', 'Смещает фокус на piano lead, arpeggio или эмоциональный instrumental break.', 'Хорошо работает в bridge, intro, outro и stripped-down секциях.', [
    { title: 'Bridge piano', prompt: '[Bridge: piano solo, soft dynamics, room reverb]', whyItWorks: 'Соединяет инструмент с местом формы.' }
  ], ['solo', 'grand piano', 'electric piano']),
  instrument('bass-drop', 'Тяжёлый басовый drop.', 'Добавляет ударный sub/808/dubstep/trap вход после build или break.', 'Лучше работает после Build-Up или Break. В акустических стилях может увести результат в EDM, если не ограничить контекст.', [
    { title: 'Trap drop', prompt: '[Drop: bass drop, 808 drums, aggressive entry]', whyItWorks: 'Связывает bass drop с ритмической основой.' }
  ], ['drop', 'build', '808 bass'], ['Использовать вместе с acoustic only без пояснения.']),
  instrument('drum-fill', 'Короткий барабанный переход.', 'Добавляет короткий fill, который подводит к следующей секции или акценту.', 'Используйте перед Chorus, Drop, Bridge или Final Chorus. Обычно лучше короткий fill, чем длинная барабанная секция.', [
    { title: 'Перед припевом', prompt: '[Drum Fill: last bar, rising into chorus]', whyItWorks: 'Привязывает fill к моменту перехода.' }
  ], ['percussion-break', 'snare-roll', 'impact']),
  dynamic('fade-out', 'Плавное финальное затухание.', 'Подсказывает постепенно увести громкость и закончить трек без резкой остановки.', 'Лучше ставить в Outro. Если нужен точный конец, добавьте [End] после fade-out.', [
    { title: 'Outro fade', prompt: '[Outro: fade out, reverb tail]\n[End]', whyItWorks: 'Сочетает затухание и явную остановку формы.' }
  ], ['outro', 'end', 'decrescendo']),
];

export const tagKnowledgeById = new Map(tagKnowledge.map((item) => [item.tagId, item]));

export function getTagKnowledge(tagId: string): TagKnowledge | undefined {
  return tagKnowledgeById.get(tagId);
}
