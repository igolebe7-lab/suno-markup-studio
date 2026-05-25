import { expect, test } from '@playwright/test';

test('lyrics editor accepts typing and quick section insertion', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Suno Markup Studio')).toBeVisible();
  await expect(page.locator('.header-actions').getByRole('button', { name: /Аккаунт/ })).toBeVisible();
  await page.locator('.header-actions').getByRole('button', { name: /Аккаунт/ }).click();
  await expect(page.getByRole('menuitem', { name: 'Войти' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Регистрация' })).toBeVisible();

  const editor = page.getByTestId('lyrics-editor').locator('.cm-content');
  await editor.click();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.keyboard.type('[Verse]\nНовая строка для e2e');
  await expect(editor).toContainText('Новая строка для e2e');

  await page.getByRole('button', { name: '+ [Chorus]' }).click();
  await expect(editor).toContainText('[Chorus: full production, catchy hook]');
});

test('header menus create a new project and open export drawer', async ({ page }) => {
  await page.goto('/');
  const accountButton = page.locator('.header-actions').getByRole('button', { name: /Аккаунт/ });
  const box = await accountButton.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);

  await page.getByLabel('Название проекта').fill('Старый проект');
  page.once('dialog', async (dialog) => dialog.accept());
  await page.getByRole('button', { name: /Проект/ }).click();
  await page.getByRole('menuitem', { name: 'Новый проект' }).click();
  await expect(page.getByLabel('Название проекта')).toHaveValue('Новый Suno проект');

  await page.getByRole('button', { name: 'Экспорт' }).click();
  const drawer = page.getByTestId('export-drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText('Outline', { exact: true })).toBeVisible();
  await expect(drawer.getByText('Validation', { exact: true })).toBeVisible();
  await expect(drawer.getByRole('button', { name: /Копировать Style/ })).toBeVisible();
});

test('project menu renames the current project without creating a new draft', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Проект/ }).click();
  await page.getByRole('menuitem', { name: 'Переименовать...' }).click();
  const modal = page.getByTestId('project-name-modal');
  await expect(modal).toBeVisible();
  await modal.getByLabel('Название проекта').fill('Переименованный проект');
  await page.getByRole('button', { name: 'Сохранить название' }).click();

  await expect(page.getByLabel('Название проекта')).toHaveValue('Переименованный проект');
});

test('registration opens account page and lists the saved project', async ({ page }) => {
  const user = { id: 'user-e2e', email: 'e2e@example.com' };
  let savedProject: Record<string, unknown> | null = null;

  await page.route('**/api/auth/register', async (route) => {
    await route.fulfill({ json: { user } });
  });
  await page.route('**/api/projects**', async (route) => {
    const request = route.request();
    if (request.method() === 'PATCH') {
      await route.fulfill({ status: 404, json: { message: 'Проект не найден' } });
      return;
    }
    if (request.method() === 'POST') {
      savedProject = await request.postDataJSON();
      await route.fulfill({ json: { project: savedProject } });
      return;
    }
    if (request.method() === 'GET') {
      await route.fulfill({
        json: {
          projects: savedProject
            ? [{
                id: savedProject.id,
                title: savedProject.title,
                createdAt: savedProject.createdAt,
                updatedAt: savedProject.updatedAt
              }]
            : []
        }
      });
      return;
    }
    await route.fulfill({ json: { ok: true } });
  });
  await page.route('**/api/custom-tags**', async (route) => {
    await route.fulfill({ json: { tags: [] } });
  });

  await page.goto('/');
  await page.locator('.header-actions').getByRole('button', { name: /Аккаунт/ }).click();
  await page.getByRole('menuitem', { name: 'Регистрация' }).click();
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Пароль').fill('password123');
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();

  const accountPage = page.getByTestId('account-page');
  await expect(accountPage).toBeVisible();
  await expect(page.getByText(user.email)).toBeVisible();
  await expect(accountPage.getByText('Сохранено')).toBeVisible();
  await expect(page.getByTestId('account-project-list')).toContainText('Новый Suno проект');
  await expect(page.getByText('Ошибка сохранения')).toHaveCount(0);
});

test('login opens account page when cloud projects return unauthorized', async ({ page }) => {
  const user = { id: 'user-existing', email: 'existing@example.com' };

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({ json: { user } });
  });
  await page.route('**/api/projects**', async (route) => {
    await route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
  });
  await page.route('**/api/custom-tags**', async (route) => {
    await route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
  });

  await page.goto('/');
  await page.locator('.header-actions').getByRole('button', { name: /Аккаунт/ }).click();
  await page.getByRole('menuitem', { name: 'Войти' }).click();
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Пароль').fill('password123');
  await page.getByLabel('Вход в аккаунт').getByRole('button', { name: 'Войти' }).click();

  const accountPage = page.getByTestId('account-page');
  await expect(accountPage).toBeVisible();
  await expect(page.getByText(user.email)).toBeVisible();
  await expect(accountPage.getByText('Ошибка сохранения')).toBeVisible();
  await expect(accountPage.getByText('Unauthorized')).toHaveCount(0);
});

