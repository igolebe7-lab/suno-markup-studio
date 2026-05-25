# AGENTS.md — Suno Markup Studio

## Использование инструментов

### Serena

Использовать Serena для понимания репозитория и навигации по коду, если инструмент доступен.

Serena предпочтительна, когда нужно:

- искать символы, функции, классы, интерфейсы или типы;
- находить references/usages;
- понимать call chain;
- планировать рефакторинг;
- редактировать большую или незнакомую область кода;
- проверять архитектуру перед изменениями.

Для семантических вопросов по коду предпочитать Serena обычному текстовому поиску. Если Serena недоступна, использовать локальные инструменты проекта: `rg`, чтение файлов, тесты и точечные диагностические скрипты.

### Context7

Использовать Context7 для документации внешних библиотек и фреймворков, если инструмент доступен.

Context7 нужен, когда работа касается:

- React, Next.js, Node.js, TypeScript, Prisma, Tailwind;
- testing libraries, build tools или framework APIs;
- обновления зависимостей;
- API, которые могли измениться;
- версионно-зависимого поведения.

Не полагаться только на память для современных API. Если Context7 недоступен, использовать официальную документацию и первоисточники.

### Omnisearch

Использовать Omnisearch для внешнего исследования, если инструмент доступен.

Omnisearch нужен, когда:

- Context7 недостаточно;
- нужны GitHub-примеры;
- нужно проверить public issues;
- исследуются ошибки;
- сравниваются варианты реализации;
- нужны migration notes, RFC, changelog или technical blog posts.

Предпочитать официальную документацию и исходные репозитории случайным статьям.

### Superpowers

Для нетривиальных задач использовать Superpowers-style workflow:

- уточнять допущения;
- инспектировать перед редактированием;
- планировать перед кодом;
- использовать тесты как обратную связь;
- просматривать собственный diff;
- объяснять tradeoffs.

Не бросаться сразу в реализацию, если задача затрагивает архитектуру, бизнес-логику, финансы, данные или UI-сценарии.

## Правила кода

- Следовать существующей структуре проекта.
- Держать изменения маленькими и сфокусированными.
- Не добавлять новые зависимости без понятного обоснования.
- Предпочитать простой код хитрому.
- Сохранять публичные API, если задача явно не требует изменения.
- Не менять форматирование, не относящееся к задаче.
- Не изменять generated files без необходимости.
- Не редактировать lockfiles, если зависимости не менялись.
- Не менять переменные окружения без документирования.

## Правила TypeScript

- Избегать `any`.
- Предпочитать явные типы на публичных границах.
- Переиспользовать существующие типы.
- Отделять runtime validation от TypeScript types, когда это применимо.
- Не глушить ошибки через `as unknown as` без сильной причины.

## 1. Назначение приложения

Suno Markup Studio — full-stack приложение для подготовки Suno-ready промптов:

- `Style / Genre prompt`: жанр, настроение, темп, вокал, инструменты, продакшн, язык и `avoid`.
- `Lyrics`: plain-text текст песни с метатегами в квадратных скобках: `[Verse]`, `[Chorus: full band]`, `[Outro]`, `[End]`.
- `Validation`: предупреждения о синтаксисе, структуре и конфликтующих дескрипторах.
- `Export`: копирование/выгрузка Style, Lyrics, Markdown, JSON project, TXT.

Приложение использует Fastify backend для аккаунтов и сохранения проектов пользователя. `localStorage` остается fallback/offline draft до входа или при недоступном API.

## 2. Технологический стек

- Monorepo: npm workspaces.
- Web runtime/build: Vite.
- UI: React + TypeScript.
- API: Fastify + TypeScript.
- Database: PostgreSQL через Prisma.
- Auth: opaque httpOnly cookie tokens, passwords via Argon2.
- Styling: Tailwind entry + custom CSS tokens in `src/styles.css`.
- State: Zustand store in `src/stores/projectStore.ts`.
- Text editor: CodeMirror 6, plain text only.
- Drag & drop: `@dnd-kit/core`.
- Local search: Fuse.js.
- Icons: lucide-react.
- Validation/tests: Vitest for domain unit tests, Playwright for e2e browser tests.

## 3. Структура приложения

