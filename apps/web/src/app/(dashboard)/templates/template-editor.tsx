'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import EmailEditor, { type EditorRef, type Editor } from 'react-email-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Save, Eye, Monitor, Smartphone, Loader2, Paintbrush, LayoutTemplate } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { TEMPLATE_CATEGORIES } from '@signalwave/shared';
import { starterTemplates, type StarterTemplate } from '@/lib/starter-templates';
import type { Template } from '@signalwave/shared';

const categoryLabels: Record<string, string> = {
  ecommerce: 'E-Commerce',
  saas: 'SaaS',
  newsletter: 'Newsletter',
  event: 'Event',
  announcement: 'Announcement',
  transactional: 'Transactional',
};

interface TemplateEditorProps {
  template?: Template;
  mode: 'create' | 'edit';
}

export function TemplateEditor({ template, mode }: TemplateEditorProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const emailEditorRef = useRef<EditorRef>(null);

  const [name, setName] = useState(template?.name || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [previewText, setPreviewText] = useState(template?.previewText || '');
  const [category, setCategory] = useState<string>(template?.category || '');
  const [saving, setSaving] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('editor');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [starterDialogOpen, setStarterDialogOpen] = useState(false);

  const onEditorReady = useCallback(
    (unlayer: Editor) => {
      setEditorReady(true);
      if (template?.editorJson) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        unlayer.loadDesign(template.editorJson as any);
      }
    },
    [template?.editorJson]
  );

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Name required', description: 'Please enter a template name.', variant: 'destructive' });
      return;
    }
    if (!subject.trim()) {
      toast({ title: 'Subject required', description: 'Please enter a subject line.', variant: 'destructive' });
      return;
    }

    const editor = emailEditorRef.current?.editor;
    if (!editor) {
      toast({ title: 'Editor not ready', description: 'Please wait for the editor to load.', variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);

      const { html, design } = await new Promise<{ html: string; design: Record<string, unknown> }>((resolve) => {
        editor.exportHtml((data: { html: string; design: Record<string, unknown> }) => {
          resolve({ html: data.html, design: data.design });
        });
      });

      const payload = {
        name: name.trim(),
        subject: subject.trim(),
        previewText: previewText.trim() || undefined,
        html,
        editorJson: design,
        category: category || undefined,
      };

      if (mode === 'edit' && template) {
        await api(`/templates/${template.id}`, {
          method: 'PUT',
          token: (await getToken()) || undefined,
          body: JSON.stringify(payload),
        });
        toast({ title: 'Template saved', description: 'Your changes have been saved.' });
      } else {
        await api('/templates', {
          method: 'POST',
          token: (await getToken()) || undefined,
          body: JSON.stringify(payload),
        });
        toast({ title: 'Template created', description: 'Your template has been created.' });
        router.push('/templates');
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save template.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewTab = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'preview') {
      const editor = emailEditorRef.current?.editor;
      if (editor) {
        editor.exportHtml((data: { html: string }) => {
          setPreviewHtml(data.html);
        });
      }
    }
  };

  const loadStarterTemplate = (starter: StarterTemplate) => {
    const editor = emailEditorRef.current?.editor;
    if (editor) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.loadDesign(starter.design as any);
    }
    if (!name) setName(starter.name);
    if (!subject) setSubject(starter.subject);
    if (!previewText) setPreviewText(starter.previewText);
    if (!category) setCategory(starter.category);
    setStarterDialogOpen(false);
    toast({ title: 'Template loaded', description: `"${starter.name}" template has been loaded into the editor.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/templates')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h1 className="text-xl font-semibold">
            {mode === 'edit' ? 'Edit Template' : 'New Template'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {mode === 'create' && (
            <Dialog open={starterDialogOpen} onOpenChange={setStarterDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={!editorReady}>
                  <LayoutTemplate className="mr-2 h-4 w-4" />
                  Start from Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Choose a Starter Template</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2 mt-4">
                  {starterTemplates.map((starter) => (
                    <button
                      key={starter.name}
                      className="text-left border rounded-lg p-4 hover:border-primary hover:bg-accent/50 transition-colors"
                      onClick={() => loadStarterTemplate(starter)}
                    >
                      <p className="font-medium text-sm">{starter.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{starter.subject}</p>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {categoryLabels[starter.category] || starter.category}
                      </Badge>
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Button onClick={handleSave} disabled={saving || !editorReady}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {mode === 'edit' ? 'Save Changes' : 'Create Template'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Settings Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Welcome Email"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  placeholder="e.g., Welcome to {{company}}"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preview-text">Preview Text</Label>
                <Input
                  id="preview-text"
                  placeholder="Text that appears after the subject..."
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {categoryLabels[cat] || cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Paintbrush className="h-4 w-4" />
                Merge Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Merge tags are available in the editor toolbar. Use the &quot;Merge Tags&quot; dropdown when editing text blocks to insert personalization fields.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  '{{first_name}}',
                  '{{last_name}}',
                  '{{email}}',
                  '{{company}}',
                  '{{unsubscribe_url}}',
                ].map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs font-mono">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Editor / Preview */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Tabs value={activeTab} onValueChange={handlePreviewTab}>
                  <TabsList>
                    <TabsTrigger value="editor">
                      <Paintbrush className="mr-2 h-4 w-4" />
                      Editor
                    </TabsTrigger>
                    <TabsTrigger value="preview">
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                {activeTab === 'preview' && (
                  <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                    <Button
                      variant={previewMode === 'desktop' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setPreviewMode('desktop')}
                    >
                      <Monitor className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={previewMode === 'mobile' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setPreviewMode('mobile')}
                    >
                      <Smartphone className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Editor Tab */}
              <div style={{ display: activeTab === 'editor' ? 'block' : 'none' }}>
                {!editorReady && (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-3 text-muted-foreground">Loading editor...</span>
                  </div>
                )}
                <EmailEditor
                  ref={emailEditorRef}
                  onReady={onEditorReady}
                  minHeight={600}
                  options={{
                    displayMode: 'email',
                    features: {
                      textEditor: {
                        spellChecker: true,
                      },
                    },
                    appearance: {
                      theme: 'modern_light',
                    },
                    mergeTags: {
                      first_name: { name: 'First Name', value: '{{first_name}}' },
                      last_name: { name: 'Last Name', value: '{{last_name}}' },
                      email: { name: 'Email', value: '{{email}}' },
                      company: { name: 'Company', value: '{{company}}' },
                      unsubscribe_url: { name: 'Unsubscribe Link', value: '{{unsubscribe_url}}' },
                    },
                  }}
                />
              </div>

              {/* Preview Tab */}
              {activeTab === 'preview' && (
                <div
                  className={`mx-auto border rounded-lg overflow-hidden bg-white transition-all ${
                    previewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-full'
                  }`}
                >
                  <div className="bg-muted px-3 py-2 border-b flex items-center justify-between">
                    <Badge variant="outline" className="text-xs font-mono">
                      {previewMode === 'mobile' ? '375px' : '100%'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {previewMode === 'desktop' ? 'Desktop' : 'Mobile'} Preview
                    </span>
                  </div>
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full border-0"
                    style={{ height: '600px' }}
                    title="Email Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
