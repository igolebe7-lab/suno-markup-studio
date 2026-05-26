import { describe, expect, it } from 'vitest';
import { tags } from '../data/tags';
import { buildStylePrompt } from './stylePrompt';
import { insertLyricsTag } from './lyrics';
import { validateProject } from './validation';
import { encodeTxt, exportDocxBlob, exportDocxBytes } from './exporters';

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

  it('accepts account custom lyric tags as known tags', () => {
    const warnings = validateProject(
      { stylePrompt: 'ambient pop', lyrics: '[Custom Drop]\nТекст\n[Chorus]\n[End]' },
      [{
        id: 'custom-drop',
        label: '[Custom Drop]',
        sunoText: '[Custom Drop]',
        category: 'custom',
        placement: 'lyrics',
        confidence: 'experimental',
        aliases: [],
        descriptionRu: 'Пользовательский тег.',
        parameters: [],
        examples: []
      }]
    );

    expect(warnings.some((item) => item.id.includes('unknown') && item.message.includes('[Custom Drop]'))).toBe(false);
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

  it('escapes exported docx text inside document.xml', async () => {
    const entries = readStoredZip(exportDocxBytes({
      id: 'project',
      title: 'Тест & <demo>',
      stylePrompt: 'synth-pop & "wide"',
      lyrics: "[Verse]\nТекст <важно> & 'голос'",
      styleChips: [],
      selectedPresetId: 'preset',
      tagsUsed: [],
      warnings: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      version: 1
    }));

    expect(Object.keys(entries).sort()).toEqual(['[Content_Types].xml', '_rels/.rels', 'word/document.xml']);
    expect(entries['word/document.xml']).toContain('Тест &amp; &lt;demo&gt;');
    expect(entries['word/document.xml']).toContain('synth-pop &amp; &quot;wide&quot;');
    expect(entries['word/document.xml']).toContain('Текст &lt;важно&gt; &amp; &apos;голос&apos;');
    expect(entries['word/document.xml']).not.toContain('Текст <важно>');
  });
});

function readStoredZip(zip: Uint8Array): Record<string, string> {
  const decoder = new TextDecoder();
  const entries: Record<string, string> = {};
  let cursor = 0;

  while (cursor < zip.length) {
    const view = new DataView(zip.buffer, zip.byteOffset + cursor);
    const signature = view.getUint32(0, true);
    if (signature !== 0x04034b50) break;
    const compressedSize = view.getUint32(18, true);
    const nameLength = view.getUint16(26, true);
    const extraLength = view.getUint16(28, true);
    const nameStart = cursor + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = decoder.decode(zip.slice(nameStart, nameStart + nameLength));
    entries[name] = decoder.decode(zip.slice(dataStart, dataStart + compressedSize));
    cursor = dataStart + compressedSize;
  }

  return entries;
}