```text
/
  package.json              workspace scripts
  .env.example              backend env template
  prisma/
    schema.prisma           PostgreSQL schema
  packages/
    shared/
      src/index.ts          shared Zod schemas and DTO types
  apps/
    api/
      src/server.ts         Fastify app and routes
      src/auth.ts           cookie session/token helpers
      src/prisma.ts         Prisma client
      src/projectMapper.ts  project DTO persistence mapping
    web/
      vite.config.ts        Vite + Vitest config
      src/                  React app
      e2e/                  Playwright tests
  playwright.config.ts      e2e browser test config
  tailwind.config.ts        design tokens bridge
  apps/web/src/
    App.tsx                 app shell and primary UI components
    main.tsx                React entrypoint
    styles.css              visual system and responsive layout
    data/
      tags.ts               seed tag catalog
      presets.ts            15 genre presets
    domain/
      types.ts              public app/domain types
      stylePrompt.ts        style chip ordering and prompt assembly
      lyrics.ts             lyrics tag insertion and outline extraction
      validation.ts         warning and conflict rules
      exporters.ts          plain-text export functions
      domain.test.ts        unit tests for domain behavior
    stores/
      projectStore.ts       Zustand state, autosave, undo/redo, auth/project sync
```

## 4. Основные пользовательские потоки

### 4.1 Сборка Style prompt

1. Пользователь открывает настройки тега кликом или перетаскивает style-compatible тег из библиотеки.
2. Быстрое добавление без модификаторов вызывает `addStyleTag(tagId)` и проверяет `placement !== 'lyrics'`.
3. Добавление настроенного дескриптора вызывает `appendStyleDescriptor(text)` и пишет plain-text фразу в Style prompt.
4. Тег без модификаторов попадает в `project.styleChips`.
5. `buildStylePrompt(styleChips, rawPrompt)` собирает prompt в рекомендуемом порядке:
   `genre → subgenre → era → mood → tempo → vocal → instrument → rhythm → production → language → avoid`.
6. Результат отображается в `style-output` и экспортируется как plain text.

### 4.2 Редактирование Lyrics

1. CodeMirror хранит и редактирует только plain text.
2. Любое изменение вызывает `setLyrics(nextText)`.
3. Метатеги подсвечиваются через CodeMirror `Decoration.mark`, но не превращаются в rich blocks.
4. Кнопка `+ [Chorus]`, действие `Вставить в Lyrics` в настройках тега или drop в lyrics-зону вызывает `insertLyricsTag`.
5. Вставка добавляет переносы строк вокруг тега, если курсор находится внутри строки.
6. Панель настройки тега должна показывать plain-text preview, aliases/examples, placement/confidence и модификаторы секции.

### 4.3 Drag & Drop

1. У каждого тега есть отдельная кнопка-handle с `aria-label="Перетащить ..."` и dnd listeners.
2. Основная кнопка тега открывает настройки тега; вставка выполняется через явные действия в панели.
3. Drop в `style-dropzone` вызывает `addStyleTag`.
4. Drop в `lyrics-dropzone` вычисляет позицию через `CodeMirror.EditorView.posAtCoords`.
5. Во время hover над Lyrics отображается `lyrics-drop-guide`: горизонтальная линия и подпись `перед/после строки N`.
6. При drop тег вставляется отдельной строкой перед или после ближайшей строки, раздвигая существующий текст вверх/вниз.
7. Если тег несовместим со Style, store не добавляет его в style prompt.

### 4.4 Пресеты

1. Пресеты живут в `src/data/presets.ts`.
2. Каждый пресет задает `stylePrompt`, `structureTemplate`, `quickTags`, `bpmRange`.
3. При применении пресета Style заменяется всегда.
4. Lyrics заменяется только после подтверждения пользователя.

### 4.5 Валидация

`validateProject` возвращает `ValidationWarning[]`. Экспорт не блокируется.

Обязательные типы предупреждений:

- незакрытые квадратные скобки;
- нет `[Chorus]` или `[Hook]`;
- нет `[Outro]` или `[End]`;
- нет секционной структуры;
- структурный тег в Style;
- жанровый тег в Lyrics;
- слишком длинный Style prompt;
- конфликт настроения;
- конфликт инструментов;
- много директив подряд;
- разные Chorus-директивы без `[Chorus Variation]`;
- неизвестный тег.

### 4.6 Экспорт

Экспортеры в `src/domain/exporters.ts` обязаны возвращать чистые строки или plain JSON:

- `exportStyle(project): string`
- `exportLyrics(project): string`
- `exportBoth(project): string`
- `exportMarkdown(project): string`
- `exportJson(project): SunoMarkupProject`
- `exportTxt(project): string`

