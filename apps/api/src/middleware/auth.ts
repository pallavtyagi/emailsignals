/**
 * Clerk Authentication Middleware for Fastify.
 *
 * Verifies Clerk JWT tokens from the Authorization header, resolves the
 * workspace from the Clerk organization, and attaches auth context to every
 * request. Also exports a role-guard factory for route-level authorization.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { clerkPlugin, getAuth, clerkClient } from '@clerk/fastify';
import { prisma } from '../db/client.js';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';
import type { WorkspaceRole } from '@signalwave/shared';

// ── Types ────────────────────────────────────────────────────

export interface AuthContext {
  userId: string;
  orgId: string;
  workspaceId: string;
  role: WorkspaceRole;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext;
  }
}

// ── Role hierarchy (higher index = more permissions) ─────────

const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  analyst: 0,
  marketer: 1,
  admin: 2,
  owner: 3,
};

// ── Plugin ───────────────────────────────────────────────────

async function authPlugin(app: FastifyInstance) {
  // Register the official Clerk plugin which handles JWT verification
  await app.register(clerkPlugin, {
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY!,
    secretKey: process.env.CLERK_SECRET_KEY!,
  });

  if (!app.hasRequestDecorator('auth')) {
    app.decorateRequest('auth', null as unknown as AuthContext);
  }

  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for health check, webhooks (they have their own auth), and unsubscribe
    const url = request.url;
    if (
      url === '/health' ||
      url.startsWith('/v1/webhooks/ses') ||
      url.startsWith('/v1/billing/webhook') ||
      url.startsWith('/v1/unsubscribe/')
    ) {
      return;
    }

    try {
      const auth = getAuth(request);
      const userId = auth.userId;
      const orgId = auth.orgId;
      const orgRole = auth.orgRole;

      if (!userId) {
        throw new UnauthorizedError('Authentication required');
      }

      if (!orgId) {
        throw new UnauthorizedError('No organization selected. Please select a workspace.');
      }

      // Map Clerk org role to our workspace role
      const role = mapClerkRole(orgRole || undefined);

      // Look up or create workspace
      const workspace = await resolveWorkspace(orgId);

      request.auth = {
        userId,
        orgId,
        workspaceId: workspace.id,
        role,
      };
    } catch (err) {
      if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
        throw err;
      }
      request.log.error({ err }, 'Auth failed');
      throw new UnauthorizedError('Invalid or expired authentication token');
    }
  });
}

// ── Helpers ──────────────────────────────────────────────────

function mapClerkRole(clerkRole: string | undefined): WorkspaceRole {
  if (!clerkRole) return 'marketer';
  const normalized = clerkRole.replace('org:', '').toLowerCase();
  switch (normalized) {
    case 'admin':
    case 'owner':
      return normalized as WorkspaceRole;
    case 'member':
      return 'marketer';
    case 'analyst':
    case 'viewer':
      return 'analyst';
    default:
      return 'marketer';
  }
}

async function resolveWorkspace(clerkOrgId: string) {
  let workspace = await prisma.workspace.findUnique({
    where: { clerkOrgId },
  });

  if (!workspace) {
    // Fetch org info from Clerk to populate workspace
    try {
      const org = await clerkClient.organizations.getOrganization({ organizationId: clerkOrgId });
      workspace = await prisma.workspace.create({
        data: {
          clerkOrgId,
          name: org.name,
          slug: org.slug || clerkOrgId,
        },
      });
    } catch {
      // If Clerk fetch fails, create with minimal data
      workspace = await prisma.workspace.create({
        data: {
          clerkOrgId,
          name: 'My Workspace',
          slug: `ws-${clerkOrgId.slice(0, 8)}`,
        },
      });
    }
  }

  return workspace;
}

// ── Role Guard Factory ───────────────────────────────────────

/**
 * Creates a Fastify preHandler hook that enforces a minimum role level.
 *
 * Usage:
 * ```ts
 * app.post('/admin-action', { preHandler: [requireRole('admin')] }, handler);
 * ```
 */
export function requireRole(minimumRole: WorkspaceRole) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.auth) {
      throw new UnauthorizedError('Authentication required');
    }

    const userLevel = ROLE_HIERARCHY[request.auth.role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? 0;

    if (userLevel < requiredLevel) {
      throw new ForbiddenError(
        `This action requires at least '${minimumRole}' role. Your role: '${request.auth.role}'.`,
      );
    }
  };
}

export default fp(authPlugin, {
  name: 'auth',
  fastify: '5.x',
});
