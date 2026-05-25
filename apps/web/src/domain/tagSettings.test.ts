import { describe, expect, it } from 'vitest';
import { buildTagSettingProfile, buildConfiguredTagText } from './tagSettings';
import type { Tag } from './types';

const customTag: Tag = {
  id: 'custom-drop',
  label: 'Drop Marker',
  sunoText: '[Drop]',
  category: 'custom',
  placement: 'lyrics',
  confidence: 'experimental',
  aliases: ['drop'],
  descriptionRu: 'Пользовательский тег для дропа.',
  parameters: [
    {
      key: 'dropType',
      label: 'Тип дропа',
      type: 'select',
      options: ['heavy 808', 'filtered']
    },
    {
      key: 'note',
      label: 'Комментарий',
      type: 'text'
    }
  ],
  examples: ['[Drop]']
};

describe('custom tag settings', () => {
  it('uses tag parameters before category defaults', () => {
    const profile = buildTagSettingProfile(customTag);

    expect(profile.fields.map((field) => field.key)).toEqual(['dropType', 'note']);
    expect(profile.fields[0].options).toEqual(['none', 'heavy 808', 'filtered']);
  });

  it('builds configured lyric tag preview from custom parameters', () => {
    const preview = buildConfiguredTagText(
      customTag,
      { values: { dropType: 'heavy 808', note: 'after chorus' }, custom: 'wide impact' },
      'lyrics'
    );

    expect(preview).toBe('[Drop: heavy 808, after chorus, wide impact]');
  });
});