Никакой HTML, CSS, CodeMirror state или hidden markup не попадает в экспорт.

## 5. Состояние и persistence

`SunoMarkupProject` содержит:

- `id`
- `title`
- `stylePrompt`
- `lyrics`
- `styleChips`
- `selectedPresetId`
- `tagsUsed`
- `warnings`
- `createdAt`
- `updatedAt`
- `version`

`ui` state содержит:

- search/filter state;
- raw style draft;
- favorites;
- recent;
- custom tags;
- dark mode flag.

Autosave выполняется каждые 3 секунды в `localStorage` под ключом:

```text
suno-markup-studio:v1
```

Undo/redo хранит последние изменения `stylePrompt`, `lyrics`, `styleChips`.

## 6. Визуальная система

Принятый концепт: плотный светлый редакторский интерфейс, не лендинг.

Правила:

- первый экран всегда рабочий редактор;
- не добавлять hero, marketing copy, декоративные blobs/orbs;
- панели с радиусом 6–8px;
- true white / light neutral background для light theme;
- teal/cyan для primary action;
- amber/red для validation;
- dark mode должен сохранять ту же информационную архитектуру;
- текст в контролах не должен переполнять контейнеры;
- не вкладывать cards внутри cards без функциональной причины.

## 7. Правила React и CodeMirror

- `App.tsx` пока содержит основной UI, но новые крупные блоки следует выносить в `src/components`.
- CodeMirror создается один раз на mount и уничтожается на unmount.
- В cleanup обязательно сбрасывать `viewRef.current = null`, иначе React StrictMode может оставить editor в мертвом состоянии.
- Не пересоздавать CodeMirror на каждый `project.lyrics` change.
- Внешние изменения Lyrics синхронизируются отдельным effect через `view.dispatch`.
- Любые метатеги остаются обычным текстом.

## 8. Правила DnD

- DnD listeners вешаются только на drag-handle.
- Click action тега не должен зависеть от drag events.
- Для e2e должны существовать стабильные selectors:
  - `data-testid="tag-library"`
  - `data-testid="style-dropzone"`
  - `data-testid="style-output"`
  - `data-testid="lyrics-dropzone"`
  - `data-testid="lyrics-editor"`
  - `data-testid="tag-<tagId>"`
- При добавлении нового drag/drop поведения сначала добавить e2e сценарий, потом менять UI.

## 9. Тестовая практика

### Unit

Запуск:

```bash
npm test
```

Покрывать:

- чистые функции из `src/domain`;
- сортировку style prompt;
- вставку lyrics-тегов;
- экспорт plain text;
- validation conflicts and structure warnings.

### E2E

Запуск:

```bash
npm run e2e
```

Критические e2e flows:

- app loads and first meaningful screen renders;
- lyrics editor accepts typing;
- quick insert adds `[Chorus: ...]`;
- click on style tag updates Style prompt;
- drag lyrics tag into Lyrics updates editor;
- drag style tag into Style updates prompt;
- export buttons copy/download expected text;
- desktop and mobile smoke layout.

Перед финальной сдачей frontend-изменений:

```bash
npm test
npm run build
npm run e2e
```

Если e2e не может запуститься из-за отсутствия браузеров Playwright:

```bash
npx playwright install chromium
```

## 10. Правила изменения доменной логики

- Не смешивать UI и доменную логику: validation/export/prompt assembly должны оставаться pure functions.
- Новые теги добавлять в `src/data/tags.ts` с category, placement, confidence, aliases, description, examples.
- Новые пресеты добавлять в `src/data/presets.ts`; число пресетов MVP не должно падать ниже 15.
- Новые warning rules добавлять в `validation.ts` и покрывать unit-тестом.
- Изменения export format требуют unit-теста.

## 11. Acceptance Checklist

Перед сдачей агент должен проверить:

- `npm test` проходит;
- `npm run build` проходит;
- e2e покрывает рабочий текстовый ввод и DnD;
- app запускается на Vite без framework overlay;
- console не содержит runtime errors;
- CodeMirror видим и принимает ввод;
- drag handle перетаскивает тег;
- Lyrics drop guide виден при наведении drag-тега над редактором;
- dropped lyrics tag вставляется не только в конец, а в выбранную line boundary;
- клик по тегу не ломает drag behavior;
- Style/Lyrics exports остаются plain text.
