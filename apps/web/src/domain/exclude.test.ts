import { describe, expect, it } from 'vitest';
import { findKnownStyleExclusions, moveKnownStyleExclusions } from './exclude';
import type { SunoMarkupProject } from './types';

const project = {
  id: 'p', title: 'Example', stylePrompt: 'synth-pop, avoid: heavy guitars, avoid: unknown effect',
  lyrics: '[Chorus]\nHello', styleChips: ['avoid-avoid--heavy-guitars'],
  tagsUsed: [], warnings: [], createdAt: '', updatedAt: '', version: 1
} as SunoMarkupProject;

describe('known exclusions migration', () => {
  it('moves only known catalog descriptors and preserves ambiguous text', () => {
    expect(findKnownStyleExclusions(project)).toEqual(['heavy guitars']);
    const moved = moveKnownStyleExclusions(project);
    expect(moved.stylePrompt).toBe('synth-pop, avoid: unknown effect');
    expect(moved.excludePrompt).toBe('heavy guitars');
    expect(moved.styleChips).toEqual([]);
  });
  it('is idempotent and keeps existing exclusions', () => {
    const moved = moveKnownStyleExclusions({ ...project, excludePrompt: 'heavy guitars, no drums' });
    expect(moved.excludePrompt).toBe('heavy guitars, no drums');
    expect(moveKnownStyleExclusions(moved)).toEqual(moved);
  });
  it('moves a known avoid chip even when its text is absent from Style', () => {
    const moved = moveKnownStyleExclusions({ ...project, stylePrompt: 'synth-pop' });
    expect(moved.excludePrompt).toBe('heavy guitars');
    expect(moved.styleChips).toEqual([]);
  });
});
