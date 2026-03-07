'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Eye, Monitor, Smartphone, Loader2, Code, Braces } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { TEMPLATE_CATEGORIES } from '@signalwave/shared';
import type { Template } from '@signalwave/shared';

const categoryLabels: Record<string, string> = {
  ecommerce: 'E-Commerce',
  saas: 'SaaS',
  newsletter: 'Newsletter',
  event: 'Event',
  announcement: 'Announcement',
  transactional: 'Transactional',
};

const mergeTags = [
  { label: 'First Name', tag: '{{first_name}}' },
  { label: 'Last Name', tag: '{{last_name}}' },
  { label: 'Email', tag: '{{email}}' },
  { label: 'Company', tag: '{{company}}' },
  { label: 'Unsubscribe Link', tag: '{{unsubscribe_url}}' },
];

interface TemplateEditorProps {
  template?: Template;
  mode: 'create' | 'edit';
}

export function TemplateEditor({ template, mode }: TemplateEditorProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(template?.name || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [previewText, setPreviewText] = useState(template?.previewText || '');
  const [html, setHtml] = useState(template?.html || getDefaultHtml());
  const [category, setCategory] = useState<string>(template?.category || '');
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<string>('editor');

  function getDefaultHtml(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Template</title>
</head>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background-color: #4f46e5;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Your Company</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #333333; margin-top: 0;">Hello {{first_name}},</h2>
              <p style="color: #666666; line-height: 1.6;">
                Write your email content here. Use merge tags to personalize your message.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                <tr>
                  <td style="background-color: #4f46e5; border-radius: 6px; padding: 12px 24px;">
                    <a href="#" style="color: #ffffff; text-decoration: none; font-weight: bold;">Call to Action</a>
                  </td>
                </tr>
              </table>
              <p style="color: #666666; line-height: 1.6;">
                Thanks,<br>Your Team
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                You received this email because you subscribed.<br>
                <a href="{{unsubscribe_url}}" style="color: #999999;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  const insertMergeTag = (tag: string) => {
    setHtml((prev) => prev + tag);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Name required', description: 'Please enter a template name.', variant: 'destructive' });
      return;
    }
    if (!subject.trim()) {
      toast({ title: 'Subject required', description: 'Please enter a subject line.', variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);
      const token = await getToken();
      const payload = {
        name: name.trim(),
        subject: subject.trim(),
        previewText: previewText.trim() || undefined,
        html,
        category: category || undefined,
      };

      if (mode === 'edit' && template) {
        await api(`/templates/${template.id}`, {
          method: 'PUT',
          token: token || undefined,
          body: JSON.stringify(payload),
        });
        toast({ title: 'Template saved', description: 'Your changes have been saved.' });
      } else {
        await api('/templates', {
          method: 'POST',
          token: token || undefined,
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
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {mode === 'edit' ? 'Save Changes' : 'Create Template'}
        </Button>
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
                <Braces className="h-4 w-4" />
                Merge Tags
              </CardTitle>
              <CardDescription>Click to insert at cursor position.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {mergeTags.map((mt) => (
                  <Button
                    key={mt.tag}
                    variant="outline"
                    size="sm"
                    className="text-xs font-mono"
                    onClick={() => insertMergeTag(mt.tag)}
                  >
                    {mt.tag}
                  </Button>
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
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="editor">
                      <Code className="mr-2 h-4 w-4" />
                      HTML Editor
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
              <div className="rounded-md bg-muted/50 border p-2 mt-2">
                <p className="text-xs text-muted-foreground">
                  A visual drag-and-drop editor (Unlayer) will be integrated in a future update.
                  For now, edit the HTML directly or paste your email HTML below.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {activeTab === 'editor' ? (
                <Textarea
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  className="font-mono text-sm min-h-[500px] resize-y"
                  placeholder="Enter your email HTML here..."
                />
              ) : (
                <div
                  className={`mx-auto border rounded-lg overflow-hidden bg-white transition-all ${
                    previewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-full'
                  }`}
                >
                  <div className="bg-muted px-3 py-2 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-mono">
                        {previewMode === 'mobile' ? '375px' : '100%'}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {previewMode === 'desktop' ? 'Desktop' : 'Mobile'} Preview
                    </span>
                  </div>
                  <iframe
                    srcDoc={html}
                    className="w-full border-0"
                    style={{ height: '500px' }}
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
