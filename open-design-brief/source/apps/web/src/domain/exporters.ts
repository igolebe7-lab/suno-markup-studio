import type { SunoMarkupProject } from './types';

export function exportStyle(project: SunoMarkupProject): string {
  return project.stylePrompt.trim();
}

export function exportLyrics(project: SunoMarkupProject): string {
  return project.lyrics.trim();
}

export function exportMarkdown(project: SunoMarkupProject): string {
  return `# ${project.title}\n\n## Style\n\n\`\`\`text\n${exportStyle(project)}\n\`\`\`\n\n## Lyrics\n\n\`\`\`text\n${exportLyrics(project)}\n\`\`\`\n`;
}

export function exportJson(project: SunoMarkupProject): SunoMarkupProject {
  return { ...project, updatedAt: new Date().toISOString() };
}

export function exportTxt(project: SunoMarkupProject): string {
  return `STYLE:\n${exportStyle(project)}\n\nLYRICS:\n${exportLyrics(project)}\n`;
}

export function exportBoth(project: SunoMarkupProject): string {
  return `${exportStyle(project)}\n\n${exportLyrics(project)}`;
}
