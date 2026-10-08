# Preparation P1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сохранить условия генерации в проекте и добавить отдельный конструктор запроса на изменение фрагмента, не уменьшая редактор песни.

**Architecture:** Необязательные объекты shared DTO сохраняются в существующем `Project.projectJson`, без DDL. Zustand управляет данными проекта; новые React-компоненты отвечают за диалог и отдельный экран `#preparation`. Чистые функции собирают запрос и подписи секций; существующие API, локальное сохранение и экспорт сохраняют совместимость.

**Tech Stack:** React 19, TypeScript, Zustand, Zod 3, Fastify 5, Prisma 6/SQLite, Vitest, Playwright. Новых зависимостей нет.

**Spec:** `docs/superpowers/specs/2026-10-08-preparation-p1-design.md` (подтверждена пользователем 08.10.2026).

## Global Constraints

- P1 включает условия и конструктор запроса; рецепты, Sounds-шаблоны, кандидаты и доработка справочника относятся к следующему P2.
- Основное поле Lyrics не уменьшаем; постоянные панели редактора и пустые вкладки не добавляем.
- Модель 160 символов, заметки 20 000, фрагмент 2 000, изменение и сохраняемые свойства по 20 000, результат 80 000. Это ограничения приложения, не Suno.
- Режим: `custom | simple | studio | sounds`, необязательный; пустые условия не назначают старому проекту модель v6.
- `exportStyle`, `exportLyrics`, `exportExclude`, `exportBoth` не включают новые служебные сведения.
- Без новых таблиц, API Suno, перевода, аудиопроигрывателя и выдуманных управляющих тегов. Запросы являются редакционными шаблонами.
- Не меняем Caddy, Family Dashboard, WG, Amnezia, доступ к серверу и существующие ограничения безопасности.
- Генерация Prisma и тесты запускаются последовательно, не параллельно.
- Коммиты задач локальные; push только после полного цикла проверки, поскольку он запускает production deploy.

## Review Focus

1. Ответ облачного сохранения, пришедший после новой локальной правки запроса, не должен откатить эту правку (тест Task 3).
2. Повторяющиеся названия секций и обновление Lyrics не должны незаметно менять выбранный фрагмент (тесты Tasks 2 и 5).
3. Скопировать нужно ручную редакцию результата, а не повторно собранный шаблон; отказ clipboard не должен изображать успех (тест Task 5).
4. Явная очистка условий и PATCH старым клиентом различаются; ни удалённые заметки, ни потеря данных недопустимы (тесты Tasks 1 и 7).
5. Back/forward и переход в аккаунт из вспомогательного экрана не должны оставлять интерфейс и hash в противоречии (тесты Tasks 4 и 5).

---

## File Structure

- Modify `packages/shared/src/index.ts`, `index.test.ts`: схемы, типы, пределы новых объектов.
- Modify `apps/api/src/server.ts`, `projectMapper.ts`, `projectMapper.test.ts`; create `projects.test.ts`: новые поля POST/GET/PATCH, сохранение и защита.
- Create `apps/web/src/domain/sectionEditRequest.ts`, `sectionEditRequest.test.ts`: форматирование текста и варианты секций.
- Modify `apps/web/src/stores/projectStore.ts`, `projectStore.test.ts`, `domain/types.ts`: действия, проверка persistence и публичные типы.
- Create `apps/web/src/components/GenerationContextDialog.tsx`, `PreparationPage.tsx`: независимые новые UI-блоки.
- Modify `apps/web/src/components/AppModal.tsx`: необязательный `closeOnBackdrop`, по умолчанию `true`.
- Create `apps/web/src/lib/auxiliaryNavigation.ts`, `auxiliaryNavigation.test.ts`; modify `App.tsx`: адреса и подключение нового экрана/диалога.
- Modify `apps/web/src/domain/exporters.ts`; create `exporters.test.ts`: служебные разделы только полного экспорта.
- Create `apps/web/e2e/preparation.spec.ts`; existing `editor.spec.ts` остаётся регрессионным набором.
- Modify `apps/web/src/styles.css`, `apps_structure.md`, `README.md`: локальные стили, описание новой логики и выпуска.

