import type { Project } from '@prisma/client';
import type { SunoMarkupProject } from '@suno/shared';

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function toProjectDto(project: Project): SunoMarkupProject {
  const json = project.projectJson as Partial<SunoMarkupProject> | null;
  return {
    id: project.id,
    title: project.title,
    stylePrompt: project.stylePrompt,
    lyrics: project.lyrics,
    styleChips: stringArray(project.styleChips),
    selectedPresetId: project.selectedPresetId ?? undefined,
    tagsUsed: stringArray(project.tagsUsed),
    warnings: Array.isArray(project.warnings) ? json?.warnings ?? [] : json?.warnings ?? [],
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    version: project.version
  };
}

export function toProjectPersistence(project: SunoMarkupProject) {
  return {
    title: project.title,
    stylePrompt: project.stylePrompt,
    lyrics: project.lyrics,
    styleChips: project.styleChips,
    selectedPresetId: project.selectedPresetId,
    tagsUsed: project.tagsUsed,
    warnings: project.warnings,
    projectJson: project,
    version: project.version
  };
}
