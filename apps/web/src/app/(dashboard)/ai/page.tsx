'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles,
  Mail,
  FileText,
  Loader2,
  Check,
  Copy,
  RefreshCw,
  Wand2,
  Lightbulb,
  Pencil,
  Target,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface SubjectLineVariant {
  subject: string;
  reasoning: string;
  estimatedOpenRate: 'low' | 'medium' | 'high';
}

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'playful', label: 'Playful' },
  { value: 'formal', label: 'Formal' },
];

interface EmailCopyResult {
  html: string;
  text: string;
  suggestions: string[];
}

interface TemplateSuggestion {
  templateId: string;
  templateName: string;
  reasoning: string;
  matchScore: number;
}

export default function AIStudioPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();

  // Subject Line Generator State
  const [slCampaignName, setSlCampaignName] = useState('');
  const [slCampaignType, setSlCampaignType] = useState('blast');
  const [slAudience, setSlAudience] = useState('');
  const [slTone, setSlTone] = useState('professional');
  const [slIndustry, setSlIndustry] = useState('');
  const [slGenerating, setSlGenerating] = useState(false);
  const [slResults, setSlResults] = useState<SubjectLineVariant[]>([]);

  // Email Copy Writer State
  const [ecSubject, setEcSubject] = useState('');
  const [ecPrompt, setEcPrompt] = useState('');
  const [ecTone, setEcTone] = useState('professional');
  const [ecAudience, setEcAudience] = useState('');
  const [ecCta, setEcCta] = useState('');
  const [ecGenerating, setEcGenerating] = useState(false);
  const [ecResult, setEcResult] = useState<EmailCopyResult | null>(null);

  // Template Suggester State
  const [tsCampaignType, setTsCampaignType] = useState('');
  const [tsGoal, setTsGoal] = useState('');
  const [tsTone, setTsTone] = useState('');
  const [tsIndustry, setTsIndustry] = useState('');
  const [tsGenerating, setTsGenerating] = useState(false);
  const [tsResults, setTsResults] = useState<TemplateSuggestion[]>([]);

  const generateSubjectLines = async () => {
    if (!slCampaignName.trim()) {
      toast({ title: 'Required', description: 'Please enter a campaign name.', variant: 'destructive' });
      return;
    }
    try {
      setSlGenerating(true);
      setSlResults([]);
      const token = await getToken();
      const data = await api<{ data: { variants: SubjectLineVariant[] } }>('/ai/subject-lines', {
        method: 'POST',
        token: token || undefined,
        body: JSON.stringify({
          campaignName: slCampaignName,
          campaignType: slCampaignType,
          targetAudience: slAudience || 'general audience',
          tone: slTone,
          industry: slIndustry || undefined,
        }),
      });
      setSlResults(data.data?.variants || []);
      if (!data.data?.variants?.length) {
        toast({ title: 'No results', description: 'No subject lines were generated. Try different inputs.' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to generate subject lines.', variant: 'destructive' });
    } finally {
      setSlGenerating(false);
    }
  };

  const copySubject = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Subject line copied to clipboard.' });
  };

  const generateEmailCopy = async () => {
    if (!ecPrompt.trim()) {
      toast({ title: 'Required', description: 'Please describe what you want the email to say.', variant: 'destructive' });
      return;
    }
    try {
      setEcGenerating(true);
      setEcResult(null);
      const token = await getToken();
      const data = await api<{ data: EmailCopyResult }>('/ai/email-copy', {
        method: 'POST',
        token: token || undefined,
        body: JSON.stringify({
          subject: ecSubject || 'Email',
          prompt: ecPrompt,
          tone: ecTone,
          targetAudience: ecAudience || undefined,
          callToAction: ecCta || undefined,
          action: 'generate',
        }),
      });
      setEcResult(data.data || null);
    } catch {
      toast({ title: 'Error', description: 'Failed to generate email copy.', variant: 'destructive' });
    } finally {
      setEcGenerating(false);
    }
  };

  const regenerateEmailCopy = async () => {
    if (!ecResult) return;
    try {
      setEcGenerating(true);
      const token = await getToken();
      const data = await api<{ data: EmailCopyResult }>('/ai/email-copy', {
        method: 'POST',
        token: token || undefined,
        body: JSON.stringify({
          subject: ecSubject || 'Email',
          prompt: ecPrompt,
          tone: ecTone,
          targetAudience: ecAudience || undefined,
          callToAction: ecCta || undefined,
          existingCopy: ecResult.text,
          action: 'refine',
        }),
      });
      setEcResult(data.data || null);
    } catch {
      toast({ title: 'Error', description: 'Failed to regenerate email copy.', variant: 'destructive' });
    } finally {
      setEcGenerating(false);
    }
  };

  const copyEmailHtml = async () => {
    if (!ecResult) return;
    await navigator.clipboard.writeText(ecResult.html);
    toast({ title: 'Copied', description: 'Email HTML copied to clipboard.' });
  };

  const suggestTemplates = async () => {
    if (!tsCampaignType.trim()) {
      toast({ title: 'Required', description: 'Please select a campaign type.', variant: 'destructive' });
      return;
    }
    try {
      setTsGenerating(true);
      setTsResults([]);
      const token = await getToken();
      const data = await api<{ data: { suggestions: TemplateSuggestion[] } }>('/ai/template-suggestions', {
        method: 'POST',
        token: token || undefined,
        body: JSON.stringify({
          campaignType: tsCampaignType,
          goal: tsGoal || undefined,
          tone: tsTone || undefined,
          industry: tsIndustry || undefined,
        }),
      });
      setTsResults(data.data?.suggestions || []);
      if (!data.data?.suggestions?.length) {
        toast({ title: 'No results', description: 'No template suggestions found. Try different inputs.' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to get template suggestions.', variant: 'destructive' });
    } finally {
      setTsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">AI Studio</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Use AI to generate subject lines, write email copy, and get template suggestions.
        </p>
      </div>

      <Tabs defaultValue="subject-lines" className="space-y-6">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="subject-lines" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            Subject Lines
          </TabsTrigger>
          <TabsTrigger value="email-copy" className="gap-2">
            <Pencil className="h-4 w-4" />
            Email Copy
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Target className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Subject Line Generator */}
        <TabsContent value="subject-lines" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Subject Line Generator
              </CardTitle>
              <CardDescription>
                Generate 5 AI-powered subject line variants optimized for your campaign.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sl-name">Campaign Name *</Label>
                  <Input
                    id="sl-name"
                    placeholder="e.g., Spring Sale Announcement"
                    value={slCampaignName}
                    onChange={(e) => setSlCampaignName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Campaign Type</Label>
                  <Select value={slCampaignType} onValueChange={setSlCampaignType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blast">One-time Blast</SelectItem>
                      <SelectItem value="newsletter">Newsletter</SelectItem>
                      <SelectItem value="promotion">Promotion</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="welcome">Welcome Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sl-audience">Target Audience</Label>
                  <Input
                    id="sl-audience"
                    placeholder="e.g., SaaS founders, e-commerce managers"
                    value={slAudience}
                    onChange={(e) => setSlAudience(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={slTone} onValueChange={setSlTone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map((tone) => (
                        <SelectItem key={tone.value} value={tone.value}>{tone.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sl-industry">Industry (optional)</Label>
                <Input
                  id="sl-industry"
                  placeholder="e.g., Technology, Retail, Healthcare"
                  value={slIndustry}
                  onChange={(e) => setSlIndustry(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={generateSubjectLines} disabled={slGenerating}>
                {slGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Subject Lines
              </Button>
            </CardFooter>
          </Card>

          {slResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Generated Subject Lines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {slResults.map((variant, i) => (
                  <div key={i} className="flex items-start justify-between gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium">{variant.subject}</p>
                      <p className="text-sm text-muted-foreground mt-1">{variant.reasoning}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={variant.estimatedOpenRate === 'high' ? 'success' : variant.estimatedOpenRate === 'medium' ? 'warning' : 'secondary'}
                      >
                        {variant.estimatedOpenRate}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copySubject(variant.subject)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Email Copy Writer */}
        <TabsContent value="email-copy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                Email Copy Writer
              </CardTitle>
              <CardDescription>
                Describe what you want and AI will write professional email copy for you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ec-subject">Subject Line</Label>
                <Input
                  id="ec-subject"
                  placeholder="e.g., Welcome to our community!"
                  value={ecSubject}
                  onChange={(e) => setEcSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ec-prompt">What should the email say? *</Label>
                <Textarea
                  id="ec-prompt"
                  placeholder="Describe the email content you want, e.g., Write a welcome email for new SaaS trial users. Highlight the key features, offer a free onboarding call, and include a CTA to start a tutorial."
                  value={ecPrompt}
                  onChange={(e) => setEcPrompt(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={ecTone} onValueChange={setEcTone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map((tone) => (
                        <SelectItem key={tone.value} value={tone.value}>{tone.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ec-audience">Target Audience</Label>
                  <Input
                    id="ec-audience"
                    placeholder="e.g., New trial users"
                    value={ecAudience}
                    onChange={(e) => setEcAudience(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ec-cta">Call to Action</Label>
                  <Input
                    id="ec-cta"
                    placeholder="e.g., Start Free Trial"
                    value={ecCta}
                    onChange={(e) => setEcCta(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={generateEmailCopy} disabled={ecGenerating}>
                {ecGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Generate Email Copy
              </Button>
            </CardFooter>
          </Card>

          {ecResult && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Generated Email</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={regenerateEmailCopy} disabled={ecGenerating}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate
                    </Button>
                    <Button variant="outline" size="sm" onClick={copyEmailHtml}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy HTML
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preview */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted px-3 py-2 border-b text-xs text-muted-foreground">
                    Email Preview
                  </div>
                  <iframe
                    srcDoc={ecResult.html}
                    className="w-full border-0"
                    style={{ height: '400px' }}
                    title="Generated Email Preview"
                    sandbox="allow-same-origin"
                  />
                </div>

                {/* AI Suggestions */}
                {ecResult.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      AI Suggestions
                    </h4>
                    <ul className="space-y-1">
                      {ecResult.suggestions.map((suggestion, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">-</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Template Suggester */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Template Suggester
              </CardTitle>
              <CardDescription>
                Get AI-powered template recommendations based on your campaign goals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Campaign Type *</Label>
                  <Select value={tsCampaignType} onValueChange={setTsCampaignType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="welcome">Welcome Email</SelectItem>
                      <SelectItem value="newsletter">Newsletter</SelectItem>
                      <SelectItem value="promotion">Promotion / Sale</SelectItem>
                      <SelectItem value="announcement">Product Announcement</SelectItem>
                      <SelectItem value="re-engagement">Re-engagement</SelectItem>
                      <SelectItem value="survey">Survey / Feedback</SelectItem>
                      <SelectItem value="event">Event Invitation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ts-goal">Campaign Goal</Label>
                  <Input
                    id="ts-goal"
                    placeholder="e.g., Drive trial signups, increase repeat purchases"
                    value={tsGoal}
                    onChange={(e) => setTsGoal(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={tsTone} onValueChange={setTsTone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a tone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map((tone) => (
                        <SelectItem key={tone.value} value={tone.value}>{tone.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ts-industry">Industry</Label>
                  <Input
                    id="ts-industry"
                    placeholder="e.g., SaaS, E-commerce"
                    value={tsIndustry}
                    onChange={(e) => setTsIndustry(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={suggestTemplates} disabled={tsGenerating}>
                {tsGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Get Suggestions
              </Button>
            </CardFooter>
          </Card>

          {tsResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recommended Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tsResults.map((suggestion, i) => (
                  <div key={i} className="flex items-start justify-between gap-4 rounded-lg border p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{suggestion.templateName}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{suggestion.reasoning}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-semibold">{Math.round(suggestion.matchScore * 100)}%</div>
                        <div className="text-xs text-muted-foreground">match</div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/templates/${suggestion.templateId}/edit`}>
                          Use Template
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