### Task 1: Shared DTO и совместимое сохранение на API

**Interfaces:** экспортировать `sunoContextSchema`, `sectionEditRequestSchema`, типы `SunoContext`, `SectionEditRequest`; добавить `sunoContext?: SunoContext`, `sectionEditRequest?: SectionEditRequest` в `SunoMarkupProject`. Все четыре строковых поля запроса обязательны внутри переданного объекта; пустые строки разрешены. Поля контекста необязательны.

- [ ] **Write failing tests:** `accepts legacy project without preparation fields`; `accepts empty context and complete empty request`; `rejects invalid mode and preparation limit overflow`. Проверить включительно допустимый предел и предел + 1 для каждого поля.
- [ ] **Verify RED:** `npm run test -w @suno/shared -- src/index.test.ts`; новые проверки не проходят из-за отсутствующих схем/полей.
- [ ] **Implement contracts:** добавить пределы в `projectLimits`, Zod-схемы и реэкспорт типов через `apps/web/src/domain/types.ts`. `createProjectRequestSchema` и `updateProjectRequestSchema` наследуют поля общей схемы; `.partial()` применяется только к верхнему уровню.
- [ ] **Write failing mapper/route tests:** в `projectMapper.test.ts` проверить read/persist обоих объектов и чтение старого JSON. В `projects.test.ts` использовать существующий паттерн `buildServer().inject()` с mock Prisma/auth: POST отдаёт оба объекта; PATCH `{title:'Renamed'}` сохраняет их; PATCH `{sunoContext:{}}` удаляет прежние заметки; чужой ID возвращает 404 без update; неверный объект возвращает 400 без записи.
- [ ] **Verify RED:** `npm run build -w @suno/shared`, затем `npm run test -w @suno/api -- src/projectMapper.test.ts src/projects.test.ts`.
- [ ] **Implement API:** POST явно передаёт оба объекта; `toProjectDto()` читает и валидирует optional JSON-поля через shared schemas. Старое/невалидное optional поле не делает основной проект нечитаемым. PATCH оставляет существующий top-level merge, не добавляет deep merge; `toProjectPersistence()` сохраняет полный DTO как прежде.
- [ ] **Verify GREEN:** повторить shared/API тесты; добавить случай некорректного optional поля в старой записи и проверить безопасное чтение остальных полей.
- [ ] **Commit:** `feat: persist generation context and section request data`.

### Task 2: Чистая сборка запроса и выбор секции

**Interfaces:** в `domain/sectionEditRequest.ts` экспортировать `buildSectionEditRequest(input: Pick<SectionEditRequest, 'fragment' | 'change' | 'preserve'>): string`, `getSectionRequestOptions(lyrics: string): Array<{value: string; label: string}>`, `shouldConfirmRequestReplace(currentResult: string, nextResult: string): boolean`.

- [ ] **Write failing tests:** пустое/пробельное `change` даёт пустую строку; заполненные поля дают точный пример из §4 spec; отсутствие fragment меняет вводную строку на `В исходной песне внесите следующие изменения.`; отсутствие preserve не создаёт пустой раздел; trim краёв сохраняет внутренние переносы и смешанный язык.
- [ ] **Write section tests:** два `[Chorus]` дают разные понятные подписи/values `[Chorus] (1)` и `[Chorus] (2)`; `[Verse 2]` не теряет номер; строки `[Chorus effect]` и обычный текст не создают ложные секции. Использовать существующее знание каталога о структурных тегах, не расширять regex `extractOutline` вслепую и не менять его старых потребителей.
- [ ] **Verify RED:** `npm run test -w @suno/web -- src/domain/sectionEditRequest.test.ts`.
- [ ] **Implement pure helpers:** никаких данных аккаунта, Style, Lyrics или условий генерации в выходном запросе. Непустой результат, отличающийся от нового, требует подтверждения замены; одинаковый результат и пустой результат не требуют.
- [ ] **Verify GREEN:** повторить команду; проверить дословную сохранность значений и отсутствие пустых разделов.
- [ ] **Commit:** `feat: build plain text section edit requests`.

