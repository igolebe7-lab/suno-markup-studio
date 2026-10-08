import { describe, expect, it } from 'vitest';
import { tags } from './tags';
import { officialVocabulary, officialSources, getOfficialEvidence } from './officialTags';
import { referenceById, referenceSources } from './referenceCatalog';
import glossaryInventory from '../../../../docs/suno-2026-10-08/official-glossary-inventory.json';

describe('verifiable official catalog', () => {
  it('covers the independently recorded 104 source headings, including slash variants', () => {
    expect(glossaryInventory.sourceEntries).toHaveLength(104);
    const expansions: Record<string, string[]> = glossaryInventory.expandedEntries;
    const expected = glossaryInventory.sourceEntries.flatMap((term) => expansions[term] ?? [term]);
    expect(new Set(officialVocabulary.filter((entry) => entry.sourceId === 'O01').map((entry) => entry.term))).toEqual(new Set(expected));
    expect(new Set(tags.map((tag) => tag.id)).size).toBe(tags.length);
  });
  it('covers every entry in the audited official vocabulary and gives it an article', () => {
    expect(officialVocabulary.length).toBeGreaterThan(100);
    for (const entry of officialVocabulary) {
      const tag = tags.find((item) => item.officialEvidence?.some((proof) => proof.term === entry.term));
      expect(tag, entry.term).toBeDefined();
      expect(referenceById.has(tag!.id), entry.term).toBe(true);
    }
  });
  it('requires scoped first-party evidence rather than trusting a legacy confidence flag', () => {
    for (const tag of tags) {
      expect(tag.confidence === 'official').toBe(getOfficialEvidence(tag).length > 0);
      for (const proof of getOfficialEvidence(tag)) {
        expect(officialSources.some((source) => source.id === proof.sourceId)).toBe(true);
        expect(referenceSources.has(proof.sourceId)).toBe(true);
        expect(proof.scope).toBeTruthy();
      }
    }
    expect(tags.find((tag) => tag.id === 'end')!.confidence).not.toBe('official');
    const verse = tags.find((tag) => tag.id === 'verse')!;
    expect(getOfficialEvidence({ ...verse, category: 'custom' })).toEqual([]);
    expect(getOfficialEvidence(verse).some((proof) => proof.kind === 'glossary-term')).toBe(true);
  });
  it('includes literal documented lyric examples without promoting user song pages', () => {
    for (const text of ['[drum break]', '[female vocals]']) {
      const tag = tags.find((item) => item.sunoText === text)!;
      expect(tag).toBeDefined();
      expect(getOfficialEvidence(tag).some((proof) => proof.kind === 'lyrics-example')).toBe(true);
    }
    expect(officialSources.every((source) => !/\/(song|style)\//.test(source.url))).toBe(true);
  });
});