test('custom tag builder creates an account tag and shows it in account', async ({ page }) => {
  const user = { id: 'user-custom', email: 'custom@example.com' };
  const savedTags: Record<string, unknown>[] = [];

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({ json: { user } });
  });
  await page.route('**/api/projects**', async (route) => {
    await route.fulfill({ json: { projects: [] } });
  });
  await page.route('**/api/custom-tags**', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      const body = await request.postDataJSON();
      const tag = {
        id: 'custom-drop',
        category: 'custom',
        confidence: 'experimental',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...body
      };
      savedTags.unshift(tag);
      await route.fulfill({ json: { tag } });
      return;
    }
    await route.fulfill({ json: { tags: savedTags } });
  });

  await page.goto('/');
  await expect(page.locator('.category-rail')).toHaveCount(0);
  await page.locator('.header-actions').getByRole('button', { name: /Аккаунт/ }).click();
  await page.getByRole('menuitem', { name: 'Войти' }).click();
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Пароль').fill('password123');
  await page.getByLabel('Вход в аккаунт').getByRole('button', { name: 'Войти' }).click();
  await page.getByRole('button', { name: 'Вернуться в редактор' }).click();

  await page.getByRole('button', { name: /Создать тег/ }).click();
  const builder = page.getByTestId('custom-tag-builder');
  await expect(builder).toBeVisible();
  await builder.getByLabel('Тег').fill('Drop');
  await builder.getByLabel('Название в библиотеке').fill('Drop Marker');
  await builder.getByLabel('Описание на русском').fill('Пользовательский тег для дропа.');
  await builder.getByText('Энергия секции').click();
  await builder.getByRole('button', { name: 'Сохранить тег' }).click();

  await page.getByRole('button', { name: 'Свои теги' }).click();
  await expect(page.getByTestId('tag-custom-drop')).toContainText('Drop Marker');

  await page.locator('.header-actions').getByRole('button', { name: /Аккаунт/ }).click();
  await page.getByRole('menuitem', { name: 'Аккаунт' }).click();
  await expect(page.getByTestId('account-custom-tags-list')).toContainText('Drop Marker');
});

test('click and drag add tags to the correct work areas', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'HTML5 drag-and-drop is validated in Chromium; WebKit keeps the mobile smoke coverage.');
  await page.goto('/');

  const editor = page.getByTestId('lyrics-editor').locator('.cm-content');
  await editor.click();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.keyboard.type('[Verse]\nAlpha line');

  await page.getByTestId('tag-genre-pop').getByRole('button', { name: 'Настроить pop' }).click();
  await expect(page.getByTestId('tag-settings-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Добавить в Style' }).click();
  await expect(page.getByTestId('style-output')).toContainText('pop');

  const firstLineBox = await editor.locator('.cm-line').nth(0).boundingBox();
  expect(firstLineBox).not.toBeNull();
  await page.evaluate(([x, y]) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('application/suno-tag-id', 'chorus');
    document.querySelector('[data-testid="lyrics-dropzone"]')?.dispatchEvent(
      new DragEvent('dragover', { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer })
    );
    document.querySelector('[data-testid="lyrics-dropzone"]')?.dispatchEvent(
      new DragEvent('drop', { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer })
    );
  }, [firstLineBox!.x + 130, firstLineBox!.y + firstLineBox!.height - 2]);
  await expect(page.getByTestId('tag-settings-panel')).toBeVisible();
  await page.getByTestId('tag-settings-panel').getByRole('button', { name: 'Сохранить' }).click();
  await expect(editor).toContainText('[Chorus]');

  await page.getByPlaceholder('Поиск по тегам, alias, описанию').fill('118 BPM');
  const bpmHandle = page.getByLabel('Перетащить 118 BPM');
  await bpmHandle.dragTo(page.getByTestId('style-dropzone'));
  await expect(page.getByTestId('tag-settings-panel')).toBeVisible();
  await page.getByTestId('tag-settings-panel').getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.getByTestId('style-output')).toContainText('118 BPM');
});

test('tag settings build configured lyric tags', async ({ page }) => {
  await page.goto('/');

  const editor = page.getByTestId('lyrics-editor').locator('.cm-content');
  await editor.click();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.keyboard.type('[Intro]\nТестовая строка');

  await page.getByTestId('tag-verse').getByRole('button', { name: 'Настроить [Verse]' }).click();
  await expect(page.getByTestId('tag-settings-panel')).toBeVisible();
  await page.getByLabel('Номер секции').selectOption('1');
  await page.getByLabel('Энергия секции').selectOption('low energy');
  await page.getByLabel('Свои модификаторы через запятую').fill('close mic');
  await expect(page.getByTestId('tag-preview')).toContainText('[Verse 1: low energy, close mic]');
  await page.getByRole('button', { name: 'Вставить в Lyrics' }).click();
  await expect(editor).toContainText('[Verse 1: low energy, close mic]');
});