### Task 3: Состояние проекта и локальное сохранение

**Interfaces:** добавить store actions `setSunoContext(context: SunoContext): void`, `setSectionEditRequest(request: SectionEditRequest): void`. Переданный объект заменяет прежний целиком. Контекст нормализует пробельные края, пустые строки убирает; `{}` сохраняется как явная очистка. Черновик запроса сохраняет пользовательский ввод без trim, trim выполняется только сборщиком.

- [ ] **Write failing tests:** изменения новых объектов сохраняют ID/Lyrics/Style/Exclude/chips; повышают version и устанавливают local; duplicate наследует, newProject очищает; import/reload сохраняет; неправильный режим/превышение предела не заменяет существующий проект.
- [ ] **Write persistence tests:** через существующие `persist()`/`hydrate()` проверить optional поля и старый localStorage. Некорректные optional поля в локальном старом черновике отбрасываются без потери его Lyrics; строгий JSON import ошибочного объекта отклоняется. Undo/redo Lyrics не удаляет новые сведения.
- [ ] **Write delayed sync test:** отложить ответ `api.updateProject`, изменить `sectionEditRequest.result` во время ожидания, завершить save старым объектом; актуальный result остаётся локальным и не помечается ошибочно синхронизированным. При смене ID ответ не должен заменить другой проект.
- [ ] **Verify RED:** `npm run test -w @suno/web -- src/stores/projectStore.test.ts`.
- [ ] **Implement:** расширить `UIState.activeView` значением `preparation`; новые actions используют штатный `touch`, не меняют past/future. Проверку новых optional полей в локальном восстановлении и import делегировать shared schemas, не переписывать проверку всех legacy полей. Сохранить штатные autosave/auth; исправить stale save только если добавленные тесты выявят пробел.
- [ ] **Verify GREEN:** store tests, включая прежние auth/cloud/undo сценарии.
- [ ] **Commit:** `feat: retain preparation drafts per project`.

### Task 4: Условия генерации и навигация

**Interfaces:** `GenerationContextDialog({onClose}: {onClose: () => void})` использует store текущего проекта. `AppModal` получает `closeOnBackdrop?: boolean` с default `true`. `resolveAuxiliaryView(hash: string): 'editor' | 'reference' | 'preparation'`; `navigateAuxiliaryView(view: 'editor' | 'reference' | 'preparation'): void` сохраняет pathname/search и синхронизирует history-событие с view.

- [ ] **Write failing navigation unit tests:** `#preparation` распознаётся точно, `#preparation-other` нет, reference/tag адреса работают, возврат сохраняет `/suno/` и search. Back/forward учитывает `popstate` вместе с `hashchange`.
- [ ] **Write failing E2E:** через меню «Проект» открыть диалог, заполнить модель/режим/заметки, «Сохранить», reload, открыть снова и проверить. «Отменить» и Escape не сохраняют; backdrop не закрывает. Проверить фокус и Tab.
- [ ] **Verify RED:** navigation unit, затем `npm run e2e -- apps/web/e2e/preparation.spec.ts --grep 'context|navigation'`.
- [ ] **Implement dialog:** локальные поля, модель с datalist `v6/v6-wild/v6-mini`, русские подписи, необязательный режим и notes, `closeOnBackdrop={false}`, стабильный onClose. При смене проекта закрыть старый диалог, чтобы сохранение старой формы не записалось в новый ID.
- [ ] **Implement dialog wiring and navigation helpers:** пункт «Условия генерации» в project menu; проверить чистые helpers адресации, но подключать новый экран и пункт «Шаблоны и запросы» только в Task 5, когда экран готов. Подключить штатный возврат фокуса к кнопке «Проект», если menuitem уже размонтирован.
- [ ] **Verify GREEN:** диалог/nav tests и существующие modal/menu tests; проверить после смены проекта, что отменённые значения не протекают.
- [ ] **Commit:** `feat: add compact generation context dialog`.

