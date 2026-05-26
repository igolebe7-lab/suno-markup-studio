import { describe, expect, it } from 'vitest';
import { customTagRequestSchema, registerRequestSchema, sunoMarkupProjectSchema } from './index';

describe('shared schemas', () => {
  it('validates auth payloads', () => {
    expect(registerRequestSchema.safeParse({ email: 'user@example.com', password: '12345678' }).success).toBe(true);
    expect(registerRequestSchema.safeParse({ email: 'bad', password: 'short' }).success).toBe(false);
  });

  it('validates project payloads', () => {
    const result = sunoMarkupProjectSchema.safeParse({
      id: 'project-id',
      title: 'Demo',
      stylePrompt: 'pop, 120 BPM',
      lyrics: '[Verse]\nText',
      styleChips: ['genre-pop'],
      tagsUsed: ['[Verse]'],
      warnings: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    });

    expect(result.success).toBe(true);
  });

  it('allows long creative text but rejects oversized project payloads', () => {
    const baseProject = {
      id: 'project-id',
      title: 'Large Demo',
      stylePrompt: 'synth-pop, cinematic, '.repeat(400),
      lyrics: `[Verse]\n${'Очень длинная строка песни\n'.repeat(4000)}`,
      styleChips: Array.from({ length: 120 }, (_, index) => `tag-${index}`),
      tagsUsed: Array.from({ length: 120 }, (_, index) => `[Tag ${index}]`),
      warnings: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    expect(sunoMarkupProjectSchema.safeParse(baseProject).success).toBe(true);
    expect(sunoMarkupProjectSchema.safeParse({ ...baseProject, lyrics: 'x'.repeat(250_001) }).success).toBe(false);
    expect(sunoMarkupProjectSchema.safeParse({ ...baseProject, stylePrompt: 'x'.repeat(40_001) }).success).toBe(false);
    expect(sunoMarkupProjectSchema.safeParse({ ...baseProject, styleChips: Array.from({ length: 1001 }, (_, index) => `tag-${index}`) }).success).toBe(false);
  });

  it('validates account custom tags with configurable parameters', () => {
    const result = customTagRequestSchema.safeParse({
      label: 'Drop Marker',
      sunoText: '[Drop]',
      placement: 'lyrics',
      descriptionRu: 'Пользовательский тег для резкого перехода в дроп.',
      aliases: ['drop', 'beat drop'],
      examples: ['[Drop: heavy 808]'],
      parameters: [
        {
          key: 'dropType',
          label: 'Тип дропа',
          type: 'select',
          options: ['heavy 808', 'half-time', 'filtered'],
          defaultValue: 'heavy 808'
        },
        {
          key: 'note',
          label: 'Комментарий',
          type: 'text'
        },
        {
          key: 'bars',
          label: 'Тактов',
          type: 'number',
          min: 1,
          max: 8,
          defaultValue: 4
        }
      ]
    });

    expect(result.success).toBe(true);
  });

  it('keeps custom tags generous but bounded', () => {
    const baseTag = {
      label: 'Large Custom Tag',
      sunoText: '[Large Custom Tag]',
      placement: 'lyrics',
      descriptionRu: 'Подробное описание пользовательского тега. '.repeat(60),
      aliases: Array.from({ length: 40 }, (_, index) => `alias-${index}`),
      examples: Array.from({ length: 30 }, (_, index) => `[Large Custom Tag: example ${index}]`),
      parameters: Array.from({ length: 40 }, (_, index) => ({
        key: `setting${index}`,
        label: `Настройка ${index}`,
        type: 'text' as const
      }))
    };

    expect(customTagRequestSchema.safeParse(baseTag).success).toBe(true);
    expect(customTagRequestSchema.safeParse({ ...baseTag, descriptionRu: 'x'.repeat(8001) }).success).toBe(false);
    expect(customTagRequestSchema.safeParse({ ...baseTag, aliases: Array.from({ length: 101 }, (_, index) => `alias-${index}`) }).success).toBe(false);
    expect(customTagRequestSchema.safeParse({ ...baseTag, parameters: Array.from({ length: 101 }, (_, index) => ({
      key: `setting${index}`,
      label: `Настройка ${index}`,
      type: 'text' as const
    })) }).success).toBe(false);
  });
});
