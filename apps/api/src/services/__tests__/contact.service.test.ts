import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../db/client.js';
import {
  createContact,
  getContact,
  updateContact,
  deleteContact,
  queryContacts,
  addTags,
  removeTags,
  bulkUpsertContacts,
} from '../contact.service.js';
import { createMockContact } from '../../__tests__/helpers.js';

const mockPrisma = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ── createContact ───────────────────────────────────────────

describe('createContact', () => {
  const params = {
    workspaceId: 'ws_test123',
    email: 'new@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
  };

  it('should create a new contact', async () => {
    mockPrisma.suppression.findUnique.mockResolvedValue(null);
    mockPrisma.contact.upsert.mockResolvedValue(
      createMockContact({ email: 'new@example.com', firstName: 'Jane' }),
    );

    const result = await createContact(params);
    expect(result.email).toBe('new@example.com');
    expect(result.firstName).toBe('Jane');
    expect(mockPrisma.contact.upsert).toHaveBeenCalledOnce();
  });

  it('should throw ValidationError when email is suppressed', async () => {
    mockPrisma.suppression.findUnique.mockResolvedValue({
      email: 'new@example.com',
      reason: 'BOUNCE_HARD',
    });

    await expect(createContact(params)).rejects.toThrow(/suppressed/i);
  });

  it('should validate custom fields if provided', async () => {
    mockPrisma.suppression.findUnique.mockResolvedValue(null);
    mockPrisma.customFieldDefinition.findMany.mockResolvedValue([]);

    await expect(
      createContact({
        ...params,
        customFields: { unknownField: 'value' },
      }),
    ).rejects.toThrow(/Unknown custom field/i);
  });

  it('should add contact to lists when listIds are provided', async () => {
    mockPrisma.suppression.findUnique.mockResolvedValue(null);
    mockPrisma.contact.upsert.mockResolvedValue(
      createMockContact({ id: 'ct_new' }),
    );
    mockPrisma.contactList.findMany.mockResolvedValue([{ id: 'lst_1' }]);
    mockPrisma.contactListMembership.createMany.mockResolvedValue({ count: 1 });

    await createContact({ ...params, listIds: ['lst_1'] });

    expect(mockPrisma.contactListMembership.createMany).toHaveBeenCalledWith({
      data: [{ contactId: 'ct_new', listId: 'lst_1' }],
      skipDuplicates: true,
    });
  });
});

// ── updateContact ───────────────────────────────────────────

describe('updateContact', () => {
  it('should update an existing contact', async () => {
    mockPrisma.contact.findFirst.mockResolvedValue(createMockContact());
    mockPrisma.contact.update.mockResolvedValue(
      createMockContact({ firstName: 'Updated' }),
    );

    const result = await updateContact('ct_test123', 'ws_test123', {
      firstName: 'Updated',
    });
    expect(result.firstName).toBe('Updated');
  });

  it('should throw NotFoundError when contact not found', async () => {
    mockPrisma.contact.findFirst.mockResolvedValue(null);

    await expect(
      updateContact('nonexistent', 'ws_test123', { firstName: 'X' }),
    ).rejects.toThrow(/not found/i);
  });

  it('should validate custom fields on update', async () => {
    mockPrisma.contact.findFirst.mockResolvedValue(createMockContact());
    mockPrisma.customFieldDefinition.findMany.mockResolvedValue([
      { key: 'age', type: 'NUMBER' },
    ]);

    await expect(
      updateContact('ct_test123', 'ws_test123', {
        customFields: { age: 'not-a-number' as any },
      }),
    ).rejects.toThrow(/expects a number/i);
  });
});

// ── queryContacts ───────────────────────────────────────────