### Task 5: Полноценный экран конструктора

**Interfaces:** `PreparationPage({onEditContext}: {onEditContext: () => void})`; использует Task 2 helpers и Task 3 actions. Test IDs: `preparation-page`, `generation-context-dialog`, `section-request-result`, `copy-section-request`.

- [ ] **Write failing E2E:** guest открывает экран через меню; выбирает второй Chorus, вводит change/preserve, формирует запрос и копирует. Перехват clipboard по паттерну `editor.spec.ts` фиксирует фактически скопированную строку; не нужны права реального буфера ОС.
- [ ] **Add editing/error assertions:** ручной result копируется без пересборки; замена требует confirm, отмена сохраняет; пустой change блокирует сборку, пустой result блокирует copy; ошибка clipboard показывает понятное сообщение, не «скопировано», и сохраняет result. Изменение Lyrics обновляет варианты секций, но не переписывает выбранный текст фрагмента.
- [ ] **Add navigation assertions:** прямой `#preparation`, reload и preparation → account → editor с back/forward не оставляют старый hash, открывающий неверный экран; ссылки справочника продолжают работать.
- [ ] **Verify RED:** `npm run e2e -- apps/web/e2e/preparation.spec.ts --grep 'request|fragment|clipboard'`.
- [ ] **Implement page:** именованные поля, выбор outline как вспомогательная подстановка, compact context summary, явные build/copy/back actions; без скрытого включения текста песни. Подтверждение замены через уже применяемый в приложении `window.confirm`; button labels и ошибки на русском. Clipboard Promise отслеживает текущий result/ID, чтобы поздний success не относился к другому тексту или проекту.
- [ ] **Connect navigation:** lazy import PreparationPage в App, пункт «Шаблоны и запросы» в project menu, helpers Task 4 и обработчики `hashchange`/`popstate`. Существующий account flow не переводим на новый URL route; перед открытием account очищаем auxiliary hash.
- [ ] **Add scoped CSS:** форма/результат рядом на desktop, последовательно на mobile; строки grid имеют `minmax(0, 1fr)`, textarea не распирают layout, dialog помещается и прокручивается. Не менять размеры `.app-grid`/Lyrics или глобальные кнопки.
- [ ] **Verify GREEN:** весь `preparation.spec.ts` в обоих Playwright проектах, включая проверку отсутствия горизонтального скролла, светлой/тёмной темы и возврата без потери редактора. Сделать desktop/mobile скриншоты и визуально просмотреть.
- [ ] **Commit:** `feat: add standalone section request preparation screen`.

### Task 6: Полный экспорт и документация

**Interfaces:** существующие сигнатуры exporters не меняются; служебные блоки формируются внутренними helper-функциями. JSON отдаёт объекты, MD/TXT/DOCX добавляют разделы только при наличии непустых данных; `sectionEditRequest.result` переносится без пересборки.

- [ ] **Write failing tests in exporters.test.ts:** JSON сохраняет оба объекта; чистые field/both exports не содержат sentinel из notes/result; MD/TXT содержат разделы и ручную правку результата; пустой draft не создаёт заголовок запроса; старый проект даёт прежний результат. DOCX bytes содержат экранированный XML для `<`, `&`, кавычек; данные исходного проекта не мутируются.
- [ ] **Verify RED:** `npm run test -w @suno/web -- src/domain/exporters.test.ts`.
- [ ] **Implement exports:** расширить только полные форматы; сохранив прежние кодировки и существующую упаковку DOCX. Контекст выводится в понятном виде, режим имеет отображаемое название, служебные поля draft в текстовые файлы не добавляются.
- [ ] **Verify GREEN:** exporters tests и прежние domain tests. В E2E скачать JSON нового проекта, импортировать его и проверить восстановление формы/результата.
- [ ] **Update docs:** `apps_structure.md` описывает компоненты, types, actions, storage, навигацию, экспорт, отсутствие Suno API; `README.md` содержит пользовательский сценарий и ограничения. Спецификацию пометить реализованной только после проверки выпуска.
- [ ] **Commit:** `feat: export project preparation context and requests`.

