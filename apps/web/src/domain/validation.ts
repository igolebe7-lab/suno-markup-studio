import { tags } from '../data/tags';
import type { SunoMarkupProject, Tag, ValidationWarning, WarningSeverity } from './types';

const conflictRules = [
  { a: 'calm', b: 'aggressive', severity: 'warning' as const },
  { a: 'a cappella', b: 'full band', severity: 'warning' as const },
  { a: 'acoustic only', b: 'heavy synths', severity: 'warning' as const },
  { a: 'no drums', b: '808 drums', severity: 'warning' as const },
  { a: 'instrumental', b: 'lead vocals', severity: 'info' as const }
];

function buildKnownBracketTags(extraTags: Tag[] = []): Set<string> {
  return new Set(
    [...tags, ...extraTags]
    .filter((tag) => tag.sunoText.startsWith('['))
    .flatMap((tag) => [tag.sunoText.replace(/^\[|\]$/g, '').toLowerCase(), ...tag.aliases.map((alias) => alias.replace(/^\[|\]$/g, '').toLowerCase())])
  );
}

function warning(
  id: string,
  severity: WarningSeverity,
  title: string,
  message: string,
  target: ValidationWarning['target'],
  line?: number
): ValidationWarning {
  return { id, severity, title, message, target, line };
}

export function validateProject(project: Pick<SunoMarkupProject, 'stylePrompt' | 'lyrics'>, extraTags: Tag[] = []): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const style = project.stylePrompt.toLowerCase();
  const lyrics = project.lyrics;
  const lyricsLower = lyrics.toLowerCase();
  const knownBracketTags = buildKnownBracketTags(extraTags);

  if ((lyrics.match(/\[/g) ?? []).length !== (lyrics.match(/\]/g) ?? []).length) {
    warnings.push(warning('brackets', 'error', 'Незакрытая скобка', 'Количество [ и ] в Lyrics не совпадает.', 'lyrics'));
  }

  if (!/\[[^\]]*(chorus|hook)[^\]]*\]/i.test(lyrics)) {
    warnings.push(warning('no-chorus', 'warning', 'Нет припева', 'Добавьте [Chorus] или [Hook], если нужен явный хук.', 'lyrics'));
  }

  if (!/\[[^\]]*(outro|end)[^\]]*\]/i.test(lyrics)) {
    warnings.push(warning('no-ending', 'warning', 'Нет финального закрытия', 'Добавьте [Outro] или [End].', 'lyrics'));
  }

  if (!/\[[^\]]+\]/.test(lyrics)) {
    warnings.push(warning('no-structure', 'warning', 'Нет секционной структуры', 'Lyrics не содержит метатегов в квадратных скобках.', 'lyrics'));
  }

  const styleBracket = project.stylePrompt.match(/\[[^\]]+\]/);
  if (styleBracket) {
    warnings.push(warning('structure-in-style', 'warning', 'Структурный тег в Style', `${styleBracket[0]} лучше перенести в Lyrics.`, 'style'));
  }

  const genreInLyrics = ['synth-pop', 'dance-pop', 'trap', 'metalcore', 'indie rock', 'festival house'].find((value) => lyricsLower.includes(value));
  if (genreInLyrics) {
    warnings.push(warning('genre-in-lyrics', 'info', 'Жанровый тег в Lyrics', `${genreInLyrics} обычно лучше держать в Style prompt.`, 'lyrics'));
  }

  if (project.stylePrompt.length > 260) {
    warnings.push(warning('style-too-long', 'info', 'Длинный Style prompt', 'Suno может хуже слушаться слишком длинных prompt-строк.', 'style'));
  }

  for (const rule of conflictRules) {
    const haystack = `${style} ${lyricsLower}`;
    if (haystack.includes(rule.a) && haystack.includes(rule.b)) {
      warnings.push(warning(`conflict-${rule.a}-${rule.b}`, rule.severity, 'Конфликт тегов', `${rule.a} конфликтует с ${rule.b}. Экспорт разрешен.`, 'project'));
    }
  }

  const repeated = lyrics.match(/(\[[^\]]+\]\s*){4,}/);
  if (repeated) {
    warnings.push(warning('repeated-tags', 'info', 'Много директив подряд', 'Несколько метатегов подряд могут размыть управление секцией.', 'lyrics'));
  }

  const chorusBlocks = lyrics.match(/\[[^\]]*chorus[^\]]*\]/gi) ?? [];
  if (new Set(chorusBlocks.map((tag) => tag.toLowerCase())).size > 1 && chorusBlocks.length > 1 && !/\[Chorus Variation\]/i.test(lyrics)) {
    warnings.push(warning('chorus-variation', 'info', 'Разные Chorus-директивы', 'Если припев меняется, можно явно пометить [Chorus Variation].', 'lyrics'));
  }

  lyrics.split('\n').forEach((line, index) => {
    for (const match of line.matchAll(/\[([^\]:]+)(?::[^\]]*)?\]/g)) {
      const normalized = match[1].trim().toLowerCase();
      if (normalized && !knownBracketTags.has(normalized) && !/(verse \d|final chorus|climax|breakdown|dub interlude|filter sweep|scat)/i.test(normalized)) {
        warnings.push(warning(`unknown-${index}-${normalized}`, 'info', 'Неизвестный тег', `[${match[1]}] не найден в библиотеке, но экспорт разрешен.`, 'lyrics', index + 1));
      }
    }
  });

  return warnings;
}
