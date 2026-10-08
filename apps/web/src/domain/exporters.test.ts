import { describe, expect, it } from 'vitest';
import { sunoMarkupProjectSchema } from '@suno/shared';
import type { SunoMarkupProject } from './types';
import { exportBoth, exportDocxBytes, exportExclude, exportJson, exportLyrics, exportMarkdown, exportStyle, exportTxt } from './exporters';

const base: SunoMarkupProject = { id: 'p1', title: 'Test', stylePrompt: 'pop', excludePrompt: 'noise', lyrics: '[Verse]\nWords', styleChips: [], tagsUsed: [], warnings: [], createdAt: '2026-10-08', updatedAt: '2026-10-08', version: 1 };
const project: SunoMarkupProject = { ...base, sunoContext: { modelId: 'v6', mode: 'custom', notes: 'NOTES <&"' }, sectionEditRequest: { fragment: 'secret draft fragment', change: 'secret draft change', preserve: 'tempo', result: 'MANUAL <&"\n```\nmore' } };

describe('preparation export', () => {
  it('retains preparation JSON without mutating the source', () => {
    const before = structuredClone(project);
    expect(sunoMarkupProjectSchema.parse(JSON.parse(JSON.stringify(exportJson(project))))).toMatchObject({ sunoContext: project.sunoContext, sectionEditRequest: project.sectionEditRequest });
    expect(project).toEqual(before);
  });
  it('keeps generation fields and copy both free of private notes and requests', () => {
    for (const exporter of [exportStyle, exportLyrics, exportExclude, exportBoth]) {
      expect(exporter(project)).not.toMatch(/NOTES|MANUAL|secret draft/);
      expect(exporter(project)).toBe(exporter(base));
    }
  });
  it('adds readable context and the actual edited request to full text files', () => {
    for (const exporter of [exportMarkdown, exportTxt]) {
      const result = exporter(project);
      expect(result).toContain('Условия генерации');
      expect(result).toContain('Режим: Custom');
      expect(result).toContain(project.sectionEditRequest!.result);
      expect(result).not.toContain('secret draft');
    }
    expect(exportMarkdown(project)).toContain('````text\nMANUAL');
  });
  it('does not add empty sections or change legacy output', () => {
    const empty = { ...base, sunoContext: {}, sectionEditRequest: { fragment: 'draft', change: '', preserve: '', result: ' \n ' } };
    expect(exportTxt(empty)).toBe(exportTxt(base));
    expect(exportMarkdown(empty)).toBe(exportMarkdown(base));
    expect(exportTxt(base)).toBe('STYLE:\npop\n\nEXCLUDE:\nnoise\n\nLYRICS:\n[Verse]\nWords\n');
  });
  it('escapes preparation XML in DOCX and leaves the source unchanged', () => {
    const xmlArchive = new TextDecoder().decode(exportDocxBytes(project));
    expect(xmlArchive).toContain('Условия генерации');
    expect(xmlArchive).toContain('MANUAL &lt;&amp;&quot;');
    expect(xmlArchive).not.toContain('secret draft');
    expect(xmlArchive).not.toContain('MANUAL <&"');
  });
});
