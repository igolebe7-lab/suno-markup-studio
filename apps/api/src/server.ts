import argon2 from 'argon2';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  customTagRequestSchema,
  createProjectRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
  updateCustomTagRequestSchema,
  updateProjectRequestSchema
} from '@suno/shared';
import { clearAuthCookies, issueSession, requireUser, revokeRequestSession } from './auth.js';
import { readConfig } from './config.js';
import { prisma } from './prisma.js';
import { toCustomTagDto, toCustomTagPersistence } from './customTagMapper.js';
import { toProjectDto, toProjectPersistence } from './projectMapper.js';

const config = readConfig();
const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getRequestOrigin(request: { headers: Record<string, string | string[] | undefined> }): string | undefined {
  const origin = getHeaderValue(request.headers.origin);
  if (origin) return origin;

  const referer = getHeaderValue(request.headers.referer);
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}

function getRateLimitKey(request: { ip: string; body: unknown }): string {
  const body = request.body as { email?: unknown } | undefined;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : 'unknown';
  return `${request.ip}:${email}`;
}

export function buildServer() {
  const app = Fastify({
    logger: true,
    trustProxy: true,
    bodyLimit: config.bodyLimitBytes
  });

  app.register(cookie);
  app.register(cors, {
    origin: config.webOrigins,
    credentials: true
  });
  app.register(rateLimit, {
    global: false,
    hook: 'preHandler',
    keyGenerator: getRateLimitKey,
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Слишком много попыток. Попробуйте позже.'
    })
  });

  app.addHook('onRequest', async (request, reply) => {
    if (!config.writeOriginProtection) return;
    if (!request.url.startsWith('/api/') || !unsafeMethods.has(request.method)) return;

    const origin = getRequestOrigin(request);
    if (!origin || !config.webOrigins.includes(origin)) {
      return reply.status(403).send({ message: 'Запрос с этого сайта запрещён' });
    }
  });

  app.get('/api/health', async () => ({ ok: true }));

  app.after((error) => {
    if (error) throw error;

    const authRateLimit = {
      max: config.authRateLimitMax,
      timeWindow: config.authRateLimitWindowMs
    };

    app.post('/api/auth/register', { config: { rateLimit: authRateLimit } }, async (request, reply) => {
      const body = registerRequestSchema.parse(request.body);
      const passwordHash = await argon2.hash(body.password);
      const user = await prisma.user.create({
        data: {
          email: body.email.toLowerCase(),
          passwordHash
        }
      });
      await issueSession(reply, config, user);
      return { user: { id: user.id, email: user.email } };
    });

    app.post('/api/auth/login', { config: { rateLimit: authRateLimit } }, async (request, reply) => {
      const body = loginRequestSchema.parse(request.body);
      const user = await prisma.user.findUnique({
        where: { email: body.email.toLowerCase() }
      });
      if (!user || !(await argon2.verify(user.passwordHash, body.password))) {
        return reply.status(401).send({ message: 'Неверная почта или пароль' });
      }
      await issueSession(reply, config, user);
      return { user: { id: user.id, email: user.email } };
    });
  });

  app.post('/api/auth/logout', async (request, reply) => {
    await revokeRequestSession(request);
    clearAuthCookies(reply);
    return { ok: true };
  });

  app.get('/api/auth/me', async (request) => {
    const user = await requireUser(request);
    return { user };
  });

  app.get('/api/projects', async (request) => {
    const user = await requireUser(request);
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true
      }
    });
    return {
      projects: projects.map((project) => ({
        id: project.id,
        title: project.title,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString()
      }))
    };
  });

  app.get('/api/custom-tags', async (request) => {
    const user = await requireUser(request);
    const customTags = await prisma.customTag.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 100
    });
    return { tags: customTags.map(toCustomTagDto) };
  });

  app.post('/api/custom-tags', async (request) => {
    const user = await requireUser(request);
    const body = customTagRequestSchema.parse(request.body);
    const saved = await prisma.customTag.create({
      data: {
        id: body.id ?? randomUUID(),
        userId: user.id,
        ...toCustomTagPersistence(body)
      }
    });
    return { tag: toCustomTagDto(saved) };
  });

  app.patch('/api/custom-tags/:id', async (request, reply) => {
    const user = await requireUser(request);
    const { id } = request.params as { id: string };
    const existing = await prisma.customTag.findFirst({
      where: { id, userId: user.id }
    });
    if (!existing) return reply.status(404).send({ message: 'Тег не найден' });
    const body = updateCustomTagRequestSchema.parse(request.body);
    const saved = await prisma.customTag.update({
      where: { id },
      data: toCustomTagPersistence({
        label: body.label ?? existing.label,
        sunoText: body.sunoText ?? existing.sunoText,
        placement: body.placement ?? existing.placement as 'style' | 'lyrics' | 'both',
        descriptionRu: body.descriptionRu ?? existing.descriptionRu,
        aliases: body.aliases ?? (Array.isArray(existing.aliases) ? existing.aliases as string[] : []),
        examples: body.examples ?? (Array.isArray(existing.examples) ? existing.examples as string[] : []),
        parameters: body.parameters ?? (Array.isArray(existing.parameters) ? existing.parameters as NonNullable<typeof body.parameters> : [])
      })
    });
    return { tag: toCustomTagDto(saved) };
  });

  app.delete('/api/custom-tags/:id', async (request, reply) => {
    const user = await requireUser(request);
    const { id } = request.params as { id: string };
    const existing = await prisma.customTag.findFirst({
      where: { id, userId: user.id }
    });
    if (!existing) return reply.status(404).send({ message: 'Тег не найден' });
    await prisma.customTag.delete({ where: { id } });
    return { ok: true };
  });

  app.post('/api/projects', async (request) => {
    const user = await requireUser(request);
    const body = createProjectRequestSchema.parse(request.body);
    const now = new Date().toISOString();
    const project = {
      id: body.id ?? randomUUID(),
      title: body.title,
      stylePrompt: body.stylePrompt ?? '',
      lyrics: body.lyrics ?? '',
      styleChips: body.styleChips ?? [],
      selectedPresetId: body.selectedPresetId,
      tagsUsed: body.tagsUsed ?? [],
      warnings: body.warnings ?? [],
      createdAt: body.createdAt ?? now,
      updatedAt: body.updatedAt ?? now,
      version: body.version ?? 1
    };
    const saved = await prisma.project.create({
      data: {
        id: project.id,
        userId: user.id,
        ...toProjectPersistence(project)
      }
    });
    return { project: toProjectDto(saved) };
  });

  app.get('/api/projects/:id', async (request, reply) => {
    const user = await requireUser(request);
    const { id } = request.params as { id: string };
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id }
    });
    if (!project) return reply.status(404).send({ message: 'Проект не найден' });
    return { project: toProjectDto(project) };
  });

  app.patch('/api/projects/:id', async (request, reply) => {
    const user = await requireUser(request);
    const { id } = request.params as { id: string };
    const existing = await prisma.project.findFirst({
      where: { id, userId: user.id }
    });
    if (!existing) return reply.status(404).send({ message: 'Проект не найден' });
    const body = updateProjectRequestSchema.parse(request.body);
    const current = toProjectDto(existing);
    const next = {
      ...current,
      ...body,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
      version: (body.version ?? current.version) + 1
    };
    const saved = await prisma.project.update({
      where: { id },
      data: toProjectPersistence(next)
    });
    return { project: toProjectDto(saved) };
  });

  app.delete('/api/projects/:id', async (request, reply) => {
    const user = await requireUser(request);
    const { id } = request.params as { id: string };
    const existing = await prisma.project.findFirst({
      where: { id, userId: user.id }
    });
    if (!existing) return reply.status(404).send({ message: 'Проект не найден' });
    await prisma.project.delete({ where: { id } });
    return { ok: true };
  });

  app.setErrorHandler((error, _request, reply) => {
    if (typeof error === 'object' && error !== null && 'issues' in error) {
      const validationError = error as { issues: unknown };
      return reply.status(400).send({ message: 'Некорректные данные', details: validationError.issues });
    }
    if ((error as { code?: string }).code === 'P2002') {
      return reply.status(409).send({ message: 'Пользователь уже существует' });
    }
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    if (statusCode === 429) {
      return reply.status(429).send({ message: 'Слишком много попыток. Попробуйте позже.' });
    }
    if (statusCode === 413) {
      return reply.status(413).send({ message: 'Запрос слишком большой' });
    }
    const message = error instanceof Error ? error.message : 'Ошибка запроса';
    return reply.status(statusCode).send({ message: statusCode === 500 ? 'Внутренняя ошибка сервера' : message });
  });

  return app;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const app = buildServer();
  app.listen({ port: config.port, host: config.host }).catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
}
