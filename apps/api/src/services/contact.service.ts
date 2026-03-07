/**
 * Contact Management Service
 *
 * Full CRUD with duplicate detection on email, tag management, custom field
 * validation, suppression checking, and bulk operations.
 */

import { prisma } from '../db/client.js';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  BadRequestError,
} from '../lib/errors.js';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonValue = any;

// ── Types ────────────────────────────────────────────────────

export interface CreateContactParams {
  workspaceId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  tags?: string[];
  customFields?: Record<string, string | number | boolean | null>;
  listIds?: string[];
  consentSource?: string;
}

export interface UpdateContactParams {
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  tags?: string[];
  customFields?: Record<string, string | number | boolean | null>;
}

export interface ContactQueryParams {
  workspaceId: string;
  listId?: string;
  tag?: string;
  search?: string;
  status?: string;
  limit?: number;
  after?: string;
}

export interface BulkContactResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ email: string; error: string }>;
}

// ── Service ──────────────────────────────────────────────────

/**
 * Create a single contact with suppression check and duplicate handling.
 */
export async function createContact(params: CreateContactParams) {
  const { workspaceId, email } = params;

  // Check suppression list
  const suppressed = await prisma.suppression.findUnique({
    where: { workspaceId_email: { workspaceId, email } },
  });
  if (suppressed) {
    throw new ValidationError(
      `Email ${email} is suppressed: ${suppressed.reason}`,
    );
  }

  // Validate custom fields against workspace definitions
  if (params.customFields && Object.keys(params.customFields).length > 0) {
    await validateCustomFields(workspaceId, params.customFields);
  }

  // Upsert on email to handle duplicates
  const contact = await prisma.contact.upsert({
    where: { workspaceId_email: { workspaceId, email } },
    update: {
      firstName: params.firstName,
      lastName: params.lastName,
      company: params.company,
      phone: params.phone,
      tags: params.tags ?? [],
      customFields: (params.customFields ?? {}) as JsonValue,
    },
    create: {
      workspaceId,
      email,
      firstName: params.firstName,
      lastName: params.lastName,
      company: params.company,
      phone: params.phone,
      tags: params.tags ?? [],
      customFields: (params.customFields ?? {}) as JsonValue,
      consentSource: params.consentSource,
      consentedAt: params.consentSource ? new Date() : null,
    },
  });

  // Add to lists if specified
  if (params.listIds?.length) {
    // Verify lists belong to workspace
    const lists = await prisma.contactList.findMany({
      where: { id: { in: params.listIds }, workspaceId },
      select: { id: true },
    });
    const validListIds = new Set(lists.map((l: { id: string }) => l.id));

    const memberships = params.listIds
      .filter((id) => validListIds.has(id))
      .map((listId) => ({
        contactId: contact.id,
        listId,
      }));

    if (memberships.length > 0) {
      await prisma.contactListMembership.createMany({
        data: memberships,
        skipDuplicates: true,
      });
    }
  }

  return contact;
}

/**
 * Get a single contact by ID, scoped to workspace.
 */
export async function getContact(contactId: string, workspaceId: string) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, workspaceId },
    include: { listMemberships: { include: { list: true } } },
  });

  if (!contact) {
    throw new NotFoundError('Contact', contactId);
  }

  return contact;
}

/**
 * Update a contact with optional suppression check on email change.
 */
export async function updateContact(
  contactId: string,
  workspaceId: string,
  data: UpdateContactParams,
) {
  const existing = await prisma.contact.findFirst({
    where: { id: contactId, workspaceId },
  });

  if (!existing) {
    throw new NotFoundError('Contact', contactId);
  }

  // Validate custom fields if provided
  if (data.customFields && Object.keys(data.customFields).length > 0) {
    await validateCustomFields(workspaceId, data.customFields);
  }

  const contact = await prisma.contact.update({
    where: { id: contactId },
    data: {
      ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
      ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
      ...(data.company !== undefined ? { company: data.company } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.tags !== undefined ? { tags: data.tags } : {}),
      ...(data.customFields !== undefined
        ? { customFields: data.customFields as JsonValue }
        : {}),
    },
  });

  return contact;
}

/**
 * Delete a contact, scoped to workspace.
 */
export async function deleteContact(contactId: string, workspaceId: string) {
  const existing = await prisma.contact.findFirst({
    where: { id: contactId, workspaceId },
  });

  if (!existing) {
    throw new NotFoundError('Contact', contactId);
  }

  await prisma.contact.delete({ where: { id: contactId } });
}

/**
 * Query contacts with filtering, search, and cursor-based pagination.
 */
export async function queryContacts(params: ContactQueryParams) {
  const { workspaceId, limit = 50, after } = params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { workspaceId };

  if (params.status) {
    where.status = params.status.toUpperCase();
  }

  if (params.search) {
    where.OR = [
      { email: { contains: params.search, mode: 'insensitive' } },
      { firstName: { contains: params.search, mode: 'insensitive' } },
      { lastName: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  if (params.tag) {
    where.tags = { has: params.tag };
  }

  if (params.listId) {
    where.listMemberships = { some: { listId: params.listId } };
  }

  const contacts = await prisma.contact.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
    ...(after ? { cursor: { id: after }, skip: 1 } : {}),
  });

  const total = await prisma.contact.count({ where });

  return {
    data: contacts,
    total,
    nextCursor: contacts.length === limit ? contacts[contacts.length - 1]?.id : null,
  };
}

/**
 * Add tags to a contact (merge with existing tags).
 */
export async function addTags(contactId: string, workspaceId: string, tags: string[]) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, workspaceId },
  });

  if (!contact) {
    throw new NotFoundError('Contact', contactId);
  }

  const existingTags = new Set(contact.tags);
  for (const tag of tags) {
    existingTags.add(tag);
  }

  if (existingTags.size > 20) {
    throw new ValidationError('A contact can have at most 20 tags');
  }

  return prisma.contact.update({
    where: { id: contactId },
    data: { tags: Array.from(existingTags) },
  });
}