### Task 7: Реальный SQLite round-trip и регрессия

**Files:** дополнить `apps/api/src/projects.test.ts` или создать `apps/api/src/projectPersistence.test.ts`, если mocks и реальная БД требуют разных изолированных модулей; дополнить `apps/web/e2e/preparation.spec.ts`.

- [ ] **Write failing integration test:** создать временный каталог ОС, отдельный SQLite URL и выполнить существующие SQLite migrations через локальный Prisma CLI, не production URL. В отдельном тестовом модуле подставить этот PrismaClient в `buildServer`, auth фиксирует тестового владельца. Создать реального user; POST → GET → PATCH title → GET сохраняет оба объекта; очистка notes сохраняется после повторного чтения. После тестов закрыть сервер/Prisma и удалить временный каталог.
- [ ] **Verify integration:** `npm run test -w @suno/api -- src/projectPersistence.test.ts`; при сохранении интеграции в projects.test.ts использовать этот путь. Все операции происходят только в временной БД, строка подключения VPS не читается/не используется. SQLite-generated client подготавливает штатный selfhost build, не меняем schema provider во время теста.
- [ ] **Add account E2E using route mocks:** login, save project с context/request, открыть другой, открыть сохранённый и reload; поля восстановлены, ID/тексты не изменены. Account registration/auth реальные сервисы в локальном browser QA не используются.
- [ ] **Run sequential full verification:** `npm run selfhost:build`, затем `npm test`, затем `npm run e2e`; отсутствие браузеров исправляется `npx playwright install chromium webkit`. Любое падение расследовать; не заменять тесты молчаливым skip.
- [ ] **Review branch diff:** непредусмотренные зависимости/env/lockfiles отсутствуют; не сломаны разрешения/лимиты; нет приватных данных, черновиков пользователя или generated runtime в commit. Проверить каждый пункт Review Focus и соответствующие тесты.
- [ ] **Fresh independent review:** проверить весь diff относительно начала P1; исправления повторно прогнать по затронутым тестам и финальному набору. Не считать план или self-review заменой проверки рабочего приложения.
- [ ] **Commit remaining tests/fixes:** `test: verify preparation persistence and editor regressions`.

### Task 8: Выпуск на действующий VPS

- [ ] **Preflight:** убедиться в чистом дереве и наличии всех локальных коммитов; отметить исходный рабочий SHA для отката. Написать пользователю, что push запускает серверное обновление Suno.
- [ ] **Push:** `git push origin codex/sqlite-selfhost`. Не запускать параллельный ручной SSH-деплой.
- [ ] **Wait CI:** через `gh run list --workflow suno-selfhost.yml --branch codex/sqlite-selfhost` найти run для конкретного HEAD; `gh run watch <id> --exit-status`. При ошибке изучить `gh run view <id> --log-failed`, не объявлять выпуск состоявшимся.
- [ ] **Verify production:** GET `https://147.45.136.245/suno/api/health`; браузерный guest smoke нового экрана и диалога, сохранение/reload локального контекста, copy результата, возврат в редактор. Не создавать аккаунт и не менять существующие личные проекты без отдельного разрешения. Cloud round-trip подтверждён тестовой БД и локальными E2E; реальный production-auth отметить непроверенным, если не использован согласованный тестовый аккаунт.
- [ ] **Confirm release:** Action относится к отправленному SHA, deploy job успешен, лог подтверждает активный релиз и штатный backup. Прочие службы не трогаем. При неуспехе используем предусмотренный безопасный rollback, без административных импровизаций.
- [ ] **Report:** SHA/commit/push, URL и результаты unit/build/E2E/live smoke; честно перечислить непроверенные production-сценарии. P2 не объявлять выполненным.

## Execution Handoff

Рекомендуемый способ: **Native** — реализация последовательно в текущей сессии, затем отдельный независимый review всего diff. Задачи тесно связаны общим DTO и store; такой порядок уменьшает риск рассогласования интерфейсов. План ожидает проверки пользователем; продуктовый код до подтверждения не меняется.
