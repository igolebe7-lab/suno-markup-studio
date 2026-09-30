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
    warnings.push(warning('brackets', 'error', 'Незакрытая скобка', 'Количество [ и ] в тексте песни не совпадает.', 'lyrics'));
  }

  if (!/\[[^\]]*(chorus|hook)[^\]]*\]/i.test(lyrics)) {
    warnings.push(warning('no-chorus', 'warning', 'Нет припева', 'Добавьте [Chorus] или [Hook], если нужен явный хук.', 'lyrics'));
  }

  if (!/\[[^\]]*(outro|end)[^\]]*\]/i.test(lyrics)) {
    warnings.push(warning('no-ending', 'info', 'Нет финального закрытия', 'Если нужен явно обозначенный финал, можно добавить [Outro] или [End].', 'lyrics'));
  }

  if (!/\[[^\]]+\]/.test(lyrics)) {
    warnings.push(warning('no-structure', 'info', 'Нет секционной структуры', 'В тексте песни нет метатегов секций. Это допустимо, если форма песни не задаётся явно.', 'lyrics'));
  }

  const styleBracket = project.stylePrompt.match(/\[[^\]]+\]/);
  if (styleBracket) {
    warnings.push(warning('structure-in-style', 'warning', 'Структурный тег в Style', `${styleBracket[0]} лучше перенести в Lyrics.`, 'style'));
  }

  const genreInLyrics = ['synth-pop', 'dance-pop', 'trap', 'metalcore', 'indie rock', 'festival house'].find((value) => lyricsLower.includes(value));
  if (genreInLyrics) {
    warnings.push(warning('genre-in-lyrics', 'info', 'Жанровый тег в Lyrics', `${genreInLyrics} обычно лучше держать в Style prompt.`, 'lyrics'));
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

  lyrics.split('\n').forEach((line, index) => {
    for (const match of line.matchAll(/\[([^\]:]+)(?::[^\]]*)?\]/g)) {
      const normalized = match[1].trim().toLowerCase();
      if (normalized && !knownBracketTags.has(normalized) && !/(verse \d|final chorus|climax|breakdown|dub interlude|filter sweep|scat)/i.test(normalized)) {
        warnings.push(warning(`unknown-${index}-${normalized}`, 'info', 'Нет статьи в справочнике', `[${match[1]}] не найден в нашем справочнике. Это не означает, что Suno отклонит текст.`, 'lyrics', index + 1));
      }
    }
  });

  return warnings;
}
