import type { SectionOutlineItem } from './types';

export function insertLyricsTag(lyrics: string, cursor: number, tagText: string): string {
  const text = tagText.startsWith('[') ? tagText : `[${tagText}]`;
  const safeCursor = Math.max(0, Math.min(cursor, lyrics.length));
  const prefix = safeCursor > 0 && lyrics[safeCursor - 1] !== '\n' ? '\n' : '';
  const suffix = lyrics[safeCursor] && lyrics[safeCursor] !== '\n' ? '\n' : '';
  return lyrics.slice(0, safeCursor) + prefix + text + suffix + lyrics.slice(safeCursor);
}

export function extractOutline(lyrics: string): SectionOutlineItem[] {
  return lyrics.split('\n').flatMap((line, index) => {
    const matches = line.match(/\[[^\]]+\]/g) ?? [];
    return matches
      .filter((tag) => /intro|verse|chorus|bridge|outro|hook|drop|build|end/i.test(tag))
      .map((tag) => ({ tag, line: index + 1 }));
  });
}
