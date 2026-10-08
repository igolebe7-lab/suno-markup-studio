#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

incoming=/var/lib/suno-deploy/incoming
archive=$incoming/archive.tar.gz
metadata=$incoming/metadata
releases=/opt/suno/releases
database=/var/lib/suno/suno.db
current=/opt/suno/current
previous=$(readlink -f "$current")
commit=$(sed -n '1p' "$metadata")
expected_sha=$(sed -n '2p' "$metadata")

[[ $commit =~ ^[0-9a-f]{40}$ && $expected_sha =~ ^[0-9a-f]{64}$ ]] || exit 65
release=$releases/$commit
stage=$releases/.staging-$commit
next_link=/opt/suno/.current-next-$commit
backup=/var/backups/suno/predeploy-$commit-$(date -u +%Y%m%dT%H%M%SZ).db
manifest=$(mktemp /run/suno-release-members.XXXXXXXX)
trap 'rm -f -- "$manifest"' EXIT
stopped=false
switched=false
backed_up=false
created_release=false
created_stage=false

rollback() {
  local result=$?
  trap - ERR
  if [ "$stopped" = true ]; then
    systemctl stop suno.service || true
    if [ "$backed_up" = true ]; then
      install -o suno -g suno -m 0600 "$backup" "$database.rollback"
      rm -f -- "$database-wal" "$database-shm"
      mv -f -- "$database.rollback" "$database"
    fi
    if [ "$switched" = true ]; then
      ln -s "$previous" "$next_link"
      mv -Tf "$next_link" "$current"
    fi
    systemctl start suno.service
  fi
  if [ "$created_stage" = true ]; then
    rm -rf -- "$stage"
  fi
  if [ "$created_release" = true ] && [ "$(readlink -f "$current")" != "$release" ]; then
    rm -rf -- "$release"
  fi
  printf 'Suno release failed; restored %s\n' "$previous" >&2
  exit "$result"
}
trap rollback ERR

test -f "$archive"
test -f "$database"
test -f "$previous/apps/api/dist/server.js"
printf '%s  %s\n' "$expected_sha" "$archive" | sha256sum --check --status

if [ "$previous" = "$release" ]; then
  printf 'Suno release %s is already active.\n' "$commit"
  exit 0
fi
test ! -e "$release"
test ! -e "$stage"

tar -tzf "$archive" > "$manifest"
while IFS= read -r member; do
  case "$member" in
    ''|/*|..|../*|*/..|*/../*) exit 65 ;;
    SOURCE_COMMIT|bin|bin/*|node_modules|node_modules/*|package.json|package-lock.json|apps|apps/api|apps/api/dist|apps/api/dist/*|apps/api/package.json|apps/web|apps/web/dist|apps/web/dist/*|apps/web/package.json|packages|packages/shared|packages/shared/dist|packages/shared/dist/*|packages/shared/package.json|prisma|prisma/sqlite|prisma/sqlite/*|scripts|scripts/ensure-sqlite.mjs|scripts/backup-sqlite.sh) ;;
    *) printf 'Unexpected archive path: %s\n' "$member" >&2; exit 65 ;;
  esac
done < "$manifest"
rm -f -- "$manifest"

install -d -o suno-deploy -g suno-deploy -m 0700 "$stage"
created_stage=true
runuser -u suno-deploy -- tar --no-same-owner --no-same-permissions -xzf "$archive" -C "$stage"
test "$(cat "$stage/SOURCE_COMMIT")" = "$commit"
for path in bin bin/node apps apps/api apps/api/dist apps/web apps/web/dist; do
  test ! -L "$stage/$path"
done
test -z "$(find "$stage/apps/web/dist" "$stage/apps/api/dist" -type l -print -quit)"
test -x "$stage/bin/node"
test -f "$stage/apps/api/dist/server.js"
test -f "$stage/apps/web/dist/index.html"
test -f "$stage/node_modules/prisma/build/index.js"
test -f "$stage/prisma/sqlite/schema.prisma"
chown -hR root:root "$stage"
# Extraction uses umask 077; the API and web server need read/traverse access.
find "$stage" -type d -exec chmod 0755 {} +
find "$stage" -type f -perm -u=x -exec chmod a+x {} +
find "$stage" -type f -exec chmod a+r,go-w {} +
mv -- "$stage" "$release"
created_release=true

stopped=true
systemctl stop suno.service
runuser -u suno -- sqlite3 "$database" ".backup '$backup'"
test "$(sqlite3 "$backup" 'PRAGMA integrity_check;')" = ok
backed_up=true

cd -- "$release"
runuser -u suno -- env DATABASE_URL=file:/var/lib/suno/suno.db NODE_ENV=production SUNO_SQLITE_DIR=/var/lib/suno \
  "$release/bin/node" "$release/node_modules/prisma/build/index.js" migrate deploy \
  --schema "$release/prisma/sqlite/schema.prisma"

ln -s "$release" "$next_link"
mv -Tf "$next_link" "$current"
switched=true
systemctl start suno.service

ready=false
for _ in $(seq 1 30); do
  if systemctl is-active --quiet suno.service && curl -fsS --max-time 2 http://127.0.0.1:8787/api/health 2>/dev/null | grep -q '"ok":true'; then
    ready=true
    break
  fi
  sleep 1
done
test "$ready" = true

expected_page=$(sha256sum "$release/apps/web/dist/index.html" | cut -d ' ' -f 1)
live_page=$(curl -fsS --max-time 10 https://147.45.136.245/suno/ | sha256sum | cut -d ' ' -f 1)
test "$live_page" = "$expected_page"
systemctl is-active --quiet familytime-caddy.service
systemctl is-active --quiet familytime-pocketbase.service
systemctl is-active --quiet wg-quick@wg0.service

for old_release in "$releases"/*; do
  [ -d "$old_release" ] || continue
  [ "$old_release" = "$release" ] && continue
  [ "$old_release" = "$previous" ] && continue
  [[ $(basename "$old_release") =~ ^[0-9a-f]{7,40}$ ]] || continue
  rm -rf -- "$old_release" || printf 'Could not remove old release: %s\n' "$old_release" >&2
done
for old_archive in "$releases"/suno-*.tar.gz; do
  if [ -f "$old_archive" ]; then
    rm -f -- "$old_archive" || printf 'Could not remove old archive: %s\n' "$old_archive" >&2
  fi
done

printf 'Suno release active: %s; SQLite backup: %s\n' "$commit" "$backup"
