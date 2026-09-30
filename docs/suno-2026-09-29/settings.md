# Настройки тегов

[К оглавлению](README.md)

Это описание текущих полей приложения, а не API Suno. Изменения профилей указаны в каждой статье. Выбор `none` ничего не добавляет. Произвольные модификаторы добавляются обычным текстом, не запускают функции Studio. Не вставляйте API-ключи, пароли или личные данные.

<a id="number"></a>
## Номер секции · number

Номер отличает повторения секции; final просит финальный вариант. Не число повторов и не длительность. У End, Hard Stop и похожих завершающих меток поле следует скрыть.

Тип: select. Варианты текущего интерфейса: `none`, `1`, `2`, `3`, `final`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="sectionEnergy"></a>
## Энергия секции · sectionEnergy

Описывает активность конкретной части, не BPM и не громкость файла. Контраст низкой энергии куплета и высокой энергии припева допустим.

Тип: select. Варианты текущего интерфейса: `none`, `low energy`, `medium energy`, `high energy`, `build tension`, `drop energy`, `stripped down`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="arrangement"></a>
## Аранжировка секции · arrangement

Просит состав или плотность конкретной части. Full band и acoustic only могут быть альтернативами; no drums относится только к указанной области.

Тип: select. Варианты текущего интерфейса: `none`, `minimal beat`, `full band`, `acoustic only`, `no drums`, `wide harmonies`, `instrumental hook`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="transition"></a>
## Переход · transition

Просит характер перехода. Это обычные слова, не запуск аудиоэффекта и не точная монтажная команда.

Тип: select. Варианты текущего интерфейса: `none`, `fade in`, `fade out`, `hard stop`, `riser`, `snare roll`, `tape stop`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="vocalRange"></a>
## Диапазон / роль · vocalRange

Смешанный текущий список регистра и роли: alto/tenor/falsetto не равны lead/backing. В плане предлагается разделение, без обещания точных нот.

Тип: select. Варианты текущего интерфейса: `none`, `lead vocal`, `backing vocals`, `alto`, `tenor`, `falsetto`, `choir`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="vocalDelivery"></a>
## Подача · vocalDelivery

Выбирает манеру произнесения/пения: мягкую, воздушную, хриплую, разговорную, интенсивную или рэповую.

Тип: select. Варианты текущего интерфейса: `none`, `soft vocal`, `breathy vocal`, `raspy vocal`, `spoken word`, `belted vocal`, `rap delivery`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="vocalLayer"></a>
## Слои · vocalLayer

Определяет взаимодействие голосов: один, гармонические слои, ответы, групповое пение или удвоение. Не количество реальных дорожек.

Тип: select. Варианты текущего интерфейса: `none`, `single voice`, `stacked harmonies`, `call and response`, `gang vocals`, `doubled vocal`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="vocalEffect"></a>
## Эффект голоса · vocalEffect

Просит характер обработки голоса. Не выбирает Voices и не задаёт идентичность певца.

Тип: select. Варианты текущего интерфейса: `none`, `dry vocal`, `wide reverb`, `slapback delay`, `auto-tuned`, `vocal chops`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="instrumentRole"></a>
## Роль · instrumentRole

Задаёт функцию инструмента: соло, фон, ответ, ведущий мотив, ритм или фактура. Не универсально подходит тегу Instrumental.

Тип: select. Варианты текущего интерфейса: `none`, `solo spotlight`, `background motif`, `riff answer`, `hook lead`, `rhythmic pulse`, `texture layer`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="instrumentTone"></a>
## Тембр · instrumentTone

Описывает тембр: чистый, тёплый, яркий, перегруженный, приглушённый или широкий. Некоторые варианты неприменимы к выбранному инструменту.

Тип: select. Варианты текущего интерфейса: `none`, `clean tone`, `warm tone`, `bright tone`, `distorted tone`, `muted tone`, `wide stereo`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="dynamicShape"></a>
## Форма · dynamicShape

Характер изменения: постепенно, внезапно, коротко, протяжённо. One bar/two bars остаются пожеланием длительности, не таймером.

Тип: select. Варианты текущего интерфейса: `none`, `gradual`, `sudden`, `short accent`, `long swell`, `one bar`, `two bars`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="dynamicLevel"></a>
## Интенсивность · dynamicLevel

Относительная интенсивность: тихо, средне, громко или тишина. Не фиксирует уровень мастеринга.

Тип: select. Варианты текущего интерфейса: `none`, `soft`, `medium`, `loud`, `very loud`, `drop to silence`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="timing"></a>
## Момент · timing

Музыкальный ориентир для перехода. Перед припевом не равнозначно точной временной метке.

Тип: select. Варианты текущего интерфейса: `none`, `before chorus`, `after chorus`, `before drop`, `end of section`, `last bar`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="productionSpace"></a>
## Пространство · productionSpace

Описывает ощущение пространства и стереопозиции. Dry означает минимум слышимой пространственной обработки, не удаление уже записанных эффектов.

