import type { Tag, TagCategory } from '../domain/types';

const structureParams = [
  { key: 'number', label: 'Номер', type: 'select' as const, options: ['none', '1', '2', '3', 'final'] },
  { key: 'vocal', label: 'Вокал', type: 'select' as const, options: ['none', 'male', 'female', 'duet', 'choir', 'rap', 'whisper'] },
  { key: 'energy', label: 'Энергия', type: 'select' as const, options: ['low', 'medium', 'high', 'build', 'drop'] },
  { key: 'custom', label: 'Модификаторы', type: 'text' as const }
];

const make = (
  id: string,
  label: string,
  sunoText: string,
  category: TagCategory,
  placement: Tag['placement'],
  descriptionRu: string,
  confidence: Tag['confidence'] = 'common',
  aliases: string[] = [],
  examples: string[] = [sunoText]
): Tag => ({
  id,
  label,
  sunoText,
  category,
  placement,
  confidence,
  aliases,
  descriptionRu,
  examples,
  parameters: category === 'structure' ? structureParams : undefined
});

export const tags: Tag[] = [
  make('intro', '[Intro]', '[Intro]', 'structure', 'lyrics', 'Вступление', 'official', ['[Instrumental Intro]']),
  make('verse', '[Verse]', '[Verse]', 'structure', 'lyrics', 'Куплет', 'official', ['[Verse 1]', '[Verse 2]']),
  make('pre-chorus', '[Pre-Chorus]', '[Pre-Chorus]', 'structure', 'lyrics', 'Разгон к припеву', 'official', ['[Prechorus]']),
  make('chorus', '[Chorus]', '[Chorus]', 'structure', 'lyrics', 'Основной хук', 'official', ['[Hook Chorus]']),
  make('post-chorus', '[Post-Chorus]', '[Post-Chorus]', 'structure', 'lyrics', 'Секция после припева', 'common', ['[Post Hook]']),
  make('hook', '[Hook]', '[Hook]', 'structure', 'lyrics', 'Короткий запоминающийся фрагмент', 'common', ['[Catchy Hook]']),
  make('bridge', '[Bridge]', '[Bridge]', 'structure', 'lyrics', 'Контрастная секция', 'official', ['[Middle 8]']),
  make('break', '[Break]', '[Break]', 'structure', 'lyrics', 'Спад или пауза', 'common', ['[Breakdown]']),
  make('build', '[Build-Up]', '[Build-Up]', 'structure', 'lyrics', 'Нарастание', 'common', ['[Build]']),
  make('drop', '[Drop]', '[Drop]', 'structure', 'lyrics', 'Кульминационный выброс энергии', 'common', ['[Bass Drop]']),
  make('interlude', '[Interlude]', '[Interlude]', 'structure', 'lyrics', 'Связка', 'common', ['[Instrumental Interlude]']),
  make('solo', '[Solo]', '[Solo]', 'structure', 'lyrics', 'Сольный фрагмент', 'common', ['[Guitar Solo]', '[Piano Solo]']),
  make('outro', '[Outro]', '[Outro]', 'structure', 'lyrics', 'Завершение', 'official', ['[Finale]']),
  make('end', '[End]', '[End]', 'structure', 'lyrics', 'Финальная остановка', 'official', ['[Hard End]']),
  make('refrain', '[Refrain]', '[Refrain]', 'structure', 'lyrics', 'Повторяемая строка или короткий припев в конце куплета'),
  make('coda', '[Coda]', '[Coda]', 'structure', 'lyrics', 'Заключительная музыкальная секция'),
  make('final-chorus', '[Final Chorus]', '[Final Chorus]', 'structure', 'lyrics', 'Последний усиленный припев', 'common', ['[Last Chorus]']),
  make('chorus-variation', '[Chorus Variation]', '[Chorus Variation]', 'structure', 'lyrics', 'Вариант припева с отличающейся подачей'),
  make('verse-variation', '[Verse Variation]', '[Verse Variation]', 'structure', 'lyrics', 'Куплет с измененной фактурой или ритмом'),
  make('instrumental-intro', '[Instrumental Intro]', '[Instrumental Intro]', 'structure', 'lyrics', 'Вступление без вокала'),
  make('drop-chorus', '[Drop Chorus]', '[Drop Chorus]', 'structure', 'lyrics', 'Припев с EDM/trap drop-энергией'),
  make('silent-chorus', '[Silent Chorus]', '[Silent Chorus]', 'structure', 'lyrics', 'Припев с резким снижением плотности'),
  make('climax', '[Climax]', '[Climax]', 'structure', 'lyrics', 'Кульминация трека'),
  make('big-finish', '[Big Finish]', '[Big Finish]', 'structure', 'lyrics', 'Большая финальная развязка'),
  make('hard-stop', '[Hard Stop]', '[Hard Stop]', 'structure', 'lyrics', 'Резкое окончание вместо fade out'),
  make('spoken-outro', '[Spoken Outro]', '[Spoken Outro]', 'structure', 'lyrics', 'Финальная разговорная фраза'),

  make('male-vocal', '[Male Vocal]', '[Male Vocal]', 'vocal', 'both', 'Мужской вокал'),
  make('female-vocal', '[Female Vocal]', '[Female Vocal]', 'vocal', 'both', 'Женский вокал'),
  make('duet', '[Duet]', '[Duet]', 'vocal', 'lyrics', 'Два голоса'),
  make('choir', '[Choir]', '[Choir]', 'vocal', 'both', 'Хор'),
  make('harmony', '[Harmony]', '[Harmony]', 'vocal', 'lyrics', 'Гармонии'),
  make('backing-vocals', '[Backing Vocals]', '[Backing Vocals]', 'vocal', 'lyrics', 'Бэк-вокал'),
  make('rap', '[Rap]', '[Rap]', 'vocal', 'both', 'Рэп-подача'),
  make('spoken-word', '[Spoken Word]', '[Spoken Word]', 'vocal', 'both', 'Spoken delivery'),
  make('whisper', '[Whisper]', '[Whisper]', 'vocal', 'lyrics', 'Шепот'),
  make('scream', '[Scream]', '[Scream]', 'vocal', 'lyrics', 'Крик или скрим'),
  make('ad-lib', '[Ad-lib]', '[Ad-lib]', 'vocal', 'lyrics', 'Импровизационные вставки'),
  make('crowd-chant', '[Crowd Chant]', '[Crowd Chant]', 'vocal', 'lyrics', 'Скандированный хук'),
  make('auto-tune', '[Auto-Tune]', '[Auto-Tune]', 'vocal', 'both', 'Питч-коррекция / robotic pop-vocal', 'common', ['[Autotune]', 'auto-tuned vocals']),
  make('vocal-run', '[Vocal Run]', '[Vocal Run]', 'vocal', 'lyrics', 'Быстрый мелизматический пассаж'),
  make('melisma', '[Melisma]', '[Melisma]', 'vocal', 'lyrics', 'Несколько нот на один слог'),
  make('falsetto', '[Falsetto]', '[Falsetto]', 'vocal', 'both', 'Высокая воздушная вокальная подача'),
  make('belted-vocal', '[Belted Vocal]', '[Belted Vocal]', 'vocal', 'both', 'Мощная грудная подача'),
  make('raspy-vocal', '[Raspy Vocal]', '[Raspy Vocal]', 'vocal', 'both', 'Хриплая текстура вокала'),
  make('breathy-vocal', '[Breathy Vocal]', '[Breathy Vocal]', 'vocal', 'both', 'Воздушная интимная подача'),
  make('call-response', '[Call and Response]', '[Call and Response]', 'vocal', 'lyrics', 'Вопрос-ответ между лидом и бэками'),
  make('gang-vocals', '[Gang Vocals]', '[Gang Vocals]', 'vocal', 'both', 'Групповой скандированный вокал'),
  make('layered-vocals', '[Layered Vocals]', '[Layered Vocals]', 'vocal', 'both', 'Наложенные вокальные слои'),
  make('vocal-chops', '[Vocal Chops]', '[Vocal Chops]', 'vocal', 'both', 'Нарезанные вокальные сэмплы'),
  make('stutter-vocal', '[Stutter Vocal]', '[Stutter Vocal]', 'vocal', 'lyrics', 'Ритмический повтор слогов'),
  make('scat', '[Scat]', '[Scat]', 'vocal', 'lyrics', 'Джазовая импровизация голосом'),
  make('narration', '[Narration]', '[Narration]', 'vocal', 'lyrics', 'Нарративная разговорная вставка'),

  make('instrumental', '[Instrumental]', '[Instrumental]', 'instrument', 'lyrics', 'Секция без вокала'),
  make('instrumental-break', '[Instrumental Break]', '[Instrumental Break]', 'instrument', 'lyrics', 'Инструментальная пауза'),
  make('instrumental-interlude', '[Instrumental Interlude]', '[Instrumental Interlude]', 'instrument', 'lyrics', 'Музыкальная связка без текста'),
  make('guitar-solo', '[Guitar Solo]', '[Guitar Solo]', 'instrument', 'lyrics', 'Гитарное соло'),
  make('fingerstyle-guitar-solo', '[Fingerstyle Guitar Solo]', '[Fingerstyle Guitar Solo]', 'instrument', 'lyrics', 'Фингерстайл-соло на акустической гитаре'),
  make('piano-solo', '[Piano Solo]', '[Piano Solo]', 'instrument', 'lyrics', 'Фортепианное соло'),
  make('saxophone-solo', '[Saxophone Solo]', '[Saxophone Solo]', 'instrument', 'lyrics', 'Саксофонное соло'),
  make('synth-solo', '[Synth Solo]', '[Synth Solo]', 'instrument', 'lyrics', 'Синтезаторное соло'),
  make('trumpet-solo', '[Trumpet Solo]', '[Trumpet Solo]', 'instrument', 'lyrics', 'Трубное соло'),
  make('violin-solo', '[Violin Solo]', '[Violin Solo]', 'instrument', 'lyrics', 'Скрипичное соло'),
  make('cello-solo', '[Cello Solo]', '[Cello Solo]', 'instrument', 'lyrics', 'Виолончельное соло'),
  make('organ-solo', '[Organ Solo]', '[Organ Solo]', 'instrument', 'lyrics', 'Соло органа'),
  make('banjo-interlude', '[Banjo Interlude]', '[Banjo Interlude]', 'instrument', 'lyrics', 'Кантри/bluegrass-связка с banjo', 'experimental'),
  make('melodic-bass', '[Melodic Bass]', '[Melodic Bass]', 'instrument', 'lyrics', 'Мелодичная басовая линия'),
  make('syncopated-bass', '[Syncopated Bass]', '[Syncopated Bass]', 'instrument', 'lyrics', 'Синкопированный басовый рисунок'),
  make('bass-drop', '[Bass Drop]', '[Bass Drop]', 'instrument', 'lyrics', 'Тяжелый басовый drop для EDM/trap/dubstep'),
  make('percussion-break', '[Percussion Break]', '[Percussion Break]', 'instrument', 'lyrics', 'Перкуссионная пауза или барабанный break'),
  make('drum-fill', '[Drum Fill]', '[Drum Fill]', 'instrument', 'lyrics', 'Барабанный переход'),
  make('snare-roll', '[Snare Roll]', '[Snare Roll]', 'instrument', 'lyrics', 'Дробь малого барабана перед акцентом'),
  make('cymbal-crash', '[Cymbal Crash]', '[Cymbal Crash]', 'instrument', 'lyrics', 'Акцент тарелкой'),
  make('reverse-cymbal', '[Reverse Cymbal]', '[Reverse Cymbal]', 'instrument', 'lyrics', 'Обратная тарелка как riser-переход'),
  make('brass-stabs', '[Brass Stabs]', '[Brass Stabs]', 'instrument', 'lyrics', 'Короткие духовые акценты'),
  make('horn-section', '[Horn Section]', '[Horn Section]', 'instrument', 'lyrics', 'Секция духовых'),
  make('choir-pad', '[Choir Pad]', '[Choir Pad]', 'instrument', 'lyrics', 'Хоровой pad как атмосфера'),
  make('orchestral-hit', '[Orchestral Hit]', '[Orchestral Hit]', 'instrument', 'lyrics', 'Оркестровый ударный акцент'),
  make('tape-stop', '[Tape Stop]', '[Tape Stop]', 'instrument', 'lyrics', 'Замедление/остановка ленты как переход'),
  make('strings-rise', '[Strings Rise]', '[Strings Rise]', 'instrument', 'lyrics', 'Нарастание струнных'),
  make('pad-atmosphere', '[Pad Atmosphere]', '[Pad Atmosphere]', 'instrument', 'lyrics', 'Атмосферные пэды'),

  make('fade-in', '[Fade In]', '[Fade In]', 'dynamics', 'lyrics', 'Плавное появление'),
  make('fade-out', '[Fade Out]', '[Fade Out]', 'dynamics', 'lyrics', 'Плавное затухание'),
  make('silence', '[Silence]', '[Silence]', 'dynamics', 'lyrics', 'Пауза'),
  make('crescendo', '[Crescendo]', '[Crescendo]', 'dynamics', 'lyrics', 'Нарастание громкости'),
  make('decrescendo', '[Decrescendo]', '[Decrescendo]', 'dynamics', 'lyrics', 'Спад'),
  make('tempo-120-section', '[Tempo: 120 BPM]', '[Tempo: 120 BPM]', 'dynamics', 'lyrics', 'Локальный BPM'),
  make('key-change', '[Key Change]', '[Key Change]', 'dynamics', 'lyrics', 'Модуляция'),
  make('modulation', '[Modulation]', '[Modulation]', 'dynamics', 'lyrics', 'Переход в другую тональность или гармонический центр'),
  make('half-time', '[Half-Time]', '[Half-Time]', 'dynamics', 'lyrics', 'Половинный темп'),
  make('double-time', '[Double-Time]', '[Double-Time]', 'dynamics', 'lyrics', 'Ускоренная подача'),
  make('rubato', '[Rubato]', '[Rubato]', 'dynamics', 'lyrics', 'Гибкий свободный темп'),
  make('staccato', '[Staccato]', '[Staccato]', 'dynamics', 'lyrics', 'Короткая отрывистая артикуляция'),
  make('legato', '[Legato]', '[Legato]', 'dynamics', 'lyrics', 'Связанная плавная артикуляция'),
  make('accent', '[Accent]', '[Accent]', 'dynamics', 'lyrics', 'Сильный музыкальный акцент'),
  make('forte', '[Forte]', '[Forte]', 'dynamics', 'lyrics', 'Громкая подача'),
  make('piano-dynamic', '[Piano]', '[Piano]', 'dynamics', 'lyrics', 'Тихая динамика'),
  make('riser', '[Riser]', '[Riser]', 'dynamics', 'lyrics', 'EDM-нарастание'),
  make('impact', '[Impact]', '[Impact]', 'dynamics', 'lyrics', 'Ударный акцент'),
  make('dropout', '[Dropout]', '[Dropout]', 'dynamics', 'lyrics', 'Внезапное снятие инструментов'),
  make('pause', '[Pause]', '[Pause]', 'dynamics', 'lyrics', 'Короткая пауза перед продолжением'),

  ...['pop', 'rock', 'indie rock', 'alternative rock', 'folk', 'country', 'hip-hop', 'trap', 'R&B', 'soul', 'funk', 'jazz', 'blues', 'EDM', 'house', 'techno', 'ambient', 'cinematic', 'classical', 'metal', 'punk', 'reggae', 'dub', 'latin', 'afrobeats', 'amapiano', 'k-pop', 'j-pop', 'synthwave', 'lo-fi', 'gospel', 'disco', 'hyperpop', 'drum and bass', 'dubstep', 'future bass', 'garage', 'phonk', 'shoegaze', 'post-rock', 'worship', 'new wave', 'city pop'].map((value) =>
    make(`genre-${value.replaceAll(' ', '-')}`, value, value, 'genre', 'style', 'Основной жанр')
  ),
  ...['dance-pop', 'electropop', 'synth-pop', 'dream pop', 'bedroom pop', 'pop rock', 'emo pop', 'metalcore', 'deathcore', 'nu metal', 'neo-soul', 'alt R&B', 'boom bap', 'cloud rap', 'drill', 'festival house', 'deep house', 'progressive house', 'minimal techno', 'melodic techno', 'vocal jazz', 'bossa nova', 'reggae dub', 'ambient lo-fi', 'dark ambient', 'cinematic trailer', 'orchestral pop', 'country pop', 'bluegrass', 'psychedelic rock'].map((value) =>
    make(`subgenre-${value.replaceAll(' ', '-')}`, value, value, 'subgenre', 'style', 'Поджанр или уточнение')
  ),
  ...['upbeat', 'melancholic', 'euphoric', 'aggressive', 'dreamy', 'intimate', 'anthemic', 'dark', 'hopeful', 'nostalgic', 'energetic', 'romantic', 'sad', 'bittersweet', 'mysterious', 'uplifting', 'chill', 'calm', 'epic', 'triumphant', 'tense', 'brooding', 'playful', 'sensual', 'haunting', 'warm', 'cold', 'lonely', 'rebellious', 'spiritual', 'cinematic tension'].map((value) =>
    make(`mood-${value}`, value, value, 'mood', 'style', 'Настроение и энергия')
  ),
  ...['66 BPM', '70 BPM', '76 BPM', '82 BPM', '90 BPM', '92 BPM', '96 BPM', '100 BPM', '105 BPM', '110 BPM', '118 BPM', '120 BPM', '126 BPM', '128 BPM', '130 BPM', '140 BPM', '150 BPM', '160 BPM', '170 BPM', '180 BPM', 'slow tempo', 'mid-tempo', 'fast tempo', 'adagio', 'andante', 'allegro', 'presto'].map((value) =>
    make(`tempo-${value.toLowerCase().replaceAll(' ', '-')}`, value, value, 'tempo', 'style', 'Темп')
  ),
  ...['female vocals', 'male vocals', 'female lead vocal', 'male vocal', 'smooth soulful vocals', 'aggressive rap vocals', 'soft intimate vocals', 'gospel choir', 'stacked harmonies', 'screaming vocals', 'lead vocals', 'breathy lead vocal', 'raspy lead vocal', 'falsetto hook', 'belted chorus vocal', 'spoken word verses', 'call and response vocals', 'gang vocals', 'vocal chops', 'auto-tuned vocals', 'dry close vocal', 'wide layered harmonies'].map((value) =>
    make(`style-vocal-${value.replaceAll(' ', '-')}`, value, value, 'vocal', 'style', 'Вокальный дескриптор')
  ),
  ...['acoustic guitar', 'fingerpicked guitar', 'nylon guitar', 'clean electric guitar', 'distorted electric guitar', 'power chords', 'slide guitar', 'pedal steel', 'banjo', 'mandolin', 'fiddle', 'electric piano', 'Rhodes piano', 'grand piano', 'upright piano', 'Hammond organ', 'bright synths', 'analog synths', 'synth pads', 'arpeggiated synth', 'supersaw lead', 'pluck synth', '808 drums', '808 bass', 'sub bass', 'trap hi-hats', 'live drums', 'brush drums', 'breakbeat drums', 'punchy electronic drums', 'gated drums', 'deep bass', 'synth bass', 'upright bass', 'strings', 'legato strings', 'pizzicato strings', 'brass', 'horn section', 'choir', 'saxophone', 'trumpet', 'flute', 'marimba', 'kalimba', 'tabla', 'congas', 'taiko drums', 'heavy synths', 'full band', 'acoustic only', 'no drums'].map((value) =>
    make(`instrument-${value.replaceAll(' ', '-')}`, value, value, 'instrument', 'style', 'Инструменты')
  ),
  ...['four-on-the-floor', 'shuffle', 'swing', 'half-time', 'double-time', 'syncopated rhythm', 'polyrhythm', 'groove', 'driving backbeat', 'breakbeat', 'dem bow rhythm', 'reggaeton rhythm', 'triplet flow', 'boom bap groove', '2-step garage rhythm', 'waltz 3/4', '6/8 ballad feel', 'straight eighths', 'offbeat skank'].map((value) =>
    make(`rhythm-${value}`, value, value, 'rhythm', 'style', 'Ритм и groove')
  ),
  ...['lo-fi', 'polished mix', 'polished radio-ready mix', 'raw production', 'warm analog', 'wide reverb', 'hall reverb', 'plate reverb', 'room reverb', 'reverb tail', 'delay echo', 'slapback delay', 'dotted eighth delay', 'distorted', 'soft clipping', 'compressed drums', 'parallel compression', 'sidechain compression', 'stereo wide', 'mono vocal', 'dry vocals', 'wet vocals', 'tape saturation', 'vintage tape', 'cassette hiss', 'vinyl crackle', 'filter sweep', 'low-pass filter', 'high-pass filter', 'phaser', 'flanger', 'chorus effect', 'tremolo effect', 'bitcrush', 'glitch edits', 'reverse swell', 'clean mix', 'dirty mix', 'room mic drums'].map((value) =>
    make(`production-${value.replaceAll(' ', '-')}`, value, value, 'production', 'both', 'Продакшн и микс')
  ),
  ...['1950s rock and roll', '1960s soul', '1970s funk', '1970s disco', '1980s synth-pop', '1980s arena rock', '1990s grunge', '1990s boom bap', '2000s pop punk', '2000s R&B', '2010s EDM', '2020s hyperpop', 'retro', 'vintage', 'modern', 'futuristic', 'Y2K', 'radio-ready'].map((value) =>
    make(`era-${value.replaceAll(' ', '-')}`, value, value, 'era', 'style', 'Эпоха или референс без имен артистов')
  ),
  ...['Russian lyrics', 'English lyrics', 'Spanish lyrics', 'French lyrics', 'German lyrics', 'Portuguese lyrics', 'Japanese lyrics', 'Korean lyrics', 'bilingual Russian-English', 'bilingual Spanish-English', 'clear diction', 'rap in Russian', 'soft consonants', 'accent-neutral vocal'].map((value) =>
    make(`language-${value.replaceAll(' ', '-')}`, value, value, 'language', 'style', 'Язык и произношение')
  ),
  ...['avoid: trap', 'avoid: heavy guitars', 'avoid: screaming vocals', 'avoid: excessive reverb', 'avoid: muddy mix', 'avoid: long intro', 'avoid: spoken vocals', 'avoid: abrupt ending', 'avoid: distorted drums', 'avoid: generic EDM drop', 'avoid: chipmunk vocals', 'avoid: overcompressed master'].map((value) =>
    make(`avoid-${value.replaceAll(/[: ]/g, '-')}`, value, value, 'avoid', 'style', 'Исключение')
  )
];

export const tagById = new Map(tags.map((tag) => [tag.id, tag]));
