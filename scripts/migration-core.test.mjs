import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { copyTable, fingerprint, migrationTables } from './migration-core.mjs';
import { ensureSqliteFile } from './ensure-sqlite.mjs';

test('fingerprint ignores JSON key ordering but preserves text and dates', () => {
  const first = { id: 'a', value: { b: 2, a: 1 }, updatedAt: new Date('2026-09-30T10:00:00Z') };
  const second = { updatedAt: new Date('2026-09-30T10:00:00Z'), value: { a: 1, b: 2 }, id: 'a' };
  assert.equal(fingerprint(first), fingerprint(second));
  assert.notEqual(fingerprint(first), fingerprint({ ...first, value: { a: 1, b: 3 } }));
});

test('PostgreSQL timestamps are explicitly read as UTC for every migrated table', () => {
  for (const table of migrationTables) {
    assert.match(table.columns, /created_at AT TIME ZONE 'UTC'/);
    assert.match(table.columns, /updated_at AT TIME ZONE 'UTC'/);
  }
});

test('copyTable verifies every record rather than just counts', async () => {
  const sourceRows = [
    { id: '00000000-0000-0000-0000-000000000001', email: 'one@example.com' },
    { id: '00000000-0000-0000-0000-000000000002', email: 'two@example.com' }
  ];
  const destinationRows = [];
  const source = {
    query: async (_sql, params) => ({
      rows: sourceRows.filter((row) => params.length === 1 || row.id > params[0]).slice(0, params.at(-1))
    })
  };
  const destination = {
    user: {
      createMany: async ({ data }) => { destinationRows.push(...data); },
      findMany: async ({ where, take }) => destinationRows.filter((row) => !where || row.id > where.id.gt).slice(0, take)
    }
  };
  assert.equal(await copyTable(source, destination, migrationTables[0], 1), 2);

  destinationRows.length = 0;
  destination.user.createMany = async ({ data }) => { destinationRows.push(...data.map((row) => ({ ...row, email: 'changed@example.com' }))); };
  await assert.rejects(copyTable(source, destination, migrationTables[0], 1), /Data verification failed/);
});

test('SQLite initialization creates a private file only in the allowed directory', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'suno-sqlite-test-'));
  try {
    const path = join(directory, 'suno.db');
    const url = pathToFileURL(path).href;
    assert.equal(await ensureSqliteFile(url, directory), path);
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    assert.equal(await ensureSqliteFile(url, directory), path);
    await assert.rejects(ensureSqliteFile(url, tmpdir()), /SUNO_SQLITE_DIR/);

    const link = join(directory, 'link.db');
    await symlink(path, link);
    await assert.rejects(ensureSqliteFile(pathToFileURL(link).href, directory), /regular file/);
    assert.equal((await readFile(path)).length, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
