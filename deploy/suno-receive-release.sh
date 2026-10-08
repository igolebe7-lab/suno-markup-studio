#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

if [[ ! ${SSH_ORIGINAL_COMMAND:-} =~ ^deploy\ ([0-9a-f]{40})\ ([0-9a-f]{64})$ ]]; then
  printf 'Only a signed-off release upload is accepted.\n' >&2
  exit 64
fi

commit=${BASH_REMATCH[1]}
expected_sha=${BASH_REMATCH[2]}
incoming=/var/lib/suno-deploy/incoming
archive=$incoming/archive.tar.gz
temporary=$(mktemp "$incoming/.upload.XXXXXXXX")
trap 'rm -f -- "$temporary"' EXIT

exec 9>/var/lib/suno-deploy/deploy.lock
flock -w 600 9

head -c 786432001 > "$temporary"
if (( $(stat -c %s "$temporary") > 786432000 )); then
  printf 'Release archive exceeds 750 MiB.\n' >&2
  exit 65
fi
printf '%s  %s\n' "$expected_sha" "$temporary" | sha256sum --check --status

mv -f -- "$temporary" "$archive"
printf '%s\n%s\n' "$commit" "$expected_sha" > "$incoming/metadata.tmp"
mv -f -- "$incoming/metadata.tmp" "$incoming/metadata"
sudo -n /usr/local/sbin/suno-activate-release
rm -f -- "$archive" "$incoming/metadata"
