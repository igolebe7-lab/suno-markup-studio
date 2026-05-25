import { z } from 'zod';

export const warningSeveritySchema = z.enum(['info', 'warning', 'error']);

export const validationWarningSchema = z.object({
  id: z.string(),
  severity: warningSeveritySchema,
  title: z.string(),
  message: z.string(),
  target: z.enum(['style', 'lyrics', 'project']),
  line: z.number().optional()
});

export const sunoMarkupProjectSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(160),
  stylePrompt: z.string(),
  lyrics: z.string(),
  styleChips: z.array(z.string()),
  selectedPresetId: z.string().optional(),
  tagsUsed: z.array(z.string()),
  warnings: z.array(validationWarningSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int().nonnegative()
});

export const registerRequestSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128)
});

export const loginRequestSchema = registerRequestSchema;

export const createProjectRequestSchema = sunoMarkupProjectSchema.partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  version: true
}).extend({
  title: z.string().min(1).max(160)
});

export const updateProjectRequestSchema = sunoMarkupProjectSchema.partial().extend({
  title: z.string().min(1).max(160).optional()
});

export const projectListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  updatedAt: z.string(),
  createdAt: z.string()
});

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string().email()
});

export type WarningSeverity = z.infer<typeof warningSeveritySchema>;
export type ValidationWarning = z.infer<typeof validationWarningSchema>;
export type SunoMarkupProject = z.infer<typeof sunoMarkupProjectSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;
export type ProjectListItem = z.infer<typeof projectListItemSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;

export type AuthResponse = {
  user: UserResponse;
};

export type ProjectResponse = {
  project: SunoMarkupProject;
};

export type ProjectListResponse = {
  projects: ProjectListItem[];
};
