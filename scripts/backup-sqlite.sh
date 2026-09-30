#!/bin/sh
set -eu
umask 077

db=${SUNO_SQLITE_DB:-/var/lib/suno/suno.db}
backup_dir=${SUNO_SQLITE_BACKUP_DIR:-/var/backups/suno}
test -f "$db"
test -d "$backup_dir"

stamp=$(date -u +%Y%m%dT%H%M%SZ)
temporary="$backup_dir/.suno-$stamp-$$.db"
backup="$backup_dir/suno-$stamp.db"
trap 'rm -f "$temporary"' EXIT HUP INT TERM

sqlite3 "$db" ".backup '$temporary'"
test "$(sqlite3 "$temporary" 'PRAGMA integrity_check;')" = ok
mv "$temporary" "$backup"
printf 'Created verified SQLite backup: %s\n' "$backup"
