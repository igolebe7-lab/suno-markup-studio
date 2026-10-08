#!/usr/bin/env bash
set -Eeuo pipefail

if [ "$(id -u)" -ne 0 ] || [ "$#" -ne 1 ]; then
  printf 'Usage: install-auto-deploy.sh /path/to/deploy-public-key\n' >&2
  exit 64
fi

public_key=$1
script_dir=$(cd -- "$(dirname -- "$0")" && pwd)
read -r algorithm material comment < "$public_key"
if [ "$algorithm" != ssh-ed25519 ] || [[ ! $material =~ ^[A-Za-z0-9+/=]+$ ]]; then
  printf 'Expected one Ed25519 public key.\n' >&2
  exit 65
fi

if ! id suno-deploy >/dev/null 2>&1; then
  useradd --system --create-home --home-dir /var/lib/suno-deploy --shell /bin/bash suno-deploy
fi
install -d -o suno-deploy -g suno-deploy -m 0700 /var/lib/suno-deploy/.ssh /var/lib/suno-deploy/incoming
install -o root -g root -m 0755 "$script_dir/suno-receive-release.sh" /usr/local/sbin/suno-receive-release
install -o root -g root -m 0755 "$script_dir/suno-activate-release.sh" /usr/local/sbin/suno-activate-release

authorized=/var/lib/suno-deploy/.ssh/authorized_keys
printf 'restrict,command="/usr/local/sbin/suno-receive-release" %s %s %s\n' "$algorithm" "$material" "${comment:-suno-actions}" > "$authorized.tmp"
chown suno-deploy:suno-deploy "$authorized.tmp"
chmod 0600 "$authorized.tmp"
mv -f -- "$authorized.tmp" "$authorized"

printf 'suno-deploy ALL=(root) NOPASSWD: /usr/local/sbin/suno-activate-release ""\n' > /etc/sudoers.d/suno-deploy.tmp
chmod 0440 /etc/sudoers.d/suno-deploy.tmp
visudo -cf /etc/sudoers.d/suno-deploy.tmp
mv -f -- /etc/sudoers.d/suno-deploy.tmp /etc/sudoers.d/suno-deploy
printf 'Restricted Suno deploy user installed.\n'
