import { expect, test, type Page } from '@playwright/test';

async function openContext(page: Page) {
  await page.getByRole('button', { name: /Проект/, exact: false }).first().click();
  await page.getByRole('menuitem', { name: 'Условия генерации' }).click();
  return page.getByTestId('generation-context-dialog');
}

async function seedProject(page: Page) {
  await page.addInitScript(() => {
    if (localStorage.getItem('suno-markup-studio:v1')) return;
    localStorage.setItem('suno-markup-studio:v1', JSON.stringify({ project: {
      id: 'p-test', title: 'Тест подготовки', stylePrompt: 'soft pop', excludePrompt: 'heavy guitars',
      lyrics: '[Verse]\nСлова куплета\n[Chorus]\nПервый\n[Chorus]\nВторой\n[End]',
      styleChips: [], tagsUsed: [], warnings: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1
    }, ui: {} }));
  });
}

async function openPreparation(page: Page) {
  await page.getByRole('button', { name: /Проект/ }).first().click();
  await page.getByRole('menuitem', { name: 'Шаблоны и запросы' }).click();
  await expect(page.getByTestId('preparation-page')).toBeVisible();
}

test('context saves and restores after reload without committing cancelled input', async ({ page }) => {
  await page.goto('/');
  let dialog = await openContext(page);
  await dialog.getByLabel('Модель').fill('v6-wild');
  await dialog.getByLabel('Режим в Suno').selectOption('custom');
  await dialog.getByLabel('Заметки').fill('Первая версия с хором');
  await page.locator('.generation-context-backdrop').click({ position: { x: 2, y: 2 } });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('suno-markup-studio:v1') ?? '{}').project?.sunoContext?.modelId)).toBe('v6-wild');
  await page.reload();
  dialog = await openContext(page);
  await expect(dialog.getByLabel('Модель')).toHaveValue('v6-wild');
  await expect(dialog.getByLabel('Заметки')).toHaveValue('Первая версия с хором');
  await dialog.getByLabel('Модель').fill('cancelled');
  await dialog.getByRole('button', { name: 'Отменить' }).click();
  dialog = await openContext(page);
  await expect(dialog.getByLabel('Модель')).toHaveValue('v6-wild');
  await dialog.getByLabel('Модель').fill('escape');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Проект/ }).first()).toBeFocused();
});

test('request copies manual edits and confirms replacement without losing the editor', async ({ page }) => {
  await seedProject(page);
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { sessionStorage.setItem('request-copy', text); } } }));
  await page.goto('/');
  await openPreparation(page);
  await expect(page.getByRole('button', { name: 'Сформировать запрос' })).toBeDisabled();
  await page.getByLabel('Выбрать секцию из песни').selectOption('[Chorus] (2)');
  await expect(page.getByLabel('Фрагмент песни', { exact: true })).toHaveValue('[Chorus] (2)');
  await page.getByLabel('Что изменить', { exact: true }).fill('Добавить тихий хор');
  await page.getByLabel('Что сохранить', { exact: true }).fill('Темп и мелодию');
  await page.getByRole('button', { name: 'Сформировать запрос' }).click();
  const result = page.getByTestId('section-request-result');
  await expect(result).toContainText('Что сохранить:');
  await result.fill('Мой вручную изменённый запрос');
  await page.getByTestId('copy-section-request').click();
  await expect(page.getByRole('status')).toHaveText('Запрос скопирован');
  expect(await page.evaluate(() => sessionStorage.getItem('request-copy'))).toBe('Мой вручную изменённый запрос');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Сформировать запрос' }).click();
  await expect(result).toHaveValue('Мой вручную изменённый запрос');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('suno-markup-studio:v1') ?? '{}').project?.sectionEditRequest?.result)).toBe('Мой вручную изменённый запрос');
  await page.reload();
  await expect(result).toHaveValue('Мой вручную изменённый запрос');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Сформировать запрос' }).click();
  await expect(result).toHaveValue(/Добавить тихий хор/);
  await page.getByRole('button', { name: 'Вернуться в редактор' }).click();
  await expect(page.getByTestId('lyrics-editor')).toContainText('Слова куплета');
  await page.getByRole('button', { name: /Проект/ }).first().click();
  await page.getByRole('menuitem', { name: 'Шаблоны и запросы' }).click();
  await expect(result).toHaveValue(/Темп и мелодию/);
});

test('clipboard error retains the request and does not claim success', async ({ page }) => {
  await seedProject(page);
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('denied'); } } }));
  await page.goto('/#preparation');
  await page.getByTestId('section-request-result').fill('Важный запрос');
  await page.getByTestId('copy-section-request').click();
  await expect(page.getByRole('alert')).toContainText('Не удалось скопировать');
  await expect(page.getByRole('status')).not.toHaveText('Запрос скопирован');
  await expect(page.getByTestId('section-request-result')).toHaveValue('Важный запрос');
});

