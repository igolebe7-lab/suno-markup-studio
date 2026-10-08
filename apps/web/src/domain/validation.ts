import { tags } from '../data/tags';
import type { SunoMarkupProject, Tag, ValidationWarning, WarningSeverity } from './types';

const conflictRules = [
  { a: 'calm', b: 'aggressive', severity: 'warning' as const },
  { a: 'a cappella', b: 'full band', severity: 'warning' as const },
  { a: 'acoustic only', b: 'heavy synths', severity: 'warning' as const },
  { a: 'no drums', b: '808 drums', severity: 'warning' as const },
  { a: 'instrumental', b: 'lead vocals', severity: 'info' as const }
];

const bare = (text: string) => text.replace(/^\[|\]$/g, '').trim().toLowerCase();
const sectionNames = new Set(tags.filter((tag) => tag.category === 'structure' || /^instrumental(?:-|$)/.test(tag.id)).flatMap((tag) => [tag.sunoText, ...tag.aliases]).map(bare));
const sectionBase = (name: string) => name.replace(/^final\s+/, '').replace(/\s+(?:\d+|final)$/, '');
const isSection = (name: string) => sectionNames.has(name) || sectionNames.has(sectionBase(name));
const chorusNames = new Set(tags.filter((tag) => tag.category === 'structure' && /^(?:(?:final|silent|drop) )?(?:chorus|hook|refrain)(?: variation)?$/.test(bare(tag.sunoText)))
  .flatMap((tag) => [tag.sunoText, ...tag.aliases]).map(bare));

function hasPhrase(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, 'iu').test(text);
}

function bracketProblem(text: string): number | undefined {
  let openedAt: number | undefined;
  let content = '';
  let line = 1;
  for (const char of text) {
    if (char === '[') {
      if (openedAt !== undefined) return line;
      openedAt = line;
      content = '';
    }
    if (char === ']') {
      if (openedAt === undefined) return line;
      if (!content.trim()) return line;
      openedAt = undefined;
    }
    if (char === '\n') {
      if (openedAt !== undefined) return openedAt;
      line++;
    }
    if (openedAt !== undefined && char !== '[') content += char;
  }
  return openedAt;
}

