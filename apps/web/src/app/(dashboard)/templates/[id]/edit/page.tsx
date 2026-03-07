'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { TemplateEditor } from '../../template-editor';
import type { Template } from '@signalwave/shared';

export default function EditTemplatePage() {
  const params = useParams();
  const { getToken } = useAuth();
  const templateId = params.id as string;
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTemplate = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await api<{ data: Template }>(`/templates/${templateId}`, { token: token || undefined });
      setTemplate(data.data);
    } catch {
      setTemplate(null);
    } finally {
      setLoading(false);
    }
  }, [templateId, getToken]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Template not found.
      </div>
    );
  }

  return <TemplateEditor template={template} mode="edit" />;
}
