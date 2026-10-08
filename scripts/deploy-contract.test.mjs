import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const scripts = [
  'deploy/suno-receive-release.sh',
  'deploy/suno-activate-release.sh',
  'deploy/install-auto-deploy.sh'
];

test('Suno deploy scripts have valid Bash syntax', () => {
  const result = spawnSync('bash', ['-n', ...scripts], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('restricted SSH receiver rejects commands outside release upload', () => {
  const result = spawnSync('bash', [scripts[0]], {
    cwd: root,
    env: { ...process.env, SSH_ORIGINAL_COMMAND: 'bash' },
    encoding: 'utf8',
    input: '',
    timeout: 2000
  });
  assert.equal(result.status, 64);
  assert.match(result.stderr, /Only a signed-off release upload/);
});