function lyricDirectives(text: string) {
  const result: Array<{ name: string; text: string; line: number }> = [];
  text.split('\n').forEach((line, index) => {
    for (const match of line.matchAll(/\[([^\[\]\n]+)\]/g)) {
      result.push({ name: bare(match[1].split(':')[0]), text: match[1].toLowerCase(), line: index + 1 });
    }
  });
  return result;
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

export function validateProject(project: Pick<SunoMarkupProject, 'stylePrompt' | 'lyrics' | 'excludePrompt'>, extraTags: Tag[] = []): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const style = project.stylePrompt.toLowerCase();
  const lyrics = project.lyrics;
  const directives = lyricDirectives(lyrics);
  const knownTags = new Set([...tags, ...extraTags].flatMap((tag) => [tag.sunoText, ...tag.aliases]).map(bare));
  const syntaxLine = bracketProblem(lyrics);

  if (syntaxLine !== undefined) {
    warnings.push(warning('brackets', 'error', 'Проверьте квадратные скобки', 'Есть незакрытая, лишняя, вложенная или пустая скобка. Каждую инструкцию записывайте одной строкой в отдельной паре […].', 'lyrics', syntaxLine));
  }

  const instrumental = hasPhrase(style, 'instrumental') || hasPhrase(style, 'no vocals')
    || (directives.some((tag) => tag.name === 'instrumental') && !lyrics.replace(/\[[^\]]*\]/g, '').trim());
  if (!instrumental && !directives.some((tag) => chorusNames.has(tag.name) || chorusNames.has(sectionBase(tag.name)))) {
    warnings.push(warning('no-chorus', 'info', 'Припев не обозначен', 'Это допустимо. Если задуман отдельный припев, его можно обозначить [Chorus] или [Hook].', 'lyrics'));
  }

  if (!directives.some((tag) => /^(?:(?:spoken|instrumental) )?(?:outro|end|coda|hard stop|big finish)(?: \d+)?$/.test(tag.name))) {
    warnings.push(warning('no-ending', 'info', 'Нет финального закрытия', 'Если нужен явно обозначенный финал, можно добавить [Outro] или [End].', 'lyrics'));
  }

  if (!directives.some((tag) => isSection(tag.name))) {
    warnings.push(warning('no-structure', 'info', 'Нет секционной структуры', 'В тексте песни нет метатегов секций. Это допустимо, если форма песни не задаётся явно.', 'lyrics'));
  }

  const styleBracket = lyricDirectives(project.stylePrompt).find((tag) => isSection(tag.name));
  if (styleBracket) {
    warnings.push(warning('structure-in-style', 'warning', 'Секция в описании стиля', `[${styleBracket.name}] лучше перенести в текст песни.`, 'style'));
  }

  const genres = new Set(tags.filter((tag) => tag.category === 'genre' || tag.category === 'subgenre').map((tag) => bare(tag.sunoText)));
  const genreInLyrics = directives.find((tag) => genres.has(tag.name));
  if (genreInLyrics) {
    warnings.push(warning('genre-in-lyrics', 'info', 'Жанр в отдельном теге', `[${genreInLyrics.name}] можно перенести в описание стиля. Локальное жанровое уточнение может быть намеренным.`, 'lyrics', genreInLyrics.line));
  }

  const scopes = [{ text: style, label: 'В описании стиля', line: undefined as number | undefined }];
  let local = { text: '', label: 'В начальных инструкциях', line: undefined as number | undefined };
  for (const tag of directives) {
    if (isSection(tag.name)) {
      scopes.push(local);
      local = { text: '', label: `В секции [${tag.name}]`, line: tag.line };
    }
    local.text += `, ${tag.text}`;
  }
  scopes.push(local);
  for (const rule of conflictRules) {
    const scope = scopes.find((item) => hasPhrase(item.text, rule.a) && hasPhrase(item.text, rule.b));
    if (scope) {
      warnings.push(warning(`conflict-${rule.a}-${rule.b}`, rule.severity, 'Возможное противоречие', `${scope.label}: ${rule.a} и ${rule.b}. Уточните замысел, если сочетание не намеренное. Экспорт разрешён.`, scope === scopes[0] ? 'style' : 'lyrics', scope.line));
    }
  }

  const positiveStyle = style.split(/[,;\n]/).map((part) => part.split(/\b(?:no|not|without|avoid)\b/i)[0]).join(', ');
  const exclusions = [...new Set((project.excludePrompt ?? '').toLowerCase().split(/[,;\n]/).map((part) => part.trim()).filter(Boolean))];
  for (const excluded of exclusions) {
    if (hasPhrase(positiveStyle, excluded)) {
      warnings.push(warning(`exclude-${excluded}`, 'warning', 'Элемент указан и исключён', `«${excluded}» встречается в описании стиля и в поле «Исключить». Уточните, что нужно оставить.`, 'project'));
    }
  }

  const repeated = lyrics.match(/(\[[^\]]+\]\s*){4,}/);
  if (repeated) {
    warnings.push(warning('repeated-tags', 'info', 'Много директив подряд', 'Несколько метатегов подряд могут размыть управление секцией.', 'lyrics'));
  }

  for (const tag of directives) {
    if (!knownTags.has(tag.name) && !isSection(tag.name)) {
      warnings.push(warning(`unknown-${tag.line - 1}-${tag.name}`, 'info', 'Нет статьи в справочнике', `[${tag.name}] не найден в нашем справочнике. Это не означает, что Suno отклонит текст.`, 'lyrics', tag.line));
    }
  }

  return warnings;
}
