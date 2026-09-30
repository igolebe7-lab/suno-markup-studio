import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

if (process.env.SUNO_SMOKE_DISPOSABLE !== 'yes') {
  throw new Error('Refusing to write test data without SUNO_SMOKE_DISPOSABLE=yes');
}
if (!process.env.DATABASE_URL?.startsWith('file:/')) {
  throw new Error('This smoke test requires an absolute SQLite DATABASE_URL');
}

process.env.WEB_ORIGINS = 'https://127.0.0.1';
process.env.NODE_ENV = 'production';
process.env.COOKIE_PATH = '/suno/api';
process.env.COOKIE_SAME_SITE = 'lax';

const { buildServer } = await import('../apps/api/dist/server.js');
const app = buildServer();
const database = new PrismaClient();
const email = `sqlite-smoke-${randomUUID()}@example.test`;
const origin = 'https://127.0.0.1';

function cookiesFrom(response) {
  const values = response.headers['set-cookie'];
  return (Array.isArray(values) ? values : [values]).filter(Boolean).map((value) => value.split(';')[0]).join('; ');
}

function request(method, url, cookie, payload) {
  return app.inject({ method, url, headers: { origin, ...(cookie ? { cookie } : {}) }, ...(payload ? { payload } : {}) });
}

try {
  const registered = await request('POST', '/api/auth/register', '', { email, password: 'test-password-123' });
  assert.equal(registered.statusCode, 200, registered.body);
  const cookie = cookiesFrom(registered);
  assert.match(cookie, /sms_access=/);
  assert.match(registered.headers['set-cookie'].join('; '), /Path=\/suno\/api/);

  const signedOut = await request('POST', '/api/auth/logout', cookie);
  assert.equal(signedOut.statusCode, 200, signedOut.body);
  const loggedIn = await request('POST', '/api/auth/login', '', { email, password: 'test-password-123' });
  assert.equal(loggedIn.statusCode, 200, loggedIn.body);
  assert.equal(loggedIn.json().user.id, registered.json().user.id);
  const activeCookie = cookiesFrom(loggedIn);

  const project = {
    title: 'SQLite smoke project',
    stylePrompt: 'acoustic pop',
    lyrics: '[Verse]\nA test line\n[Chorus]\nA chorus',
    styleChips: [],
    tagsUsed: [],
    warnings: []
  };
  const savedProject = await request('POST', '/api/projects', activeCookie, project);
  assert.equal(savedProject.statusCode, 200, savedProject.body);
  const projectId = savedProject.json().project.id;
  const projects = await request('GET', '/api/projects', activeCookie);
  assert.equal(projects.statusCode, 200, projects.body);
  assert(projects.json().projects.some((item) => item.id === projectId));

  const tag = {
    label: 'Smoke tag',
    sunoText: 'Smoke Tag',
    placement: 'lyrics',
    descriptionRu: 'Проверка пользовательского тега',
    aliases: [],
    examples: ['[Smoke Tag]'],
    parameters: []
  };
  const savedTag = await request('POST', '/api/custom-tags', activeCookie, tag);
  assert.equal(savedTag.statusCode, 200, savedTag.body);
  const tagId = savedTag.json().tag.id;
  const tags = await request('GET', '/api/custom-tags', activeCookie);
  assert.equal(tags.statusCode, 200, tags.body);
  assert(tags.json().tags.some((item) => item.id === tagId));

  const removedTag = await request('DELETE', `/api/custom-tags/${tagId}`, activeCookie);
  const removedProject = await request('DELETE', `/api/projects/${projectId}`, activeCookie);
  assert.equal(removedTag.statusCode, 200, removedTag.body);
  assert.equal(removedProject.statusCode, 200, removedProject.body);
  console.log('SQLite API smoke passed: auth, projects, custom tags, cookie scope');
} finally {
  await app.close();
  const user = await database.user.findUnique({ where: { email } });
  if (user) await database.user.delete({ where: { id: user.id } });
  await database.$disconnect();
}
