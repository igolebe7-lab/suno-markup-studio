import type { AuthResponse, ProjectListResponse, ProjectResponse, SunoMarkupProject, UserResponse } from '@suno/shared';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...init.headers
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Request failed' })) as { message?: string };
    throw new Error(body.message ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  me: () => request<AuthResponse>('/api/auth/me'),
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  register: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  listProjects: () => request<ProjectListResponse>('/api/projects'),
  createProject: (project: SunoMarkupProject) =>
    request<ProjectResponse>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(project)
    }),
  updateProject: (project: SunoMarkupProject) =>
    request<ProjectResponse>(`/api/projects/${project.id}`, {
      method: 'PATCH',
      body: JSON.stringify(project)
    }),
  getProject: (id: string) => request<ProjectResponse>(`/api/projects/${id}`),
  deleteProject: (id: string) => request<{ ok: true }>(`/api/projects/${id}`, { method: 'DELETE' })
};

export type { UserResponse };
