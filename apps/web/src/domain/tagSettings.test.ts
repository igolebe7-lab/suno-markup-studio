import { describe, expect, it } from 'vitest';
import { buildTagSettingProfile, buildConfiguredTagText, availableSettingCatalog, buildCustomSettingCatalog } from './tagSettings';
import type { Tag } from './types';
import { tags } from '../data/tags';

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
  it('preserves authored parameter definitions when a new catalog key collides', () => {
    const authored = { key: 'effectScope', label: 'Моя область', type: 'text' as const, defaultValue: 'near the end' };
    expect(buildCustomSettingCatalog([authored]).find((field) => field.key === 'effectScope')).toEqual(authored);
  });
});

describe('subject-specific built-in profiles', () => {
  const tag = (id: string) => tags.find((item) => item.id === id)!;
  const keys = (id: string) => buildTagSettingProfile(tag(id)).fields.map((field) => field.key);

  it('does not number an ending or assign a solo role to Instrumental', () => {
    expect(keys('end')).not.toContain('number');
    expect(keys('hard-stop')).not.toContain('number');
    expect(keys('instrumental')).not.toContain('instrumentRole');
    expect(keys('verse')).toContain('number');
  });
  it('separates register, role, articulation and effect scope', () => {
    expect(keys('female-vocal')).toContain('vocalRole');
    expect(keys('female-vocal')).toContain('vocalRegister');
    expect(keys('female-vocal')).not.toContain('vocalRange');
    const production = tags.find((item) => item.sunoText === 'hall reverb')!;
    expect(buildTagSettingProfile(production).fields.map((field) => field.key)).toContain('effectScope');
    expect(keys('avoid-avoid--heavy-guitars')).not.toContain('strictness');
  });
  it('ignores stale built-in controls while preserving explicitly authored custom fields', () => {
    expect(buildConfiguredTagText(tag('end'), { values: { number: '2', vocalRange: 'choir' }, custom: '' }, 'lyrics')).toBe('[End]');
    expect(buildConfiguredTagText(tag('verse'), { values: { number: '2' }, custom: '' }, 'lyrics')).toBe('[Verse 2]');
    expect(buildTagSettingProfile({ ...customTag, parameters: [] }).fields).toEqual([]);
  });
  it('uses harmonic controls for key changes and effect controls for audio modulation', () => {
    const profile = (text: string) => buildTagSettingProfile(tags.find((item) => item.sunoText === text)!);
    expect(profile('modulation (key change)').fields.map((field) => field.key)).toContain('harmonicDestination');
    expect(profile('modulation').fields.map((field) => field.key)).toContain('effectScope');
    expect(profile('time signature').fields.map((field) => field.key)).not.toContain('productionSpace');
    expect(profile('melody').fields.map((field) => field.key)).not.toContain('productionTexture');
    expect(profile('fade out').fields.map((field) => field.key)).toContain('dynamicShape');
    expect(profile('fade out').fields.find((field) => field.key === 'dynamicTarget')?.options).not.toContain('to a loud peak');
  });
  it('does not offer a decrescendo toward a loud peak or legacy ambiguous controls', () => {
    const decrescendo = tags.find((item) => item.sunoText.toLowerCase().includes('decrescendo'))!;
    const target = buildTagSettingProfile(decrescendo).fields.find((field) => field.key === 'dynamicTarget');
    expect(target?.options).not.toContain('to a loud peak');
    expect(availableSettingCatalog.map((field) => field.key)).not.toContain('strictness');
    expect(buildTagSettingProfile({ ...customTag, parameters: [{ key: 'strictness', label: 'Старая настройка', type: 'text' }] }).fields).toHaveLength(1);
  });
});
