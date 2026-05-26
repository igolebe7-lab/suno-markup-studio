import { describe, expect, it } from 'vitest';
import { tags } from '../data/tags';
import { buildStylePrompt } from './stylePrompt';
import { insertLyricsTag } from './lyrics';
import { validateProject } from './validation';
import { encodeTxt, exportDocxBlob } from './exporters';

const id = (text: string) => tags.find((tag) => tag.sunoText === text)!.id;

describe('style prompt', () => {
  it('sorts style chips by recommended Suno order', () => {
    const prompt = buildStylePrompt([id('118 BPM'), id('synth-pop'), id('nostalgic'), id('female lead vocal'), id('analog synths')]);
    expect(prompt).toBe('synth-pop, nostalgic, 118 BPM, female lead vocal, analog synths');
  });
});

describe('lyrics tags', () => {
  it('inserts a tag at cursor with line breaks', () => {
    expect(insertLyricsTag('hello world', 5, '[Chorus]')).toBe('hello\n[Chorus]\n world');
  });
});

describe('validation', () => {
  it('detects core conflicts', () => {
    const warnings = validateProject({ stylePrompt: 'calm, aggressive, acoustic only, heavy synths, no drums, 808 drums', lyrics: '[Verse]\ntext\n[Outro]' });
    expect(warnings.some((item) => item.id.includes('calm-aggressive'))).toBe(true);
    expect(warnings.some((item) => item.id.includes('acoustic only-heavy synths'))).toBe(true);
    expect(warnings.some((item) => item.id.includes('no drums-808 drums'))).toBe(true);
  });

  it('detects syntax and structure recommendations', () => {
    const warnings = validateProject({ stylePrompt: '[Chorus], synth-pop', lyrics: '[Verse\nsynth-pop text' });
    expect(warnings.some((item) => item.id === 'brackets')).toBe(true);
    expect(warnings.some((item) => item.id === 'no-chorus')).toBe(true);
    expect(warnings.some((item) => item.id === 'no-ending')).toBe(true);
    expect(warnings.some((item) => item.id === 'structure-in-style')).toBe(true);
    expect(warnings.some((item) => item.id === 'genre-in-lyrics')).toBe(true);
  });
});

describe('exports', () => {
  it('encodes Cyrillic txt for Windows and classic Mac targets', () => {
    expect([...encodeTxt('Привет № Ёё', 'windows-1251')]).toEqual([0xCF, 0xF0, 0xE8, 0xE2, 0xE5, 0xF2, 0x20, 0xB9, 0x20, 0xA8, 0xB8]);
    expect([...encodeTxt('Привет № Ёё', 'x-mac-cyrillic')]).toEqual([0x8F, 0xF0, 0xE8, 0xE2, 0xE5, 0xF2, 0x20, 0xDC, 0x20, 0xDD, 0xDE]);
  });

  it('exports a real docx package', async () => {
    const blob = exportDocxBlob({
      id: 'project',
      title: 'Тест',
      stylePrompt: 'synth-pop',
      lyrics: '[Verse]\nТекст',
      styleChips: [],
      selectedPresetId: 'preset',
      tagsUsed: [],
      warnings: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      version: 1
    });
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(blob.size).toBeGreaterThan(500);
  });
});
