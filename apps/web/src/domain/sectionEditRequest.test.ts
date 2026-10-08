import { describe, expect, it } from 'vitest';
import { buildSectionEditRequest, getSectionRequestOptions, shouldConfirmRequestReplace } from './sectionEditRequest';

describe('section edit request', () => {
  it('does not build a request without a change', () => {
    expect(buildSectionEditRequest({ fragment: 'chorus', change: ' \n ', preserve: 'tempo' })).toBe('');
  });
  it('builds explicit instructions without translating or adding requirements', () => {
    expect(buildSectionEditRequest({ fragment: ' последний припев ', change: ' Добавить тихий ответ хора после фраз основного вокала. ', preserve: ' Текст, темп и основную мелодию. ' })).toBe('В исходной песне измените указанный фрагмент.\nФрагмент: последний припев\n\nЧто изменить:\nДобавить тихий ответ хора после фраз основного вокала.\n\nЧто сохранить:\nТекст, темп и основную мелодию.');
    expect(buildSectionEditRequest({ fragment: '', change: ' Soft choir\nтихий ответ ', preserve: '' })).toBe('В исходной песне внесите следующие изменения.\n\nЧто изменить:\nSoft choir\nтихий ответ');
  });
  it('requires confirmation only for a different nonempty result', () => {
    expect(shouldConfirmRequestReplace('manual', 'generated')).toBe(true);
    expect(shouldConfirmRequestReplace('', 'generated')).toBe(false);
    expect(shouldConfirmRequestReplace('generated', 'generated')).toBe(false);
  });
  it('distinguishes repeated sections without confusing effects or sung text', () => {
    const options = getSectionRequestOptions('[Verse 2]\nchorus in a lyric\n[Chorus]\n[Chorus effect]\n[Chorus: full band]\n[End]');
    expect(options.map((option) => option.value)).toEqual(['[Verse 2]', '[Chorus] (1)', '[Chorus] (2)', '[End]']);
    expect(getSectionRequestOptions('ordinary words')).toEqual([]);
  });
});
