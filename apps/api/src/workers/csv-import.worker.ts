/**
 * CSV Import Worker
 *
 * BullMQ worker that processes CSV file imports. Parses CSV content,
 * maps columns to contact fields based on user-provided mapping,
 * validates each row, and upserts contacts in batches of 100.
 */

import { Worker, type Job } from 'bullmq';
import { parse } from 'csv-parse/sync';
import { prisma } from '../db/client.js';
import { bulkUpsertContacts, type CreateContactParams } from '../services/contact.service.js';
import {
  redisConnection,
  QUEUE_NAMES,
  type CsvImportJobData,
} from '../queues/index.js';

// ── Constants ────────────────────────────────────────────────

const KNOWN_CONTACT_FIELDS = new Set([
  'email',
  'firstName',
  'lastName',
  'company',
  'phone',
  'consentSource',
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Worker Logic ─────────────────────────────────────────────

async function processCsvImport(job: Job<CsvImportJobData>) {
  const { importJobId, workspaceId, fileContent, fieldMapping, listIds, onDuplicate } = job.data;

  // Mark import as processing
  await prisma.importJob.update({
    where: { id: importJobId },
    data: { status: 'PROCESSING' },
  });

  let totalRows = 0;
  let processed = 0;
  let failed = 0;
  const errors: Array<{ row: number; email: string; error: string }> = [];

  try {
    // Decode base64 CSV content
    const csvString = Buffer.from(fileContent, 'base64').toString('utf-8');

    // Parse CSV
    const records: Record<string, string>[] = parse(csvString, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    totalRows = records.length;

    // Update total submitted
    await prisma.importJob.update({
      where: { id: importJobId },
      data: { totalSubmitted: totalRows },
    });

    // Build a lookup from CSV column name to contact field name
    const columnMap = new Map<string, string>();
    for (const mapping of fieldMapping) {
      columnMap.set(mapping.csvColumn, mapping.contactField);
    }

    // Transform rows to contact params
    const BATCH_SIZE = 100;
    for (let batchStart = 0; batchStart < records.length; batchStart += BATCH_SIZE) {
      const batch = records.slice(batchStart, batchStart + BATCH_SIZE);
      const contacts: CreateContactParams[] = [];

      for (let i = 0; i < batch.length; i++) {
        const row = batch[i];
        const rowIndex = batchStart + i + 2; // +2 for 1-indexed + header row

        try {
          const mapped = mapRowToContact(row, columnMap, workspaceId, listIds);

          // Validate email
          if (!mapped.email || !EMAIL_REGEX.test(mapped.email)) {
            errors.push({
              row: rowIndex,
              email: mapped.email || '',
              error: 'Invalid or missing email address',
            });
            failed++;
            continue;
          }

          contacts.push(mapped);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          errors.push({
            row: rowIndex,
            email: row[getEmailColumn(columnMap)] || '',
            error: msg,
          });
          failed++;
        }
      }

      // Bulk upsert the batch
      if (contacts.length > 0) {
        const result = await bulkUpsertContacts(workspaceId, contacts, onDuplicate);
        processed += result.created + result.updated + result.skipped;
        failed += result.errors.length;

        for (const e of result.errors) {
          errors.push({
            row: 0, // Row number not tracked in bulk upsert
            email: e.email,
            error: e.error,
          });
        }
      }

      // Update progress
      await prisma.importJob.update({
        where: { id: importJobId },
        data: {
          processed: processed + failed,
          failed,
          errors: errors.slice(0, 1000) as unknown as Parameters<typeof prisma.importJob.update>[0]['data']['errors'], // Cap stored errors at 1000
        },
      });

      // Report progress to BullMQ
      await job.updateProgress(Math.round(((batchStart + batch.length) / totalRows) * 100));
    }

    // Mark as completed
    await prisma.importJob.update({
      where: { id: importJobId },
      data: {
        status: 'COMPLETED',
        processed,
        failed,
        errors: errors.slice(0, 1000) as unknown as Parameters<typeof prisma.importJob.update>[0]['data']['errors'],
        completedAt: new Date(),
      },
    });

    return {
      status: 'completed',
      totalRows,
      processed,
      failed,
      errorCount: errors.length,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[csv-import] Import job ${importJobId} failed:`, msg);

    await prisma.importJob.update({
      where: { id: importJobId },
      data: {
        status: 'FAILED',
        processed,
        failed,
        errors: [{ row: 0, email: '', error: `Import failed: ${msg}` }] as unknown as Parameters<typeof prisma.importJob.update>[0]['data']['errors'],
        completedAt: new Date(),
      },
    });

    throw err;
  }
}

// ── Helpers ──────────────────────────────────────────────────

function mapRowToContact(
  row: Record<string, string>,
  columnMap: Map<string, string>,
  workspaceId: string,
  listIds?: string[],
): CreateContactParams {
  const contact: CreateContactParams = {
    workspaceId,
    email: '',
    listIds,
  };

  const customFields: Record<string, string | number | boolean | null> = {};

  for (const [csvColumn, contactField] of columnMap.entries()) {
    const value = row[csvColumn]?.trim();
    if (!value) continue;

    if (KNOWN_CONTACT_FIELDS.has(contactField)) {
      // Standard field
      switch (contactField) {
        case 'email':
          contact.email = value.toLowerCase();
          break;
        case 'firstName':
          contact.firstName = value;
          break;
        case 'lastName':
          contact.lastName = value;
          break;
        case 'company':
          contact.company = value;
          break;
        case 'phone':
          contact.phone = value;
          break;
        case 'consentSource':
          contact.consentSource = value;
          break;
      }
    } else if (contactField.startsWith('tags')) {
      // Tags are comma-separated in CSV
      contact.tags = value.split(',').map((t) => t.trim()).filter(Boolean);
    } else {
      // Custom field
      customFields[contactField] = value;
    }
  }

  if (Object.keys(customFields).length > 0) {
    contact.customFields = customFields;
  }

  return contact;
}

function getEmailColumn(columnMap: Map<string, string>): string {
  for (const [csvCol, field] of columnMap.entries()) {
    if (field === 'email') return csvCol;
  }
  return 'email';
}

// ── Worker Factory ───────────────────────────────────────────

export function createCsvImportWorker() {
  const worker = new Worker<CsvImportJobData>(
    QUEUE_NAMES.CSV_IMPORT,
    processCsvImport,
    {
      connection: redisConnection,
      concurrency: 3,
    },
  );

  worker.on('completed', (job, result) => {
    console.log(
      `[csv-import] Job ${job.id} completed:`,
      result,
    );
  });

  worker.on('failed', (job, err) => {
    console.error(`[csv-import] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
