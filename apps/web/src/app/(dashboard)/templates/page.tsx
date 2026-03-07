'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Plus,
  Search,
  Loader2,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Eye,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { Template } from '@signalwave/shared';
import { TEMPLATE_CATEGORIES } from '@signalwave/shared';

const categoryLabels: Record<string, string> = {
  ecommerce: 'E-Commerce',
  saas: 'SaaS',
  newsletter: 'Newsletter',
  event: 'Event',
  announcement: 'Announcement',
  transactional: 'Transactional',
};

export default function TemplatesPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const data = await api<{ data: Template[] }>('/templates', { token: token || undefined });
      setTemplates(data.data || []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDelete = async (id: string) => {
    try {
      const token = await getToken();
      await api(`/templates/${id}`, { method: 'DELETE', token: token || undefined });
      toast({ title: 'Template deleted', description: 'The template has been removed.' });
      fetchTemplates();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete template.', variant: 'destructive' });
    }
  };

  const handleDuplicate = async (template: Template) => {
    try {
      const token = await getToken();
      await api('/templates', {
        method: 'POST',
        token: token || undefined,
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          subject: template.subject,
          previewText: template.previewText,
          html: template.html,
          text: template.text,
          category: template.category,
        }),
      });
      toast({ title: 'Template duplicated', description: 'A copy of the template has been created.' });
      fetchTemplates();
    } catch {
      toast({ title: 'Error', description: 'Failed to duplicate template.', variant: 'destructive' });
    }
  };

  const filteredTemplates = templates.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">Create and manage your email templates.</p>
        </div>
        <Link href="/templates/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {TEMPLATE_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {categoryLabels[cat] || cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : filteredTemplates.length === 0 && !search && categoryFilter === 'all' ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No templates yet</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              Create your first email template to use in campaigns.
            </p>
            <Link href="/templates/new">
              <Button>Create Template</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="group relative overflow-hidden">
              {/* Thumbnail / Preview */}
              <div className="aspect-[4/3] bg-muted relative overflow-hidden border-b">
                {template.thumbnailUrl ? (
                  <img
                    src={template.thumbnailUrl}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No preview</p>
                    </div>
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Link href={`/templates/${template.id}/edit`}>
                    <Button size="sm" variant="secondary">
                      <Edit className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </Link>
                </div>
              </div>

              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{template.name}</h3>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{template.subject}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {template.category && (
                        <Badge variant="secondary" className="text-xs">
                          {categoryLabels[template.category] || template.category}
                        </Badge>
                      )}
                      {template.isStarter && (
                        <Badge variant="outline" className="text-xs">Starter</Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/templates/${template.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Template
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(template.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredTemplates.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No templates match your search.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
