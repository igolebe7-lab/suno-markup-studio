import { z } from 'zod';

export const warningSeveritySchema = z.enum(['info', 'warning', 'error']);
export const tagPlacementSchema = z.enum(['style', 'lyrics', 'both']);
export const tagConfidenceSchema = z.enum(['official', 'common', 'experimental']);
export const tagParameterTypeSchema = z.enum(['select', 'multi-select', 'number', 'text', 'slider']);

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

export const tagParameterSchema = z.object({
  key: z.string().min(1).max(80).regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/),
  label: z.string().min(1).max(120),
  type: tagParameterTypeSchema,
  options: z.array(z.string().min(1).max(80)).max(40).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  defaultValue: z.union([z.string(), z.number(), z.array(z.string())]).optional()
});

export const customTagSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(80),
  sunoText: z.string().min(1).max(120),
  category: z.literal('custom'),
  placement: tagPlacementSchema,
  confidence: tagConfidenceSchema.default('experimental'),
  aliases: z.array(z.string().min(1).max(80)).max(24),
  descriptionRu: z.string().min(1).max(700),
  descriptionEn: z.string().max(700).optional(),
  compatibleGenres: z.array(z.string()).optional(),
  incompatibleWith: z.array(z.string()).optional(),
  parameters: z.array(tagParameterSchema).max(24),
  examples: z.array(z.string().min(1).max(160)).max(20),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const customTagRequestSchema = customTagSchema.omit({
  id: true,
  category: true,
  confidence: true,
  createdAt: true,
  updatedAt: true
}).extend({
  id: z.string().optional(),
  category: z.literal('custom').optional(),
  confidence: tagConfidenceSchema.optional()
});

export const updateCustomTagRequestSchema = customTagRequestSchema.partial();

export type WarningSeverity = z.infer<typeof warningSeveritySchema>;
export type ValidationWarning = z.infer<typeof validationWarningSchema>;
export type SunoMarkupProject = z.infer<typeof sunoMarkupProjectSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;
export type ProjectListItem = z.infer<typeof projectListItemSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type TagPlacement = z.infer<typeof tagPlacementSchema>;
export type TagConfidence = z.infer<typeof tagConfidenceSchema>;
export type TagParameter = z.infer<typeof tagParameterSchema>;
export type CustomTag = z.infer<typeof customTagSchema>;
export type CustomTagRequest = z.infer<typeof customTagRequestSchema>;
export type UpdateCustomTagRequest = z.infer<typeof updateCustomTagRequestSchema>;

export type AuthResponse = {
  user: UserResponse;
};

export type ProjectResponse = {
  project: SunoMarkupProject;
};

export type ProjectListResponse = {
  projects: ProjectListItem[];
};

export type CustomTagResponse = {
  tag: CustomTag;
};

export type CustomTagListResponse = {
  tags: CustomTag[];
};
