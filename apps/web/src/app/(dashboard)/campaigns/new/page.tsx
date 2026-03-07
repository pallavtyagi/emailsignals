'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
  Monitor,
  Smartphone,
  Send,
  Calendar,
  Clock,
  Users,
  Mail,
  FileText,
  Settings,
  Eye,
  X,
  Plus,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { Domain, ContactList, Template, Campaign } from '@signalwave/shared';

interface SubjectLineVariant {
  subject: string;
  reasoning: string;
  estimatedOpenRate: 'low' | 'medium' | 'high';
}

const STEPS = ['Setup', 'Audience', 'Content', 'Review', 'Schedule', 'Confirm'];
const STEP_ICONS = [Settings, Users, FileText, Eye, Calendar, Check];
const CAMPAIGN_TYPES = [
  { value: 'blast', label: 'One-time Blast' },
  { value: 'scheduled', label: 'Scheduled Send' },
  { value: 'ab_test', label: 'A/B Test' },
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'UTC',
];

export default function NewCampaignPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Data for selects
  const [domains, setDomains] = useState<Domain[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  // Step 1: Setup
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState('blast');
  const [domainId, setDomainId] = useState('');
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [replyTo, setReplyTo] = useState('');

  // Step 2: Audience
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [exclusionLists, setExclusionLists] = useState<string[]>([]);
  const [estimatedRecipients, setEstimatedRecipients] = useState(0);

  // Step 3: Content
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [aiSubjects, setAiSubjects] = useState<SubjectLineVariant[]>([]);
  const [generatingSubjects, setGeneratingSubjects] = useState(false);

  // Step 4: Review
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Step 5: Schedule
  const [sendOption, setSendOption] = useState<'now' | 'later'>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');

  // Step 4: Test email
  const [testEmails, setTestEmails] = useState<string[]>([]);
  const [testEmailInput, setTestEmailInput] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const token = await getToken();
      const [domainsRes, listsRes, templatesRes] = await Promise.allSettled([
        api<{ data: Domain[] }>('/domains', { token: token || undefined }),
        api<{ data: ContactList[] }>('/contacts/lists', { token: token || undefined }),
        api<{ data: Template[] }>('/templates', { token: token || undefined }),
      ]);
      if (domainsRes.status === 'fulfilled') setDomains(domainsRes.value.data || []);
      if (listsRes.status === 'fulfilled') setLists(listsRes.value.data || []);
      if (templatesRes.status === 'fulfilled') setTemplates(templatesRes.value.data || []);
    } catch {
      // Silently handle
    }
  }, [getToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate estimated recipients when lists change
  useEffect(() => {
    const included = lists.filter((l) => selectedLists.includes(l.id));
    const excluded = lists.filter((l) => exclusionLists.includes(l.id));
    const totalIncluded = included.reduce((sum, l) => sum + l.contactCount, 0);
    const totalExcluded = excluded.reduce((sum, l) => sum + l.contactCount, 0);
    setEstimatedRecipients(Math.max(0, totalIncluded - totalExcluded));
  }, [selectedLists, exclusionLists, lists]);

  const toggleList = (listId: string) => {
    setSelectedLists((prev) =>
      prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId],
    );
  };

  const toggleExclusionList = (listId: string) => {
    setExclusionLists((prev) =>
      prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId],
    );
  };

  const generateSubjectLines = async () => {
    try {
      setGeneratingSubjects(true);
      const token = await getToken();
      const data = await api<{ data: { variants: SubjectLineVariant[] } }>('/ai/subject-lines', {
        method: 'POST',
        token: token || undefined,
        body: JSON.stringify({
          campaignName,
          campaignType,
          targetAudience: 'general',
          tone: 'professional',
        }),
      });
      setAiSubjects(data.data?.variants || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to generate subject lines.', variant: 'destructive' });
    } finally {
      setGeneratingSubjects(false);
    }
  };

  const addTestEmail = () => {
    const email = testEmailInput.trim();
    if (email && !testEmails.includes(email) && testEmails.length < 5) {
      setTestEmails([...testEmails, email]);
      setTestEmailInput('');
    }
  };

  const sendTestEmail = async () => {
    if (testEmails.length === 0) return;
    try {
      setSendingTest(true);
      const token = await getToken();
      await api('/campaigns/test-send', {
        method: 'POST',
        token: token || undefined,
        body: JSON.stringify({
          to: testEmails,
          subject,
          previewText,
          templateId: templateId || undefined,
          fromName,
          fromEmail,
        }),
      });
      toast({ title: 'Test sent', description: `Test email sent to ${testEmails.length} address(es).` });
    } catch {
      toast({ title: 'Error', description: 'Failed to send test email.', variant: 'destructive' });
    } finally {
      setSendingTest(false);
    }
  };

  const handleLaunch = async () => {
    try {
      setSaving(true);
      const token = await getToken();

      const payload: Record<string, unknown> = {
        name: campaignName,
        type: campaignType,
        subject,
        previewText: previewText || undefined,
        fromName,
        fromEmail,
        replyTo: replyTo || undefined,
        domainId,
        templateId: templateId || undefined,
        listIds: selectedLists,
        exclusionListIds: exclusionLists,
      };

      if (sendOption === 'later' && scheduledDate && scheduledTime) {
        payload.scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
        payload.timezone = timezone;
      }

      const result = await api<{ data: Campaign }>('/campaigns', {
        method: 'POST',
        token: token || undefined,
        body: JSON.stringify(payload),
      });

      // If sending now, trigger send
      if (sendOption === 'now') {
        await api(`/campaigns/${result.data.id}/send`, {
          method: 'POST',
          token: token || undefined,
        });
      }

      toast({
        title: sendOption === 'now' ? 'Campaign launched' : 'Campaign scheduled',
        description: sendOption === 'now'
          ? 'Your campaign is now being sent.'
          : `Campaign scheduled for ${scheduledDate} at ${scheduledTime}.`,
      });
      router.push(`/campaigns/${result.data.id}`);
    } catch {
      toast({ title: 'Error', description: 'Failed to create campaign.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: return !!(campaignName && domainId && fromName && fromEmail);
      case 1: return selectedLists.length > 0;
      case 2: return !!subject;
      case 3: return true;
      case 4: return sendOption === 'now' || !!(scheduledDate && scheduledTime);
      case 5: return true;
      default: return false;
    }
  };

  const selectedDomain = domains.find((d) => d.id === domainId);
  const selectedTemplate = templates.find((t) => t.id === templateId);
  const progressValue = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/campaigns')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <h1 className="text-xl font-semibold">New Campaign</h1>
      </div>

      {/* Step Progress */}
      <div className="space-y-3">
        <div className="flex justify-between">
          {STEPS.map((step, i) => {
            const StepIcon = STEP_ICONS[i];
            return (
              <button
                key={step}
                onClick={() => i < currentStep && setCurrentStep(i)}
                className={`flex items-center gap-1.5 text-sm transition-colors ${
                  i === currentStep
                    ? 'text-primary font-medium'
                    : i < currentStep
                    ? 'text-muted-foreground cursor-pointer hover:text-foreground'
                    : 'text-muted-foreground/50 cursor-default'
                }`}
                disabled={i > currentStep}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  i < currentStep
                    ? 'bg-primary text-primary-foreground'
                    : i === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {i < currentStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className="hidden sm:inline">{step}</span>
              </button>
            );
          })}
        </div>
        <Progress value={progressValue} className="h-1.5" />
      </div>

      {/* Step 1: Setup */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Setup</CardTitle>
            <CardDescription>Configure the basic settings for your campaign.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Campaign Name *</Label>
              <Input
                id="campaign-name"
                placeholder="e.g., March Newsletter"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Campaign Type</Label>
              <Select value={campaignType} onValueChange={setCampaignType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sending Domain *</Label>
              <Select value={domainId} onValueChange={setDomainId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a verified domain" />
                </SelectTrigger>
                <SelectContent>
                  {domains.filter((d) => d.status === 'verified').map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.domain}</SelectItem>
                  ))}
                  {domains.filter((d) => d.status === 'verified').length === 0 && (
                    <SelectItem value="_none" disabled>No verified domains available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from-name">From Name *</Label>
                <Input
                  id="from-name"
                  placeholder="Your Company"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="from-email">From Email *</Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="from-email"
                    placeholder="hello"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                  />
                  {selectedDomain && (
                    <span className="text-sm text-muted-foreground shrink-0">@{selectedDomain.domain}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reply-to">Reply-To (optional)</Label>
              <Input
                id="reply-to"
                placeholder="replies@example.com"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Audience */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Audience</CardTitle>
            <CardDescription>Choose which contact lists to send to.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base">Include Lists *</Label>
              {lists.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contact lists found. Create lists in the Contacts section first.</p>
              ) : (
                <div className="space-y-2">
                  {lists.map((list) => (
                    <div key={list.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <Checkbox
                        checked={selectedLists.includes(list.id)}
                        onCheckedChange={() => toggleList(list.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{list.name}</span>
                          <Badge variant="secondary" className="text-xs">{list.contactCount} contacts</Badge>
                        </div>
                        {list.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{list.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-base">Exclusion Lists (optional)</Label>
              <p className="text-sm text-muted-foreground">
                Contacts in these lists will be excluded from the campaign.
              </p>
              <div className="space-y-2">
                {lists.map((list) => (
                  <div key={list.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <Checkbox
                      checked={exclusionLists.includes(list.id)}
                      onCheckedChange={() => toggleExclusionList(list.id)}
                      disabled={selectedLists.includes(list.id)}
                    />
                    <div className="flex-1">
                      <span className="font-medium text-sm">{list.name}</span>
                      <Badge variant="secondary" className="text-xs ml-2">{list.contactCount}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-lg">{estimatedRecipients.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Estimated recipients</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Content */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Content</CardTitle>
            <CardDescription>Set your subject line and select a template.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject Line *</Label>
              <div className="flex gap-2">
                <Input
                  id="subject"
                  placeholder="e.g., Exciting news from our team!"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={generateSubjectLines}
                  disabled={generatingSubjects || !campaignName}
                >
                  {generatingSubjects ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  AI Generate
                </Button>
              </div>
            </div>

            {aiSubjects.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">AI-Generated Subject Lines</Label>
                <div className="space-y-2">
                  {aiSubjects.map((variant, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSubject(variant.subject)}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{variant.subject}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{variant.reasoning}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={variant.estimatedOpenRate === 'high' ? 'success' : variant.estimatedOpenRate === 'medium' ? 'warning' : 'secondary'}
                          className="text-xs"
                        >
                          {variant.estimatedOpenRate} open rate
                        </Badge>
                        <Button size="sm" variant="ghost" onClick={() => setSubject(variant.subject)}>
                          Use
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="preview-text">Preview Text</Label>
              <Input
                id="preview-text"
                placeholder="Text shown after the subject in inbox..."
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Email Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                  {templates.length === 0 && (
                    <SelectItem value="_none" disabled>No templates available</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <div className="mt-2 rounded-lg border p-3 bg-muted/50">
                  <p className="text-sm font-medium">{selectedTemplate.name}</p>
                  <p className="text-xs text-muted-foreground">Subject: {selectedTemplate.subject}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Preview</CardTitle>
                  <CardDescription>Review how your email will look.</CardDescription>
                </div>
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
              </div>
            </CardHeader>
            <CardContent>
              <div className={`mx-auto border rounded-lg overflow-hidden bg-white transition-all ${
                previewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-full'
              }`}>
                <div className="bg-muted px-3 py-2 border-b space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">From:</span>
                    <span className="font-medium">{fromName} &lt;{fromEmail}{selectedDomain ? `@${selectedDomain.domain}` : ''}&gt;</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Subject:</span>
                    <span className="font-medium">{subject || 'No subject'}</span>
                  </div>
                  {previewText && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Preview:</span>
                      <span className="text-muted-foreground">{previewText}</span>
                    </div>
                  )}
                </div>
                {selectedTemplate ? (
                  <iframe
                    srcDoc={selectedTemplate.html}
                    className="w-full border-0"
                    style={{ height: '400px' }}
                    title="Email Preview"
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    <div className="text-center">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No template selected</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Spam Score Placeholder */}
              <div className="mt-4 rounded-lg border p-3 bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Spam Score Analysis</p>
                    <p className="text-xs text-muted-foreground">Spam score check will run before sending.</p>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Email */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Send Test Email</CardTitle>
              <CardDescription>Send a test to up to 5 email addresses before launching.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="test@example.com"
                  value={testEmailInput}
                  onChange={(e) => setTestEmailInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTestEmail(); } }}
                />
                <Button variant="outline" onClick={addTestEmail} disabled={testEmails.length >= 5}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {testEmails.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {testEmails.map((email) => (
                    <Badge key={email} variant="secondary" className="gap-1">
                      {email}
                      <button onClick={() => setTestEmails(testEmails.filter((e) => e !== email))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <Button variant="outline" onClick={sendTestEmail} disabled={testEmails.length === 0 || sendingTest}>
                {sendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send Test
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 5: Schedule */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>Choose when to send your campaign.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div
                className={`rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                  sendOption === 'now' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'
                }`}
                onClick={() => setSendOption('now')}
              >
                <div className="flex items-center gap-3">
                  <Send className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold">Send Immediately</p>
                    <p className="text-sm text-muted-foreground">Start sending as soon as you confirm.</p>
                  </div>
                </div>
              </div>
              <div
                className={`rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                  sendOption === 'later' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'
                }`}
                onClick={() => setSendOption('later')}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold">Schedule for Later</p>
                    <p className="text-sm text-muted-foreground">Pick a specific date and time.</p>
                  </div>
                </div>
              </div>
            </div>

            {sendOption === 'later' && (
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="schedule-date">Date</Label>
                    <Input
                      id="schedule-date"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schedule-time">Time</Label>
                    <Input
                      id="schedule-time"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 6: Confirm */}
      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm and Launch</CardTitle>
            <CardDescription>Review your campaign settings before launching.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border divide-y">
              <div className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">Campaign Name</span>
                <span className="text-sm font-medium">{campaignName}</span>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">Type</span>
                <Badge variant="secondary">{CAMPAIGN_TYPES.find((t) => t.value === campaignType)?.label}</Badge>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">From</span>
                <span className="text-sm font-medium">
                  {fromName} &lt;{fromEmail}{selectedDomain ? `@${selectedDomain.domain}` : ''}&gt;
                </span>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">Subject Line</span>
                <span className="text-sm font-medium max-w-xs truncate">{subject}</span>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">Audience</span>
                <span className="text-sm font-medium">{estimatedRecipients.toLocaleString()} recipients</span>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">Lists</span>
                <div className="flex gap-1 flex-wrap justify-end">
                  {selectedLists.map((id) => {
                    const list = lists.find((l) => l.id === id);
                    return list ? <Badge key={id} variant="outline" className="text-xs">{list.name}</Badge> : null;
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">Template</span>
                <span className="text-sm font-medium">{selectedTemplate?.name || 'None'}</span>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">Delivery</span>
                <span className="text-sm font-medium">
                  {sendOption === 'now'
                    ? 'Send Immediately'
                    : `Scheduled: ${scheduledDate} at ${scheduledTime} (${timezone.replace(/_/g, ' ')})`}
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
              <p className="text-sm text-yellow-800">
                Once launched, this campaign will begin sending to{' '}
                <strong>{estimatedRecipients.toLocaleString()}</strong> recipients.
                {sendOption === 'now' ? ' This action cannot be undone.' : ' You can cancel a scheduled campaign before it starts.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={!canProceed()}
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleLaunch} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {sendOption === 'now' ? 'Launch Campaign' : 'Schedule Campaign'}
          </Button>
        )}
      </div>
    </div>
  );
}