test('instrument tag settings do not show vocal controls and include description', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tag-instrumental').getByRole('button', { name: 'Настроить [Instrumental]' }).click();

  const panel = page.getByTestId('tag-settings-panel');
  await expect(panel).toBeVisible();
  await expect(page.getByText('Инструментальная роль')).toBeVisible();
  await expect(panel.getByText('Секция без вокала', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Роль')).toBeVisible();
  await expect(page.getByLabel('Диапазон / роль')).toHaveCount(0);
});

test('dragging a lyrics tag inserts it at the hovered line boundary', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'HTML5 drag-and-drop is validated in Chromium; WebKit keeps the mobile smoke coverage.');
  await page.goto('/');

  const editorShell = page.getByTestId('lyrics-editor');
  const editor = editorShell.locator('.cm-content');
  await editor.click();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.keyboard.type('[Verse]\nПервая строка\nВторая строка');

  const lines = editor.locator('.cm-line');
  await expect(lines).toHaveCount(3);
  const firstLineBox = await lines.nth(0).boundingBox();
  expect(firstLineBox).not.toBeNull();

  const dropPoint = [firstLineBox!.x + 130, firstLineBox!.y + firstLineBox!.height - 2] as const;
  await page.evaluate(([x, y]) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('application/suno-tag-id', 'bridge');
    document.querySelector('[data-testid="lyrics-dropzone"]')?.dispatchEvent(
      new DragEvent('dragover', { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer })
    );
  }, dropPoint);
  await expect(page.getByTestId('lyrics-drop-guide')).toBeVisible();

  await page.evaluate(([x, y]) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('application/suno-tag-id', 'bridge');
    document.querySelector('[data-testid="lyrics-dropzone"]')?.dispatchEvent(
      new DragEvent('drop', { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer })
    );
  }, dropPoint);
  await expect(page.getByTestId('tag-settings-panel')).toBeVisible();
  await page.getByTestId('tag-settings-panel').getByRole('button', { name: 'Сохранить' }).click();

  const text = await editor.innerText();
  expect(text).toContain('[Verse]\n[Bridge]\nПервая строка\nВторая строка');
});

test('canceling a dropped lyrics tag does not insert it', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'HTML5 drag-and-drop is validated in Chromium; WebKit keeps the mobile smoke coverage.');
  await page.goto('/');

  const editor = page.getByTestId('lyrics-editor').locator('.cm-content');
  await editor.click();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.keyboard.type('[Verse]\nСтрока без bridge');

  const firstLineBox = await editor.locator('.cm-line').nth(0).boundingBox();
  expect(firstLineBox).not.toBeNull();
  await page.evaluate(([x, y]) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('application/suno-tag-id', 'bridge');
    document.querySelector('[data-testid="lyrics-dropzone"]')?.dispatchEvent(
      new DragEvent('drop', { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer })
    );
  }, [firstLineBox!.x + 130, firstLineBox!.y + firstLineBox!.height - 2]);

  await expect(page.getByTestId('tag-settings-panel')).toBeVisible();
  await page.getByTestId('tag-settings-panel').getByRole('button', { name: 'Отмена' }).click();
  await expect(editor).not.toContainText('[Bridge]');
});

test('drag drop does not duplicate tag inside a lyric line', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'HTML5 drag-and-drop is validated in Chromium; WebKit keeps the mobile smoke coverage.');
  await page.goto('/');

  const editorShell = page.getByTestId('lyrics-editor');
  const editor = editorShell.locator('.cm-content');
  await editor.click();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.keyboard.type('[Verse]\nЯ ловлю твой голос в проводах.');

  const secondLine = editor.locator('.cm-line').nth(1);
  const secondLineBox = await secondLine.boundingBox();
  expect(secondLineBox).not.toBeNull();
  const dropPoint = [secondLineBox!.x + 84, secondLineBox!.y + 2] as const;

  await page.evaluate(([x, y]) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('application/suno-tag-id', 'verse');
    dataTransfer.setData('text/plain', '[Verse]');
    document.querySelector('[data-testid="lyrics-dropzone"]')?.dispatchEvent(
      new DragEvent('dragover', { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer })
    );
    document.querySelector('[data-testid="lyrics-dropzone"]')?.dispatchEvent(
      new DragEvent('drop', { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer })
    );
  }, dropPoint);
  await expect(page.getByTestId('tag-settings-panel')).toBeVisible();
  await page.getByTestId('tag-settings-panel').getByRole('button', { name: 'Сохранить' }).click();

  const text = await editor.innerText();
  expect(text).toContain('[Verse]\n[Verse]\nЯ ловлю твой голос в проводах.');
  expect(text).not.toContain('Я ловлю [Verse]твой голос');
});
