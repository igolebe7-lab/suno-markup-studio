import { tags } from '../data/tags';
import type { SectionEditRequest } from './types';

export const emptySectionEditRequest: SectionEditRequest = { fragment: '', change: '', preserve: '', result: '' };
export const sunoModeLabels = { custom: 'Custom', simple: 'Simple', studio: 'Studio', sounds: 'Sounds' } as const;

export function buildSectionEditRequest(input: Pick<SectionEditRequest, 'fragment' | 'change' | 'preserve'>): string {
  const change = input.change.trim();
  if (!change) return '';
  const fragment = input.fragment.trim();
  const preserve = input.preserve.trim();
  return [
    fragment ? `В исходной песне измените указанный фрагмент.\nФрагмент: ${fragment}` : 'В исходной песне внесите следующие изменения.',
    `Что изменить:\n${change}`,
    ...(preserve ? [`Что сохранить:\n${preserve}`] : [])
  ].join('\n\n');
}

export function shouldConfirmRequestReplace(currentResult: string, nextResult: string): boolean {
  return !!currentResult.trim() && currentResult !== nextResult;
}

const bare = (value: string) => value.replace(/^\[|\]$/g, '').trim().toLowerCase();
const sectionNames = new Set(tags.filter((tag) => tag.category === 'structure' || /^instrumental(?:-|$)/.test(tag.id))
  .flatMap((tag) => [tag.sunoText, ...tag.aliases]).map(bare));

export function getSectionRequestOptions(lyrics: string): Array<{ value: string; label: string }> {
  const sections = [...lyrics.matchAll(/\[([^\[\]\n]+)\]/g)].flatMap((match) => {
    const name = match[1].split(':')[0].trim();
    const key = bare(name);
    const base = key.replace(/^final\s+/, '').replace(/\s+(?:\d+|final)$/, '');
    return sectionNames.has(key) || sectionNames.has(base) ? [{ name, key }] : [];
  });
  const totals = new Map<string, number>();
  const seen = new Map<string, number>();
  sections.forEach(({ key }) => totals.set(key, (totals.get(key) ?? 0) + 1));
  return sections.map(({ name, key }) => {
    const index = (seen.get(key) ?? 0) + 1;
    seen.set(key, index);
    const value = `[${name}]${(totals.get(key) ?? 0) > 1 ? ` (${index})` : ''}`;
    return { value, label: value };
  });
}
