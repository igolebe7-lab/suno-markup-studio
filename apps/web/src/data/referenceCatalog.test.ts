import { describe, expect, it } from 'vitest';
import { tags } from './tags';
import { referenceArticles, referenceById, referenceParameters, referenceSources, parseReferenceHash, searchReference } from './referenceCatalog';
import { buildTagSettingProfile } from '../domain/tagSettings';

describe('reference catalog', () => {
  it('has one article for every built-in tag', () => {
    expect(referenceArticles).toHaveLength(tags.length);
    expect(new Set(referenceArticles.map((article) => article.tagId)).size).toBe(tags.length);
    expect(tags.every((tag) => referenceById.has(tag.id))).toBe(true);
    for (const article of referenceArticles) {
      expect(article.exampleVariants.some((example) => example.destination !== 'workflow-note')).toBe(true);
      expect(article.evidence.audioTested).toBe(false);
      expect(article.evidence.contextSourceIds.every((id) => referenceSources.has(id))).toBe(true);
      expect(article.evidence.directSupport.every((source) => referenceSources.has(source.sourceId))).toBe(true);
      expect(article.relatedTagIds.every((id) => referenceById.has(id))).toBe(true);
      const tag = tags.find((item) => item.id === article.tagId)!;
      expect(article.parameters.currentKeys).toEqual(buildTagSettingProfile(tag).fields.map((field) => field.key));
      expect(buildTagSettingProfile(tag).fields.every((field) => referenceParameters.has(field.key))).toBe(true);
    }
  });

  it('filters official evidence and searches the current setting explanations', () => {
    expect(searchReference('', 'all', 'all', 'official').every((article) => article.evidence.status === 'officially-documented')).toBe(true);
    expect(searchReference('', 'all', 'all', 'editorial').every((article) => article.evidence.status !== 'officially-documented')).toBe(true);
    expect(searchReference('гармонического направления').some((article) => article.sunoText === 'modulation (key change)')).toBe(true);
  });

  it('prioritizes exact tag names over aliases and searches Russian descriptions', () => {
    expect(searchReference('Chorus')[0]?.tagId).toBe('chorus');
    expect(searchReference('тихо').length).toBeGreaterThan(0);
  });

  it('parses direct links without losing tag ids containing spaces', () => {
    expect(parseReferenceHash('#reference/tag/' + encodeURIComponent('genre-drum and bass'))).toEqual({
      kind: 'tag', value: 'genre-drum and bass'
    });
    expect(parseReferenceHash('#reference/category/vocal')).toEqual({ kind: 'category', value: 'vocal' });
    expect(parseReferenceHash('#reference/tag/%')).toEqual({ kind: 'invalid' });
  });
});