describe('queryContacts', () => {
  it('should return paginated contacts', async () => {
    const contacts = [createMockContact(), createMockContact({ id: 'ct_2' })];
    mockPrisma.contact.findMany.mockResolvedValue(contacts);
    mockPrisma.contact.count.mockResolvedValue(2);

    const result = await queryContacts({ workspaceId: 'ws_test123' });
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('should apply search filter', async () => {
    mockPrisma.contact.findMany.mockResolvedValue([]);
    mockPrisma.contact.count.mockResolvedValue(0);

    await queryContacts({ workspaceId: 'ws_test123', search: 'john' });

    const findManyCall = mockPrisma.contact.findMany.mock.calls[0][0];
    expect(findManyCall.where.OR).toBeDefined();
    expect(findManyCall.where.OR).toHaveLength(3);
  });

  it('should apply tag filter', async () => {
    mockPrisma.contact.findMany.mockResolvedValue([]);
    mockPrisma.contact.count.mockResolvedValue(0);

    await queryContacts({ workspaceId: 'ws_test123', tag: 'vip' });

    const findManyCall = mockPrisma.contact.findMany.mock.calls[0][0];
    expect(findManyCall.where.tags).toEqual({ has: 'vip' });
  });

  it('should apply status filter', async () => {
    mockPrisma.contact.findMany.mockResolvedValue([]);
    mockPrisma.contact.count.mockResolvedValue(0);

    await queryContacts({ workspaceId: 'ws_test123', status: 'subscribed' });

    const findManyCall = mockPrisma.contact.findMany.mock.calls[0][0];
    expect(findManyCall.where.status).toBe('SUBSCRIBED');
  });
});

// ── deleteContact ───────────────────────────────────────────

describe('deleteContact', () => {
  it('should delete an existing contact', async () => {
    mockPrisma.contact.findFirst.mockResolvedValue(createMockContact());
    mockPrisma.contact.delete.mockResolvedValue(createMockContact());

    await deleteContact('ct_test123', 'ws_test123');
    expect(mockPrisma.contact.delete).toHaveBeenCalledWith({
      where: { id: 'ct_test123' },
    });
  });

  it('should throw NotFoundError when contact not found', async () => {
    mockPrisma.contact.findFirst.mockResolvedValue(null);

    await expect(
      deleteContact('nonexistent', 'ws_test123'),
    ).rejects.toThrow(/not found/i);
  });
});

// ── addTags / removeTags ────────────────────────────────────

describe('addTags', () => {
  it('should add tags to a contact', async () => {
    const contact = createMockContact({ tags: ['existing'] });
    mockPrisma.contact.findFirst.mockResolvedValue(contact);
    mockPrisma.contact.update.mockResolvedValue(
      createMockContact({ tags: ['existing', 'new-tag'] }),
    );

    const result = await addTags('ct_test123', 'ws_test123', ['new-tag']);
    expect(result.tags).toContain('new-tag');
  });

  it('should throw ValidationError when exceeding 20 tags', async () => {
    const tags = Array.from({ length: 20 }, (_, i) => `tag${i}`);
    const contact = createMockContact({ tags });
    mockPrisma.contact.findFirst.mockResolvedValue(contact);

    await expect(
      addTags('ct_test123', 'ws_test123', ['one-more']),
    ).rejects.toThrow(/at most 20/i);
  });
});

describe('removeTags', () => {
  it('should remove specified tags', async () => {
    const contact = createMockContact({ tags: ['a', 'b', 'c'] });
    mockPrisma.contact.findFirst.mockResolvedValue(contact);
    mockPrisma.contact.update.mockResolvedValue(
      createMockContact({ tags: ['a', 'c'] }),
    );

    const result = await removeTags('ct_test123', 'ws_test123', ['b']);
    expect(result.tags).not.toContain('b');
  });
});

// ── bulkUpsertContacts ──────────────────────────────────────

describe('bulkUpsertContacts', () => {
  it('should create new contacts and skip suppressed ones', async () => {
    mockPrisma.suppression.findMany.mockResolvedValue([
      { email: 'suppressed@example.com' },
    ]);
    mockPrisma.contact.findUnique.mockResolvedValue(null); // no existing
    mockPrisma.contact.create.mockResolvedValue(createMockContact());

    const contacts = [
      { workspaceId: 'ws_test123', email: 'new@example.com' },
      { workspaceId: 'ws_test123', email: 'suppressed@example.com' },
    ];

    const result = await bulkUpsertContacts('ws_test123', contacts);
    expect(result.created).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('should skip duplicates when onDuplicate is skip', async () => {
    mockPrisma.suppression.findMany.mockResolvedValue([]);
    mockPrisma.contact.findUnique.mockResolvedValue(createMockContact());

    const contacts = [
      { workspaceId: 'ws_test123', email: 'existing@example.com' },
    ];

    const result = await bulkUpsertContacts('ws_test123', contacts, 'skip');
    expect(result.skipped).toBe(1);
    expect(result.created).toBe(0);
  });

  it('should update duplicates when onDuplicate is update', async () => {
    mockPrisma.suppression.findMany.mockResolvedValue([]);
    mockPrisma.contact.findUnique.mockResolvedValue(
      createMockContact({ id: 'ct_existing' }),
    );
    mockPrisma.contact.update.mockResolvedValue(createMockContact());

    const contacts = [
      {
        workspaceId: 'ws_test123',
        email: 'existing@example.com',
        firstName: 'Updated',
      },
    ];

    const result = await bulkUpsertContacts('ws_test123', contacts, 'update');
    expect(result.updated).toBe(1);
    expect(result.created).toBe(0);
  });
});
