import { Client } from 'pg';
import { PrismaClient } from '@prisma/client';
import { migrationTables, copyTable } from './migration-core.mjs';

if (process.env.MIGRATION_WRITE_FREEZE_CONFIRMED !== 'yes') {
  throw new Error('Confirm a write freeze with MIGRATION_WRITE_FREEZE_CONFIRMED=yes');
}
if (!process.env.SOURCE_DATABASE_URL?.startsWith('postgresql://')) {
  throw new Error('SOURCE_DATABASE_URL must be a PostgreSQL connection string');
}
if (!process.env.DATABASE_URL?.startsWith('file:/')) {
  throw new Error('DATABASE_URL must be an absolute SQLite file: URL');
}

const sourceUrl = new URL(process.env.SOURCE_DATABASE_URL);
for (const parameter of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) {
  sourceUrl.searchParams.delete(parameter);
}
const source = new Client({
  connectionString: sourceUrl.toString(),
  ssl: { rejectUnauthorized: true },
  connectionTimeoutMillis: 15_000,
  query_timeout: 30_000
});
const destination = new PrismaClient();
let sourceTransactionOpen = false;

try {
  if (await destination.refreshToken.count() !== 0) {
    throw new Error('Destination refresh_tokens is not empty; refusing to overwrite data');
  }
  for (const table of migrationTables) {
    if (await destination[table.model].count() !== 0) {
      throw new Error(`Destination ${table.name} is not empty; refusing to overwrite data`);
    }
  }

  await source.connect();
  await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  sourceTransactionOpen = true;

  const counts = {};
  for (const table of migrationTables) {
    counts[table.name] = await copyTable(source, destination, table);
  }

  const integrity = await destination.$queryRawUnsafe('PRAGMA integrity_check');
  const foreignKeys = await destination.$queryRawUnsafe('PRAGMA foreign_key_check');
  if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok' || foreignKeys.length !== 0) {
    throw new Error('SQLite integrity or foreign key check failed; discard the destination database');
  }

  await source.query('COMMIT');
  sourceTransactionOpen = false;
  console.log(JSON.stringify({ ok: true, counts, sessionsMigrated: false }));
} catch (error) {
  if (sourceTransactionOpen) await source.query('ROLLBACK').catch(() => {});
  throw error;
} finally {
  await source.end().catch(() => {});
  await destination.$disconnect();
}
