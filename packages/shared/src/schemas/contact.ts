import { z } from 'zod';
import { MAX_CSV_IMPORT_SIZE } from '../constants';

export const createContactSchema = z.object({
  email: z.string().email(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  company: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  customFields: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  listIds: z.array(z.string().uuid()).optional(),
  consentSource: z.string().max(200).optional(),
});

export const updateContactSchema = createContactSchema
  .omit({ email: true })
  .partial();

export const batchImportContactsSchema = z.object({
  contacts: z.array(createContactSchema).max(MAX_CSV_IMPORT_SIZE),
  listIds: z.array(z.string().uuid()).optional(),
  onDuplicate: z.enum(['update', 'skip']).default('skip'),
});

export const contactQuerySchema = z.object({
  listId: z.string().uuid().optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['subscribed', 'unsubscribed', 'bounced', 'complained']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  after: z.string().optional(),
});

export const createListSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const addContactsToListSchema = z.object({
  contactIds: z.array(z.string().uuid()).optional(),
  emails: z.array(z.string().email()).optional(),
});

export const csvFieldMappingSchema = z.object({
  csvColumn: z.string(),
  contactField: z.string(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type BatchImportInput = z.infer<typeof batchImportContactsSchema>;
export type ContactQueryInput = z.infer<typeof contactQuerySchema>;
export type CreateListInput = z.infer<typeof createListSchema>;
