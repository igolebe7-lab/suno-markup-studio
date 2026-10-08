import { describe, expect, it } from 'vitest';
import type { Project } from '@prisma/client';
import { toProjectDto, toProjectPersistence } from './projectMapper';

const record: Project = {
  id: '00000000-0000-0000-0000-000000000001',
  userId: '00000000-0000-0000-0000-000000000002',
  title: 'Test',
  stylePrompt: 'synth-pop',
  lyrics: '[Verse]',
  styleChips: [],
  selectedPresetId: null,
  tagsUsed: [],
  warnings: [],
  projectJson: { excludePrompt: 'heavy guitars' },
  version: 2,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z')
};

describe('project mapping', () => {
  it('reads and persists preparation fields without mutating legacy data', () => {
    const sunoContext = { modelId: 'v6', mode: 'custom' as const, notes: 'test' };
    const sectionEditRequest = { fragment: 'Chorus', change: 'choir', preserve: 'tempo', result: 'edited' };
    const dto = toProjectDto({ ...record, projectJson: { sunoContext, sectionEditRequest } });
    expect(dto).toMatchObject({ sunoContext, sectionEditRequest });
    expect(toProjectPersistence(dto).projectJson).toMatchObject({ sunoContext, sectionEditRequest });
    expect(toProjectDto(record).sunoContext).toBeUndefined();
    expect(toProjectDto({ ...record, projectJson: { sunoContext: { mode: 'invented' } } }).sunoContext).toBeUndefined();
  });
  it('reads Exclude from projectJson and retains it through persistence', () => {
    const dto = toProjectDto(record);
    expect(dto.excludePrompt).toBe('heavy guitars');
    expect(toProjectPersistence(dto).projectJson.excludePrompt).toBe('heavy guitars');
    const oldClientPatch = { ...dto, title: 'Renamed' };
    expect(toProjectPersistence(oldClientPatch).projectJson.excludePrompt).toBe('heavy guitars');
  });
  it('accepts legacy projectJson without Exclude', () => {
    expect(toProjectDto({ ...record, projectJson: {} }).excludePrompt).toBeUndefined();
  });
});