test('navigation handles direct links back forward and account without stale hash', async ({ page }) => {
  await seedProject(page);
  await page.goto('/#preparation');
  await expect(page.getByTestId('preparation-page')).toBeVisible();
  await page.getByRole('button', { name: 'Вернуться в редактор' }).click();
  await page.goBack();
  await expect(page.getByTestId('preparation-page')).toBeVisible();
  await page.goForward();
  await expect(page.getByTestId('lyrics-editor')).toBeVisible();
  await openPreparation(page);
  await page.getByRole('button', { name: 'Аккаунт', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Аккаунт', exact: true }).click();
  await expect(page).not.toHaveURL(/#preparation/);
  await expect(page.getByTestId('account-page')).toBeVisible();
  await page.getByRole('button', { name: 'Вернуться в редактор' }).click();
  await expect(page.getByTestId('lyrics-editor')).toBeVisible();
});

test('preparation fits light and dark layouts and updates section choices', async ({ page }, testInfo) => {
  await seedProject(page);
  await page.goto('/');
  await openPreparation(page);
  await page.getByLabel('Фрагмент песни', { exact: true }).fill('Последний припев');
  await page.getByRole('button', { name: 'Вернуться в редактор' }).click();
  await page.getByTestId('lyrics-editor').locator('.cm-content').fill('[Verse 2]\nОбновлённый текст\n[End]');
  await openPreparation(page);
  await expect(page.getByLabel('Выбрать секцию из песни').locator('option')).toContainText(['Выбрать секцию', '[Verse 2]', '[End]']);
  await expect(page.getByLabel('Фрагмент песни', { exact: true })).toHaveValue('Последний припев');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `/tmp/suno-preparation-${testInfo.project.name}-light.png` });
  await page.getByRole('button', { name: 'Аккаунт', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Тёмная тема' }).click();
  await page.getByRole('button', { name: 'Аккаунт', exact: true }).click();
  await expect(page.locator('html')).toHaveClass('dark');
  await page.screenshot({ path: `/tmp/suno-preparation-${testInfo.project.name}-dark.png` });
});

test('JSON export and import retain context and the edited request', async ({ page }) => {
  await seedProject(page);
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { sessionStorage.setItem('json-copy', text); } } }));
  await page.goto('/');
  const context = await openContext(page);
  await context.getByLabel('Модель').fill('my-model');
  await context.getByLabel('Заметки').fill('Сохранённые условия');
  await context.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await openPreparation(page);
  await page.getByTestId('section-request-result').fill('Сохранённый запрос');
  await page.getByRole('button', { name: 'Проверка и экспорт' }).click();
  await page.getByTestId('export-drawer').getByRole('button', { name: 'JSON проекта', exact: true }).click();
  const json = await page.evaluate(() => sessionStorage.getItem('json-copy'));
  expect(JSON.parse(json!).sunoContext.modelId).toBe('my-model');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Проект/ }).first().click();
  await page.getByLabel('Импорт JSON проекта', { exact: true }).setInputFiles({ name: 'project.json', mimeType: 'application/json', buffer: Buffer.from(json!) });
  await expect(page.getByTestId('lyrics-editor')).toBeVisible();
  await openPreparation(page);
  await expect(page.getByTestId('section-request-result')).toHaveValue('Сохранённый запрос');
  await expect(page.getByText('my-model · Режим не указан')).toBeVisible();
});

test('account save and reopen retain preparation across project changes and reload', async ({ page }) => {
  await seedProject(page);
  const user = { id: 'preparation-owner', email: 'preparation@example.com' };
  const saved = new Map<string, Record<string, unknown>>();
  await page.route('**/api/auth/login', (route) => route.fulfill({ json: { user } }));
  await page.route('**/api/auth/me', (route) => route.fulfill({ json: { user } }));
  await page.route('**/api/custom-tags**', (route) => route.fulfill({ json: { tags: [] } }));
  await page.route('**/api/projects**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const id = pathname.split('/').at(-1)!;
    if (request.method() === 'POST' || request.method() === 'PATCH') {
      if (request.method() === 'PATCH' && !saved.has(id)) {
        await route.fulfill({ status: 404, json: { message: 'Проект не найден' } });
        return;
      }
      const body = request.postDataJSON() as Record<string, unknown>;
      const project = { ...saved.get(id), ...body };
      saved.set(String(project.id), project);
      await route.fulfill({ json: { project } });
    } else if (pathname.endsWith('/api/projects')) {
      await route.fulfill({ json: { projects: [...saved.values()] } });
    } else {
      await route.fulfill({ json: { project: saved.get(id) } });
    }
  });
  await page.goto('/');
  const context = await openContext(page);
  await context.getByLabel('Модель').fill('saved-model');
  await context.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await openPreparation(page);
  await page.getByTestId('section-request-result').fill('Облачный запрос');
  await page.getByRole('button', { name: 'Аккаунт', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Войти', exact: true }).click();
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Пароль').fill('password123');
  await page.getByLabel('Вход в аккаунт').getByRole('button', { name: 'Войти', exact: true }).click();
  const account = page.getByTestId('account-page');
  await expect(account).toBeVisible();
  await account.getByRole('button', { name: 'Сохранить текущий проект' }).click();
  await expect(page.getByTestId('account-project-list')).toContainText('Тест подготовки');
  expect(saved.get('p-test')).toMatchObject({ id: 'p-test', sunoContext: { modelId: 'saved-model' }, sectionEditRequest: { result: 'Облачный запрос' } });
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: /Проект/ }).first().click();
  await page.getByRole('menuitem', { name: 'Новый проект', exact: true }).click();
  await openPreparation(page);
  await expect(page.getByTestId('section-request-result')).toHaveValue('');
  await page.getByRole('button', { name: /Проект/ }).first().click();
  await page.getByRole('menuitem', { name: /^Тест подготовки/ }).click();
  await expect(page.getByTestId('lyrics-editor')).toContainText('Слова куплета');
  await openPreparation(page);
  await expect(page.getByTestId('section-request-result')).toHaveValue('Облачный запрос');
  await expect(page.getByText('saved-model · Режим не указан')).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('suno-markup-studio:v1') ?? '{}').project?.id)).toBe('p-test');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('suno-markup-studio:v1') ?? '{}').project?.sectionEditRequest?.result)).toBe('Облачный запрос');
  await page.reload();
  await expect(page.getByTestId('section-request-result')).toHaveValue('Облачный запрос');
});
