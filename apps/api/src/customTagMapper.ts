import type { CustomTag as PrismaCustomTag } from '@prisma/client';
import type { CustomTag, CustomTagRequest } from '@suno/shared';

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function objectArray(value: unknown): CustomTag['parameters'] {
  return Array.isArray(value) ? value as CustomTag['parameters'] : [];
}

export function toCustomTagDto(tag: PrismaCustomTag): CustomTag {
  return {
    id: tag.id,
    label: tag.label,
    sunoText: tag.sunoText,
    category: 'custom',
    placement: tag.placement as CustomTag['placement'],
    confidence: 'experimental',
    aliases: stringArray(tag.aliases),
    descriptionRu: tag.descriptionRu,
    parameters: objectArray(tag.parameters),
    examples: stringArray(tag.examples),
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString()
  };
}

export function toCustomTagPersistence(body: CustomTagRequest) {
  return {
    label: body.label,
    sunoText: body.sunoText,
    placement: body.placement,
    descriptionRu: body.descriptionRu,
    aliases: body.aliases ?? [],
    examples: body.examples ?? [],
    parameters: body.parameters ?? []
  };
}
