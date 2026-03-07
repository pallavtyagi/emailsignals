import type { TemplateCategory } from '../constants';

export interface Template {
  id: string;
  workspaceId: string;
  name: string;
  category: TemplateCategory | null;
  subject: string;
  previewText: string | null;
  html: string;
  text: string | null;
  editorJson: Record<string, unknown> | null; // Unlayer design JSON
  thumbnailUrl: string | null;
  isStarter: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTemplateRequest {
  workspaceId: string;
  name: string;
  subject: string;
  previewText?: string;
  html: string;
  text?: string;
  editorJson?: Record<string, unknown>;
  category?: TemplateCategory;
}
