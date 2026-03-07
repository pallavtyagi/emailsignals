import type { WorkspaceRole } from '../constants';

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  createdAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  createdAt: Date;
}

export interface Workspace {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  user: User;
  joinedAt: Date;
}

export interface AuthContext {
  userId: string;
  organizationId: string;
  workspaceId: string;
  role: WorkspaceRole;
}
