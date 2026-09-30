import { tags } from '../data/tags';
import { parseStylePrompt } from './stylePrompt';
import type { SunoMarkupProject } from './types';

const knownAvoid = new Map(tags.filter((tag) => tag.category === 'avoid').map((tag) => [tag.sunoText.toLowerCase(), tag]));

export function findKnownStyleExclusions(project: SunoMarkupProject): string[] {
  const chipTexts = tags.filter((tag) => project.styleChips.includes(tag.id) && tag.category === 'avoid').map((tag) => tag.sunoText);
  return [...new Set([...parseStylePrompt(project.stylePrompt), ...chipTexts]
    .filter((part) => knownAvoid.has(part.toLowerCase()))
    .map((part) => part.replace(/^avoid:\s*/i, '').trim()))];
}

export function moveKnownStyleExclusions(project: SunoMarkupProject): SunoMarkupProject {
  const parts = parseStylePrompt(project.stylePrompt);
  const retained = parts.filter((part) => !knownAvoid.has(part.toLowerCase()));
  const moved = findKnownStyleExclusions(project);
  const existing = (project.excludePrompt ?? '').split(',').map((part) => part.trim()).filter(Boolean);
  const excludePrompt = [...new Set([...existing, ...moved])].join(', ');
  return {
    ...project,
    stylePrompt: retained.join(', '),
    styleChips: project.styleChips.filter((id) => !tags.some((tag) => tag.id === id && tag.category === 'avoid')),
    excludePrompt
  };
}
