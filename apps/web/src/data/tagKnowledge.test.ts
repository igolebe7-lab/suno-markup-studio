import { describe, expect, it } from 'vitest';
import { tagKnowledge, tagKnowledgeById } from './tagKnowledge';

const requiredFirstBatch = [
  'intro',
  'verse',
  'pre-chorus',
  'chorus',
  'hook',
  'post-chorus',
  'bridge',
  'break',
  'build',
  'drop',
  'interlude',
  'solo',
  'outro',
  'end',
  'male-vocal',
  'female-vocal',
  'duet',
  'choir',
  'harmony',
  'backing-vocals',
  'rap',
  'spoken-word',
  'whisper',
  'scream',
  'auto-tune',
  'instrumental',
  'guitar-solo',
  'piano-solo',
  'bass-drop',
  'drum-fill',
  'fade-out'
];

describe('tag knowledge base', () => {
  it('covers the first key tag batch with detailed articles', () => {
    expect(tagKnowledge.length).toBeGreaterThanOrEqual(requiredFirstBatch.length);

    for (const tagId of requiredFirstBatch) {
      const article = tagKnowledgeById.get(tagId);
      expect(article, tagId).toBeDefined();
      expect(article?.summaryRu.length, tagId).toBeGreaterThan(20);
      expect(article?.effectRu.length, tagId).toBeGreaterThan(40);
      expect(article?.howItWorksRu.length, tagId).toBeGreaterThan(40);
      expect(article?.settingsRu.length, tagId).toBeGreaterThan(0);
      expect(article?.examples.length, tagId).toBeGreaterThan(0);
      expect(article?.sourceNotes.length, tagId).toBeGreaterThan(0);
    }
  });

  it('keeps tag article ids unique', () => {
    expect(new Set(tagKnowledge.map((item) => item.tagId)).size).toBe(tagKnowledge.length);
  });
});
