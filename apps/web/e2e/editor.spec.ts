import { expect, test } from '@playwright/test';

test('lyrics editor accepts typing and quick section insertion', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Suno Markup Studio')).toBeVisible();

  const editor = page.getByTestId('lyrics-editor').locator('.cm-content');
  await editor.click();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.keyboard.type('[Verse]\nНовая строка для e2e');
  await expect(editor).toContainText('Новая строка для e2e');

  await page.getByRole('button', { name: '+ [Chorus]' }).click();
  await expect(editor).toContainText('[Chorus: full production, catchy hook]');
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
  await expect(editor).toContainText('[Chorus]');

  await page.getByPlaceholder('Поиск по тегам, alias, описанию').fill('118 BPM');
  const bpmHandle = page.getByLabel('Перетащить 118 BPM');
  await bpmHandle.dragTo(page.getByTestId('style-dropzone'));
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

  const text = await editor.innerText();
  expect(text).toContain('[Verse]\n[Bridge]\nПервая строка\nВторая строка');
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

  const text = await editor.innerText();
  expect(text).toContain('[Verse]\n[Verse]\nЯ ловлю твой голос в проводах.');
  expect(text).not.toContain('Я ловлю [Verse]твой голос');
});
