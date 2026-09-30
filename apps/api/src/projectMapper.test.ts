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
