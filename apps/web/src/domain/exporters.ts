import type { SunoMarkupProject } from './types';

export type TxtEncoding = 'utf-8' | 'windows-1251' | 'x-mac-cyrillic';

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

export function encodeTxt(text: string, encoding: TxtEncoding): Uint8Array {
  if (encoding === 'utf-8') return new TextEncoder().encode(text);
  const map = encoding === 'windows-1251' ? windows1251EncodeMap : macCyrillicEncodeMap;
  return Uint8Array.from([...text].map((char) => {
    const code = char.codePointAt(0) ?? 0x3F;
    if (code <= 0x7F) return code;
    return map.get(code) ?? 0x3F;
  }));
}

export function exportDocxBlob(project: SunoMarkupProject): Blob {
  const documentXml = buildDocumentXml(project);
  const zip = createStoredZip({
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    'word/document.xml': documentXml
  });
  return new Blob([zip], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

function buildDocumentXml(project: SunoMarkupProject): string {
  const paragraphs = [
    paragraph(project.title, true),
    paragraph('Style'),
    ...exportStyle(project).split('\n').map((line) => paragraph(line)),
    paragraph('Lyrics'),
    ...exportLyrics(project).split('\n').map((line) => paragraph(line))
  ].join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`;
}

function paragraph(text: string, bold = false): string {
  const properties = bold ? '<w:rPr><w:b/></w:rPr>' : '';
  return `<w:p><w:r>${properties}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function createStoredZip(entries: Record<string, string>): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  Object.entries(entries).forEach(([name, content]) => {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    localParts.push(local, data);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centralParts.push(central);

    offset += local.length + data.length;
  });

  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, centralParts.length, true);
  endView.setUint16(10, centralParts.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);

  const allParts = [...localParts, ...centralParts, end];
  const zip = new Uint8Array(allParts.reduce((sum, part) => sum + part.length, 0));
  let cursor = 0;
  allParts.forEach((part) => {
    zip.set(part, cursor);
    cursor += part.length;
  });
  return zip;
}

const crcTable = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xEDB88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  data.forEach((byte) => {
    crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  });
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function buildCyrillicRangeMap(upperStart: number, lowerStart: number): Map<number, number> {
  const map = new Map<number, number>();
  for (let index = 0; index < 32; index += 1) {
    map.set(0x0410 + index, upperStart + index);
    map.set(0x0430 + index, lowerStart + index);
  }
  return map;
}

const windows1251EncodeMap = new Map<number, number>([
  ...buildCyrillicRangeMap(0xC0, 0xE0),
  [0x0401, 0xA8],
  [0x0451, 0xB8],
  [0x2116, 0xB9],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x201C, 0x93],
  [0x201D, 0x94],
  [0x2018, 0x91],
  [0x2019, 0x92]
]);

const macCyrillicEncodeMap = new Map<number, number>([
  ...buildCyrillicRangeMap(0x80, 0xE0),
  [0x044F, 0xDF],
  [0x0401, 0xDD],
  [0x0451, 0xDE],
  [0x2116, 0xDC],
  [0x2013, 0xD0],
  [0x2014, 0xD1],
  [0x201C, 0xD2],
  [0x201D, 0xD3],
  [0x2018, 0xD4],
  [0x2019, 0xD5],
  [0x2026, 0xC9],
  [0x00AB, 0xC7],
  [0x00BB, 0xC8]
]);