Тип: select. Варианты текущего интерфейса: `none`, `dry`, `room reverb`, `plate reverb`, `hall reverb`, `wide stereo`, `mono center`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="productionTexture"></a>
## Текстура · productionTexture

Выбирает общую окраску обработки и шумовую фактуру, не пресет реального устройства.

Тип: select. Варианты текущего интерфейса: `none`, `clean mix`, `dirty mix`, `warm analog`, `tape saturation`, `vinyl crackle`, `glitch edits`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="effectAmount"></a>
## Сила эффекта · effectAmount

Сила и область эффекта в текущем смешанном списке. Subtle/heavy задают степень; only on hook/tail only задают область, а не степень.

Тип: select. Варианты текущего интерфейса: `none`, `subtle`, `moderate`, `heavy`, `only on hook`, `tail only`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="mixFocus"></a>
## Фокус · mixFocus

Назначает партию, которую хотелось бы слышать лучше. Не двигает фейдер громкости.

Тип: select. Варианты текущего интерфейса: `none`, `lead vocal`, `drums`, `bass`, `synth hook`, `guitars`, `choir`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="tempoFeel"></a>
## Ощущение · tempoFeel

Просит характер движения: расслабленный, собранный, настойчивый, танцевальный, живой или ровный. Не меняет число BPM.

Тип: select. Варианты текущего интерфейса: `none`, `laid back`, `tight pocket`, `driving`, `danceable`, `human feel`, `metronomic`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="grooveDensity"></a>
## Плотность грува · grooveDensity

Плотность и ритмическая организация. Sparse/busy относятся к количеству событий, syncopated/straight к их размещению.

Тип: select. Варианты текущего интерфейса: `none`, `sparse`, `medium density`, `busy`, `syncopated`, `straight`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="drumFeel"></a>
## Барабаны · drumFeel

Выбирает характер ударных либо их отсутствие; может конфликтовать с инструментальным составом в той же секции.

Тип: select. Варианты текущего интерфейса: `none`, `no drums`, `live drums`, `808 drums`, `brush drums`, `breakbeat drums`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="diction"></a>
## Дикция · diction

Просит разборчивость и манеру артикуляции. Неправильное ударение или чтение имени всё равно нужно проверять.

Тип: select. Варианты текущего интерфейса: `none`, `clear diction`, `soft consonants`, `accent-neutral`, `street delivery`, `theatrical diction`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="languageMode"></a>
## Режим · languageMode

Уточняет распределение языков по секциям. Не переводит слова. Rap delivery здесь логически лишний и должен перейти в подачу.

Тип: select. Варианты текущего интерфейса: `none`, `single language`, `bilingual hook`, `code-switching verses`, `chorus in English`, `rap delivery`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="avoidScope"></a>
## Где избегать · avoidScope

Текущий текстовый модификатор области исключения. Официальная поддержка секционных исключений через Exclude не подтверждена; не переносить как строгий параметр.

Тип: select. Варианты текущего интерфейса: `none`, `whole song`, `verses only`, `chorus only`, `intro only`, `outro only`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="strictness"></a>
## Жесткость · strictness

Текущая формулировка пожелания, а не реальная строгость запрета. Предлагается убрать и заменить ясным перечнем в Exclude.

Тип: select. Варианты текущего интерфейса: `none`, `lightly avoid`, `strongly avoid`, `replace with acoustic texture`, `replace with clean mix`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="styleEnergy"></a>
## Энергия · styleEnergy

Общая энергия исполнения. Не делает припев обязательным и не определяет автоматически скорость.

Тип: select. Варианты текущего интерфейса: `none`, `low energy`, `medium energy`, `high energy`, `anthemic`, `intimate`, `cinematic`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="styleTexture"></a>
## Фактура · styleTexture

Плотность и окраска общей аранжировки: разреженная, плотная, тёплая, обработанная, грубая или широкая.

Тип: select. Варианты текущего интерфейса: `none`, `sparse`, `dense`, `warm analog`, `polished`, `raw`, `wide stereo`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

<a id="styleArrangement"></a>
## Аранжировка · styleArrangement

Общий состав: минимальное сопровождение, ансамбль, акустика, синтезаторы или оркестровый слой.

Тип: select. Варианты текущего интерфейса: `none`, `minimal beat`, `full band`, `acoustic only`, `synth-heavy`, `orchestral layer`.

none не выводится. Выбранный текст добавляется к подсказке; key и label не являются именами настроек Suno.

## Пользовательские поля

- text: добавляет пользовательскую фразу; это не новая возможность модели.
- select: подставляет выбранный текст, а не скрытое числовое значение.
- number: добавляет число; чтобы оно имело смысл, нужна единица и контекст. Число 8 не означает восемь тактов само по себе.
- min/max и defaultValue ограничивают ввод в нашем интерфейсе, не поведение Suno.
- Не создаём выдуманные параметры точности, процентов соблюдения и Seed без подтверждённого контроля в Suno.