/**
 * Remove tags from a contact.
 */
export async function removeTags(contactId: string, workspaceId: string, tags: string[]) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, workspaceId },
  });

  if (!contact) {
    throw new NotFoundError('Contact', contactId);
  }

  const tagsToRemove = new Set(tags);
  const remainingTags = contact.tags.filter((t: string) => !tagsToRemove.has(t));

  return prisma.contact.update({
    where: { id: contactId },
    data: { tags: remainingTags },
  });
}

/**
 * Get contact activity (email events).
 */
export async function getContactActivity(contactId: string, workspaceId: string, limit = 50) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, workspaceId },
    select: { id: true },
  });

  if (!contact) {
    throw new NotFoundError('Contact', contactId);
  }

  const events = await prisma.emailEvent.findMany({
    where: { contactId },
    orderBy: { occurredAt: 'desc' },
    take: limit,
  });

  return { data: events };
}

/**
 * Bulk upsert contacts. Used by CSV import and batch API.
 */
export async function bulkUpsertContacts(
  workspaceId: string,
  contacts: CreateContactParams[],
  onDuplicate: 'update' | 'skip' = 'skip',
): Promise<BulkContactResult> {
  const result: BulkContactResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  // Get suppression list for workspace
  const suppressions = await prisma.suppression.findMany({
    where: { workspaceId },
    select: { email: true },
  });
  const suppressedEmails = new Set(suppressions.map((s: { email: string }) => s.email.toLowerCase()));

  // Process in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);

    for (const contactData of batch) {
      try {
        const email = contactData.email.toLowerCase();

        // Skip suppressed
        if (suppressedEmails.has(email)) {
          result.skipped++;
          continue;
        }

        const existing = await prisma.contact.findUnique({
          where: { workspaceId_email: { workspaceId, email } },
        });

        if (existing && onDuplicate === 'skip') {
          result.skipped++;
          continue;
        }

        if (existing && onDuplicate === 'update') {
          await prisma.contact.update({
            where: { id: existing.id },
            data: {
              firstName: contactData.firstName ?? existing.firstName,
              lastName: contactData.lastName ?? existing.lastName,
              company: contactData.company ?? existing.company,
              phone: contactData.phone ?? existing.phone,
              tags: contactData.tags ?? existing.tags,
              customFields: contactData.customFields
                ? (contactData.customFields as JsonValue)
                : existing.customFields,
            },
          });
          result.updated++;
        } else {
          await prisma.contact.create({
            data: {
              workspaceId,
              email,
              firstName: contactData.firstName,
              lastName: contactData.lastName,
              company: contactData.company,
              phone: contactData.phone,
              tags: contactData.tags ?? [],
              customFields: (contactData.customFields ?? {}) as JsonValue,
              consentSource: contactData.consentSource,
              consentedAt: contactData.consentSource ? new Date() : null,
            },
          });
          result.created++;
        }

        // Add to lists if specified
        if (contactData.listIds?.length) {
          const contact = await prisma.contact.findUnique({
            where: { workspaceId_email: { workspaceId, email } },
            select: { id: true },
          });
          if (contact) {
            await prisma.contactListMembership.createMany({
              data: contactData.listIds.map((listId) => ({
                contactId: contact.id,
                listId,
              })),
              skipDuplicates: true,
            });
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        result.errors.push({ email: contactData.email, error: msg });
      }
    }
  }

  return result;
}

// ── Internal Helpers ─────────────────────────────────────────

async function validateCustomFields(
  workspaceId: string,
  fields: Record<string, string | number | boolean | null>,
) {
  const definitions = await prisma.customFieldDefinition.findMany({
    where: { workspaceId },
  });

  const definedKeys = new Map(definitions.map((d: { key: string; type: string }) => [d.key, d.type]));

  for (const [key, value] of Object.entries(fields)) {
    const fieldType = definedKeys.get(key);

    if (!fieldType) {
      throw new ValidationError(
        `Unknown custom field '${key}'. Define it in workspace settings first.`,
      );
    }

    if (value === null) continue; // null is allowed for any type

    switch (fieldType) {
      case 'TEXT':
        if (typeof value !== 'string') {
          throw new ValidationError(`Custom field '${key}' expects a string value`);
        }
        break;
      case 'NUMBER':
        if (typeof value !== 'number') {
          throw new ValidationError(`Custom field '${key}' expects a number value`);
        }
        break;
      case 'BOOLEAN':
        if (typeof value !== 'boolean') {
          throw new ValidationError(`Custom field '${key}' expects a boolean value`);
        }
        break;
      case 'DATE':
        if (typeof value !== 'string' || isNaN(Date.parse(value))) {
          throw new ValidationError(
            `Custom field '${key}' expects a valid date string (ISO 8601)`,
          );
        }
        break;
    }
  }
}
