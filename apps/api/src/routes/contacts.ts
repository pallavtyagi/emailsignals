import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';
import {
  createContactSchema,
  updateContactSchema,
  contactQuerySchema,
  createListSchema,
} from '@signalwave/shared';
import { requireRole } from '../middleware/auth.js';
import * as contactService from '../services/contact.service.js';
import { csvImportQueue, type CsvImportJobData } from '../queues/index.js';

export async function contactRoutes(app: FastifyInstance) {
  // GET /v1/contacts
  app.get('/', async (request) => {
    const { workspaceId } = request.auth;
    const query = contactQuerySchema.parse(request.query);

    const result = await contactService.queryContacts({
      workspaceId,
      listId: query.listId,
      tag: query.tag,
      search: query.search,
      status: query.status,
      limit: query.limit,
      after: query.after,
    });

    return result;
  });

  // POST /v1/contacts
  app.post('/', async (request, reply) => {
    const { workspaceId } = request.auth;
    const body = request.body as Record<string, unknown>;

    const parsed = createContactSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(422).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }

    const contact = await contactService.createContact({
      workspaceId,
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      company: parsed.data.company,
      phone: parsed.data.phone,
      tags: parsed.data.tags,
      customFields: parsed.data.customFields,
      listIds: parsed.data.listIds,
      consentSource: parsed.data.consentSource,
    });

    return reply.status(201).send(contact);
  });

  // GET /v1/contacts/:id
  app.get('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const { workspaceId } = request.auth;

    const contact = await contactService.getContact(id, workspaceId);
    return contact;
  });

  // PATCH /v1/contacts/:id
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { workspaceId } = request.auth;

    const parsed = updateContactSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() },
      });
    }

    const contact = await contactService.updateContact(id, workspaceId, parsed.data);
    return contact;
  });

  // DELETE /v1/contacts/:id
  app.delete(
    '/:id',
    { preHandler: [requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { workspaceId } = request.auth;

      await contactService.deleteContact(id, workspaceId);
      return reply.status(204).send();
    },
  );

  // GET /v1/contacts/:id/activity
  app.get('/:id/activity', async (request) => {
    const { id } = request.params as { id: string };
    const { workspaceId } = request.auth;

    const activity = await contactService.getContactActivity(id, workspaceId);
    return activity;
  });

  // POST /v1/contacts/:id/tags
  app.post('/:id/tags', async (request) => {
    const { id } = request.params as { id: string };
    const { workspaceId } = request.auth;
    const { tags } = request.body as { tags: string[] };

    const contact = await contactService.addTags(id, workspaceId, tags || []);
    return contact;
  });

  // DELETE /v1/contacts/:id/tags
  app.delete('/:id/tags', async (request) => {
    const { id } = request.params as { id: string };
    const { workspaceId } = request.auth;
    const { tags } = request.body as { tags: string[] };

    const contact = await contactService.removeTags(id, workspaceId, tags || []);
    return contact;
  });

  // POST /v1/contacts/import — CSV import with multipart file upload
  app.post(
    '/import',
    { preHandler: [requireRole('marketer')] },
    async (request, reply) => {
      const { workspaceId } = request.auth;

      // Handle multipart form data
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          error: { code: 'MISSING_FILE', message: 'CSV file is required' },
        });
      }

      // Read file content
      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);

      // Validate file size (max 10MB)
      if (fileBuffer.length > 10 * 1024 * 1024) {
        return reply.status(400).send({
          error: { code: 'FILE_TOO_LARGE', message: 'CSV file must be under 10MB' },
        });
      }

      // Parse field mapping from form fields
      const fields = data.fields;
      let fieldMapping: Array<{ csvColumn: string; contactField: string }> = [];
      let listIds: string[] | undefined;
      let onDuplicate: 'update' | 'skip' = 'skip';

      if (fields) {
        const mappingField = fields['fieldMapping'];
        if (mappingField && 'value' in mappingField) {
          try {
            fieldMapping = JSON.parse(mappingField.value as string);
          } catch {
            return reply.status(400).send({
              error: { code: 'INVALID_MAPPING', message: 'fieldMapping must be valid JSON' },
            });
          }
        }

        const listIdsField = fields['listIds'];
        if (listIdsField && 'value' in listIdsField) {
          try {
            listIds = JSON.parse(listIdsField.value as string);
          } catch {
            // ignore
          }
        }

        const onDuplicateField = fields['onDuplicate'];
        if (onDuplicateField && 'value' in onDuplicateField) {
          const val = onDuplicateField.value as string;
          if (val === 'update' || val === 'skip') {
            onDuplicate = val;
          }
        }
      }

      // Create import job record
      const importJob = await prisma.importJob.create({
        data: {
          workspaceId,
          status: 'QUEUED',
        },
      });

      // Enqueue CSV import job
      const jobData: CsvImportJobData = {
        importJobId: importJob.id,
        workspaceId,
        fileContent: fileBuffer.toString('base64'),
        fieldMapping,
        listIds,
        onDuplicate,
      };

      await csvImportQueue.add('import', jobData, {
        jobId: `csv-import-${importJob.id}`,
      });

      return reply.status(202).send({
        importJobId: importJob.id,
        status: 'queued',
        message: 'CSV import has been queued for processing',
      });
    },
  );

  // GET /v1/contacts/import/:id — Check import job status
  app.get('/import/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { workspaceId } = request.auth;

    const importJob = await prisma.importJob.findFirst({
      where: { id, workspaceId },
    });

    if (!importJob) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Import job not found' } });
    }

    return importJob;
  });

  // ─── Lists ─────────────────────────────────────

  // GET /v1/contacts/lists
  app.get('/lists', async (request) => {
    const { workspaceId } = request.auth;

    const lists = await prisma.contactList.findMany({
      where: { workspaceId },
      include: { _count: { select: { memberships: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: lists.map((l) => ({
        ...l,
        contactCount: l._count.memberships,
      })),
    };
  });

  // POST /v1/contacts/lists
  app.post('/lists', async (request, reply) => {
    const { workspaceId } = request.auth;
    const body = request.body as Record<string, unknown>;

    const parsed = createListSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(422).send({
        error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      });
    }

    const list = await prisma.contactList.create({
      data: { workspaceId, ...parsed.data },
    });

    return reply.status(201).send({ ...list, contactCount: 0 });
  });

  // DELETE /v1/contacts/lists/:id
  app.delete(
    '/lists/:id',
    { preHandler: [requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { workspaceId } = request.auth;

      const list = await prisma.contactList.findFirst({
        where: { id, workspaceId },
      });

      if (!list) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'List not found' } });
      }

      await prisma.contactList.delete({ where: { id } });
      return reply.status(204).send();
    },
  );

  // POST /v1/contacts/lists/:id/contacts — Add contacts to list
  app.post('/lists/:id/contacts', async (request, reply) => {
    const { id: listId } = request.params as { id: string };
    const { workspaceId } = request.auth;
    const { contactIds } = request.body as { contactIds?: string[] };

    const list = await prisma.contactList.findFirst({
      where: { id: listId, workspaceId },
    });

    if (!list) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'List not found' } });
    }

    if (!contactIds?.length) {
      return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'contactIds required' } });
    }

    // Verify contacts belong to workspace
    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds }, workspaceId },
      select: { id: true },
    });

    const validIds = contacts.map((c) => c.id);

    await prisma.contactListMembership.createMany({
      data: validIds.map((contactId) => ({
        contactId,
        listId,
      })),
      skipDuplicates: true,
    });

    return { added: validIds.length };
  });

  // DELETE /v1/contacts/lists/:id/contacts — Remove contacts from list
  app.delete('/lists/:id/contacts', async (request, reply) => {
    const { id: listId } = request.params as { id: string };
    const { workspaceId } = request.auth;
    const { contactIds } = request.body as { contactIds?: string[] };

    const list = await prisma.contactList.findFirst({
      where: { id: listId, workspaceId },
    });

    if (!list) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'List not found' } });
    }

    if (!contactIds?.length) {
      return reply.status(400).send({ error: { code: 'BAD_REQUEST', message: 'contactIds required' } });
    }

    await prisma.contactListMembership.deleteMany({
      where: { listId, contactId: { in: contactIds } },
    });

    return { removed: contactIds.length };
  });
}
