import { constants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function ensureSqliteFile(databaseUrl, allowedDirectory) {
  if (!databaseUrl?.startsWith('file:/')) {
    throw new Error('DATABASE_URL must be an absolute file: URL for SQLite');
  }

  const databasePath = fileURLToPath(databaseUrl);
  const directory = await realpath(dirname(databasePath));
  if (allowedDirectory && directory !== await realpath(allowedDirectory)) {
    throw new Error('SQLite database must be inside SUNO_SQLITE_DIR');
  }

  try {
    const handle = await open(databasePath, constants.O_CREAT | constants.O_EXCL | constants.O_RDWR, 0o600);
    await handle.close();
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    if (!(await lstat(databasePath)).isFile()) throw new Error('SQLite destination is not a regular file');
  }
  return databasePath;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const allowedDirectory = process.env.SUNO_SQLITE_DIR;
  if (process.env.NODE_ENV === 'production' && !allowedDirectory) {
    throw new Error('SUNO_SQLITE_DIR is required in production');
  }
  await ensureSqliteFile(process.env.DATABASE_URL, allowedDirectory);
}
