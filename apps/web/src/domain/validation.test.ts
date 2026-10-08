import { describe, expect, it } from 'vitest';
import { validateProject } from './validation';

const ids = (lyrics: string, stylePrompt = '', excludePrompt = '') =>
  validateProject({ lyrics, stylePrompt, excludePrompt }).map((item) => item.id);

describe('scoped prompt validation', () => {
  it.each(['][', '[[Verse]]', '[Verse', '[Verse]]'])('detects malformed bracket order: %s', (text) => {
    expect(ids(text)).toContain('brackets');
  });
  it('allows contrasts between separate sections and ignores sung words', () => {
    expect(ids('[Verse: calm]\naggressive trap\n[Chorus: aggressive]\ncalm')).not.toContain('conflict-calm-aggressive');
    expect(ids('[Verse]\nThis is a trap')).not.toContain('genre-in-lyrics');
  });
  it('finds conflicts among directives within the same section', () => {
    expect(ids('[Verse: calm]\n[Aggressive]\nWords')).toContain('conflict-calm-aggressive');
  });
  it('uses phrase boundaries instead of substrings', () => {
    expect(ids('[Verse]\nWords', 'calming, aggressive')).not.toContain('conflict-calm-aggressive');
  });
  it('detects genre tags, but not section modifiers or ordinary song words', () => {
    expect(ids('[trap]\nWords')).toContain('genre-in-lyrics');
    expect(ids('[Verse: trap beat]\nWords')).not.toContain('genre-in-lyrics');
  });
  it('checks Exclude against positive global style, not local section contrasts', () => {
    expect(ids('[Intro: no drums]\n[Chorus: live drums]', 'pop', 'drums')).not.toContain('exclude-drums');
    expect(ids('[Verse]', 'live drums, piano', 'drums')).toContain('exclude-drums');
    expect(ids('[Verse]', 'no drums, piano', 'drums')).not.toContain('exclude-drums');
    expect(ids('[Verse]', 'piano without drums', 'drums')).not.toContain('exclude-drums');
    expect(ids('[Verse]', 'no drums, live drums', 'drums')).toContain('exclude-drums');
    expect(ids('[Verse]', 'bassoon', 'bass')).not.toContain('exclude-bass');
    expect(ids('[Verse]', 'acoustic guitars', 'heavy guitars')).not.toContain('exclude-heavy guitars');
  });
  it('flags multiline and empty bracket instructions as syntax errors', () => {
    expect(ids('[Verse\n]')).toContain('brackets');
    expect(ids('[ ]')).toContain('brackets');
  });
  it('accepts numbered known sections without accepting partial names', () => {
    expect(ids('[Verse 12]\nWords')).not.toContain('unknown-0-verse 12');
    expect(ids('[Final Verse]\nWords')).not.toContain('unknown-0-final verse');
    expect(ids('[Verse 12garbage]\nWords')).toContain('unknown-0-verse 12garbage');
    expect(ids('[Endless]\nWords')).toContain('no-ending');
  });
  it('does not require a chorus in an instrumental project', () => {
    expect(ids('[Instrumental]\n[End]', 'instrumental, ambient')).not.toContain('no-chorus');
  });
  it('recognizes numbered chorus variations and known chorus aliases', () => {
    expect(ids('[Chorus Variation 2]\nWords')).not.toContain('no-chorus');
    expect(ids('[Last Chorus]\nWords')).not.toContain('no-chorus');
    expect(ids('[Post-Chorus]\nWords')).toContain('no-chorus');
  });
  it('does not classify arbitrary bracketed style descriptions as structural tags', () => {
    expect(ids('[Verse]', '[warm guitars]')).not.toContain('structure-in-style');
    expect(ids('[Verse]', '[Chorus], pop')).toContain('structure-in-style');
  });
});
