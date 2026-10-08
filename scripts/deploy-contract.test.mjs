import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const scripts = [
  'deploy/suno-receive-release.sh',
  'deploy/suno-activate-release.sh',
  'deploy/install-auto-deploy.sh'
];

test('Suno deploy scripts have valid Bash syntax', () => {
  for (const script of scripts) {
    const result = spawnSync('bash', ['-n', script], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, `${script}: ${result.stderr}`);
  }
});

test('extracted release is readable by services without becoming writable', () => {
  const stage = mkdtempSync(join(tmpdir(), 'suno-permissions-'));
  try {
    mkdirSync(join(stage, 'bin'), { mode: 0o700 });
    writeFileSync(join(stage, 'bin/node'), 'runtime', { mode: 0o700 });
    writeFileSync(join(stage, 'index.html'), 'page', { mode: 0o600 });
    chmodSync(stage, 0o700);
    const source = readFileSync(join(root, scripts[1]), 'utf8');
    const commands = source.split('\n').filter(line => line.startsWith('find "$stage" -type '));
    assert.equal(commands.length, 3);
    const result = spawnSync('bash', ['-eu', '-c', commands.join('\n')], {
      env: { ...process.env, stage }, encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(statSync(stage).mode & 0o777, 0o755);
    assert.equal(statSync(join(stage, 'bin')).mode & 0o777, 0o755);
    assert.equal(statSync(join(stage, 'bin/node')).mode & 0o777, 0o755);
    assert.equal(statSync(join(stage, 'index.html')).mode & 0o777, 0o644);
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
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
