import { tagById } from '../data/tags';
import type { TagCategory } from './types';

export const styleCategoryOrder: TagCategory[] = [
  'genre',
  'subgenre',
  'era',
  'mood',
  'tempo',
  'vocal',
  'instrument',
  'rhythm',
  'production',
  'language',
  'avoid'
];

export function parseStylePrompt(prompt: string): string[] {
  return prompt
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function buildStylePrompt(chipIds: string[], rawPrompt = ''): string {
  const chips = chipIds
    .map((id) => tagById.get(id))
    .filter((tag) => tag && (tag.placement === 'style' || tag.placement === 'both'));
  const grouped = new Map<TagCategory, string[]>();

  for (const tag of chips) {
    const bucket = grouped.get(tag!.category) ?? [];
    bucket.push(tag!.sunoText);
    grouped.set(tag!.category, bucket);
  }

  const ordered = styleCategoryOrder.flatMap((category) => grouped.get(category) ?? []);
  const manual = parseStylePrompt(rawPrompt).filter((part) => !ordered.includes(part));
  const avoid = ordered.filter((part) => part.startsWith('avoid:'));
  const regular = ordered.filter((part) => !part.startsWith('avoid:'));

  return [...regular, ...manual, ...avoid].join(', ');
}
