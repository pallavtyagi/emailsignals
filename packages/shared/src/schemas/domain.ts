import { z } from 'zod';

export const createDomainSchema = z.object({
  domain: z
    .string()
    .min(3)
    .max(253)
    .regex(
      /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
      'Invalid domain format',
    ),
});

export const verifyDomainSchema = z.object({
  domainId: z.string().uuid(),
});

export type CreateDomainInput = z.infer<typeof createDomainSchema>;
export type VerifyDomainInput = z.infer<typeof verifyDomainSchema>;
