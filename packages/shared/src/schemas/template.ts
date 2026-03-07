import { z } from 'zod';
import { TEMPLATE_CATEGORIES } from '../constants';

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  previewText: z.string().max(200).optional(),
  html: z.string().min(1),
  text: z.string().optional(),
  editorJson: z.record(z.unknown()).optional(),
  category: z.enum(TEMPLATE_CATEGORIES).optional(),
});

export const updateTemplateSchema = createTemplateSchema.partial();

export const templateQuerySchema = z.object({
  category: z.enum(TEMPLATE_CATEGORIES).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  after: z.string().optional(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type TemplateQueryInput = z.infer<typeof templateQuerySchema>;
