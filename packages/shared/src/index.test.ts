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
});
