'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Settings,
  Users,
  Key,
  CreditCard,
  Loader2,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { BILLING_PLANS, PLAN_LIMITS, API_SCOPES } from '@signalwave/shared';
import type { WorkspaceMember, Workspace, UsageSummary, Subscription } from '@signalwave/shared';
import type { ApiScope } from '@signalwave/shared';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiScope[];
  lastUsedAt: Date | null;
  createdAt: Date;
}

export default function SettingsPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();

  // Workspace
  const [workspaceName, setWorkspaceName] = useState('');
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [brandColor, setBrandColor] = useState('#4f46e5');
  const [savingWorkspace, setSavingWorkspace] = useState(false);

  // Team
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('marketer');
  const [inviting, setInviting] = useState(false);

  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyDialogOpen, setNewKeyDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<Set<string>>(new Set(['read']));
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState('');
  const [showKeyValue, setShowKeyValue] = useState(false);

  // Billing
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const [workspaceRes, membersRes, keysRes, subscriptionRes, usageRes] = await Promise.allSettled([
        api<{ data: Workspace & { physicalAddress?: string; brandColor?: string } }>('/workspace', { token: token || undefined }),
        api<{ data: WorkspaceMember[] }>('/workspace/members', { token: token || undefined }),
        api<{ data: ApiKey[] }>('/api-keys', { token: token || undefined }),
        api<{ data: Subscription }>('/billing/subscription', { token: token || undefined }),
        api<{ data: UsageSummary }>('/billing/usage', { token: token || undefined }),
      ]);
      if (workspaceRes.status === 'fulfilled') {
        const ws = workspaceRes.value.data;
        setWorkspaceName(ws.name);
        setPhysicalAddress(ws.physicalAddress || '');
        setBrandColor(ws.brandColor || '#4f46e5');
      }
      if (membersRes.status === 'fulfilled') setMembers(membersRes.value.data || []);
      if (keysRes.status === 'fulfilled') setApiKeys(keysRes.value.data || []);
      if (subscriptionRes.status === 'fulfilled') setSubscription(subscriptionRes.value.data || null);
      if (usageRes.status === 'fulfilled') setUsage(usageRes.value.data || null);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveWorkspace = async () => {
    try {
      setSavingWorkspace(true);
      const token = await getToken();
      await api('/workspace', {
        method: 'PUT',
        token: token || undefined,
        body: JSON.stringify({
          name: workspaceName,
          physicalAddress,
          brandColor,
        }),
      });
      toast({ title: 'Settings saved', description: 'Workspace settings have been updated.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' });
    } finally {
      setSavingWorkspace(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      setInviting(true);
      const token = await getToken();
      await api('/workspace/members/invite', {
        method: 'POST',
        token: token || undefined,
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      toast({ title: 'Invitation sent', description: `An invitation has been sent to ${inviteEmail}.` });
      setInviteEmail('');
      fetchSettings();
    } catch {
      toast({ title: 'Error', description: 'Failed to send invitation.', variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  const toggleScope = (scope: string) => {
    setNewKeyScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      setCreatingKey(true);
      const token = await getToken();
      const data = await api<{ data: { id: string; key: string } }>('/api-keys', {
        method: 'POST',
        token: token || undefined,
        body: JSON.stringify({ name: newKeyName.trim(), scopes: Array.from(newKeyScopes) }),
      });
      setNewKeyValue(data.data.key);
      setShowKeyValue(true);
      fetchSettings();
    } catch {
      toast({ title: 'Error', description: 'Failed to create API key.', variant: 'destructive' });
    } finally {
      setCreatingKey(false);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    try {
      const token = await getToken();
      await api(`/api-keys/${keyId}`, { method: 'DELETE', token: token || undefined });
      toast({ title: 'API key deleted', description: 'The API key has been revoked.' });
      fetchSettings();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete API key.', variant: 'destructive' });
    }
  };

  const copyApiKey = async () => {
    await navigator.clipboard.writeText(newKeyValue);
    toast({ title: 'Copied', description: 'API key copied to clipboard.' });
  };

  const planPrice = (plan: string) => {
    const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];
    if (!limits) return 'Custom';
    if (limits.price === 0) return 'Custom';
    return `$${(limits.price / 100).toFixed(0)}/mo`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your workspace settings.</p>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your workspace settings.</p>
      </div>

      <Tabs defaultValue="workspace" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="workspace" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Workspace</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Team</span>
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="gap-2">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">API Keys</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
        </TabsList>

        {/* Workspace Tab */}
        <TabsContent value="workspace" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Settings</CardTitle>
              <CardDescription>General workspace settings and branding.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ws-name">Workspace Name</Label>
                <Input
                  id="ws-name"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="My Workspace"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ws-address">Physical Address (CAN-SPAM)</Label>
                <Textarea
                  id="ws-address"
                  value={physicalAddress}
                  onChange={(e) => setPhysicalAddress(e.target.value)}
                  placeholder="123 Main St, Suite 100&#10;San Francisco, CA 94102"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Required by CAN-SPAM law. This will appear in the footer of your emails.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ws-color">Brand Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="ws-color"
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="h-10 w-14 rounded-md border cursor-pointer"
                  />
                  <Input
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-32 font-mono"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveWorkspace} disabled={savingWorkspace}>
                {savingWorkspace && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage who has access to this workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              {members.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.user.firstName || member.user.lastName
                            ? `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim()
                            : 'Unknown'}
                        </TableCell>
                        <TableCell>{member.user.email}</TableCell>
                        <TableCell>
                          <Badge variant={member.role === 'owner' ? 'default' : 'secondary'} className="capitalize">
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {new Date(member.joinedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-muted-foreground text-sm">No team members found.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invite Member</CardTitle>
              <CardDescription>Send an invitation to a new team member.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="teammate@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="marketer">Marketer</SelectItem>
                      <SelectItem value="analyst">Analyst</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                {inviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Send Invitation
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Create and manage API keys for programmatic access.</CardDescription>
              </div>
              <Button onClick={() => { setNewKeyDialogOpen(true); setNewKeyValue(''); setShowKeyValue(false); setNewKeyName(''); setNewKeyScopes(new Set(['read'])); }}>
                <Plus className="mr-2 h-4 w-4" />
                Create Key
              </Button>
            </CardHeader>
            <CardContent>
              {apiKeys.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Scopes</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">{key.prefix}...****</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {key.scopes.map((scope) => (
                              <Badge key={scope} variant="outline" className="text-xs">{scope}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteApiKey(key.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No API keys created yet.</p>
                  <p className="text-xs mt-1">Create a key to access the SignalWave API programmatically.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your subscription and usage details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {subscription ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-bold capitalize">{subscription.plan}</h3>
                        <Badge variant={subscription.status === 'active' ? 'success' : 'warning'}>
                          {subscription.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {planPrice(subscription.plan)}
                      </p>
                    </div>
                    <Button variant="outline" asChild>
                      <a href="/api/billing/portal" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Manage Billing
                      </a>
                    </Button>
                  </div>

                  <Separator />

                  {usage && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Email Usage</span>
                          <span className="text-sm text-muted-foreground">
                            {usage.emailsUsed.toLocaleString()} / {usage.emailsLimit === Infinity ? 'Unlimited' : usage.emailsLimit.toLocaleString()}
                          </span>
                        </div>
                        <Progress value={usage.usagePercent} className="h-3" />
                        <p className="text-xs text-muted-foreground mt-1">
                          Current period: {new Date(usage.currentPeriodStart).toLocaleDateString()} - {new Date(usage.currentPeriodEnd).toLocaleDateString()}
                        </p>
                      </div>

                      {usage.overage > 0 && (
                        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800">Overage charges</p>
                            <p className="text-xs text-yellow-700 mt-0.5">
                              {usage.overage.toLocaleString()} emails over limit. Overage cost: ${(usage.overageCost / 100).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No active subscription.</p>
                  <Button className="mt-4" variant="outline">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Set Up Billing
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Available Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                {BILLING_PLANS.map((plan) => {
                  const limits = PLAN_LIMITS[plan];
                  const isCurrentPlan = subscription?.plan === plan;
                  return (
                    <div
                      key={plan}
                      className={`rounded-lg border p-4 ${isCurrentPlan ? 'border-primary bg-primary/5' : ''}`}
                    >
                      <h4 className="font-semibold capitalize">{plan}</h4>
                      <p className="text-2xl font-bold mt-2">{planPrice(plan)}</p>
                      <div className="space-y-2 mt-4 text-sm text-muted-foreground">
                        <p>{limits.monthlyEmails === Infinity ? 'Unlimited' : limits.monthlyEmails.toLocaleString()} emails/mo</p>
                        <p>{limits.apiRateRead} API reads/min</p>
                        <p>{limits.apiRateWrite} API writes/min</p>
                      </div>
                      {isCurrentPlan && (
                        <Badge variant="default" className="mt-3">Current Plan</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create API Key Dialog */}
      <Dialog open={newKeyDialogOpen} onOpenChange={setNewKeyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{showKeyValue ? 'API Key Created' : 'Create API Key'}</DialogTitle>
            <DialogDescription>
              {showKeyValue
                ? 'Copy your API key now. It will not be shown again.'
                : 'Create a new API key with specific access scopes.'}
            </DialogDescription>
          </DialogHeader>

          {showKeyValue ? (
            <div className="space-y-4 py-4">
              <div className="rounded-md bg-muted p-3">
                <div className="flex items-center justify-between gap-2">
                  <code className="text-sm font-mono break-all">{newKeyValue}</code>
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={copyApiKey}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                <p className="text-sm text-yellow-800">
                  Make sure to copy your API key now. You will not be able to see it again.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Key Name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g., Production API"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Scopes</Label>
                <div className="space-y-2">
                  {API_SCOPES.map((scope) => (
                    <div key={scope} className="flex items-center gap-3 rounded-lg border p-3">
                      <Checkbox
                        checked={newKeyScopes.has(scope)}
                        onCheckedChange={() => toggleScope(scope)}
                      />
                      <div>
                        <p className="text-sm font-medium capitalize">{scope}</p>
                        <p className="text-xs text-muted-foreground">
                          {scope === 'read' && 'Read contacts, campaigns, templates, and analytics'}
                          {scope === 'write' && 'Create and update contacts, campaigns, and templates'}
                          {scope === 'send' && 'Send campaigns and test emails'}
                          {scope === 'admin' && 'Full access including workspace management'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {showKeyValue ? (
              <Button onClick={() => setNewKeyDialogOpen(false)}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setNewKeyDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateApiKey} disabled={creatingKey || !newKeyName.trim() || newKeyScopes.size === 0}>
                  {creatingKey && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Key
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
