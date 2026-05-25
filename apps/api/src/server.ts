import argon2 from 'argon2';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  createProjectRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
  updateProjectRequestSchema
} from '@suno/shared';
import { clearAuthCookies, issueSession, requireUser, revokeRequestSession } from './auth.js';
import { readConfig } from './config.js';
import { prisma } from './prisma.js';
import { toProjectDto, toProjectPersistence } from './projectMapper.js';

const config = readConfig();

export function buildServer() {
  const app = Fastify({
    logger: true
  });

  app.register(cookie);
  app.register(cors, {
    origin: config.webOrigins,
    credentials: true
  });

  app.get('/api/health', async () => ({ ok: true }));

  app.post('/api/auth/register', async (request, reply) => {
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

  app.post('/api/auth/login', async (request, reply) => {
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
