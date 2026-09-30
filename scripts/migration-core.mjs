import { createHash } from 'node:crypto';

export const migrationTables = [
  {
    name: 'users',
    model: 'user',
    columns: 'id::text AS id, email, password_hash AS "passwordHash", created_at AT TIME ZONE \'UTC\' AS "createdAt", updated_at AT TIME ZONE \'UTC\' AS "updatedAt"'
  },
  {
    name: 'projects',
    model: 'project',
    columns: 'id::text AS id, user_id::text AS "userId", title, style_prompt AS "stylePrompt", lyrics, style_chips AS "styleChips", selected_preset_id AS "selectedPresetId", tags_used AS "tagsUsed", warnings, project_json AS "projectJson", version, created_at AT TIME ZONE \'UTC\' AS "createdAt", updated_at AT TIME ZONE \'UTC\' AS "updatedAt"'
  },
  {
    name: 'custom_tags',
    model: 'customTag',
    columns: 'id::text AS id, user_id::text AS "userId", label, suno_text AS "sunoText", placement, description_ru AS "descriptionRu", aliases, examples, parameters, created_at AT TIME ZONE \'UTC\' AS "createdAt", updated_at AT TIME ZONE \'UTC\' AS "updatedAt"'
  }
];

function canonical(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

export function fingerprint(row) {
  return createHash('sha256').update(JSON.stringify(canonical(row))).digest('hex');
}

export async function copyTable(source, destination, table, batchSize = 100) {
  const sourceHash = createHash('sha256');
  let cursor = null;
  let count = 0;

  while (true) {
    const where = cursor ? 'WHERE id > $1::uuid' : '';
    const params = cursor ? [cursor, batchSize] : [batchSize];
    const limit = cursor ? '$2' : '$1';
    const result = await source.query(
      `SELECT ${table.columns} FROM "${table.name}" ${where} ORDER BY id LIMIT ${limit}`,
      params
    );
    if (!result.rows.length) break;
    await destination[table.model].createMany({ data: result.rows });
    for (const row of result.rows) sourceHash.update(`${row.id}:${fingerprint(row)}\n`);
    count += result.rows.length;
    cursor = result.rows.at(-1).id;
  }

  const destinationHash = createHash('sha256');
  let targetCursor = null;
  let targetCount = 0;
  while (true) {
    const rows = await destination[table.model].findMany({
      ...(targetCursor ? { where: { id: { gt: targetCursor } } } : {}),
      orderBy: { id: 'asc' },
      take: batchSize
    });
    if (!rows.length) break;
    for (const row of rows) destinationHash.update(`${row.id}:${fingerprint(row)}\n`);
    targetCount += rows.length;
    targetCursor = rows.at(-1).id;
  }

  if (count !== targetCount || sourceHash.digest('hex') !== destinationHash.digest('hex')) {
    throw new Error(`Data verification failed for ${table.name}; discard the destination database`);
  }
  return count;
}
