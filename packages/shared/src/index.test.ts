import { describe, expect, it } from 'vitest';
import { registerRequestSchema, sunoMarkupProjectSchema } from './index';

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
});
