'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Send,
  Eye,
  MousePointerClick,
  MailX,
  BarChart3,
  Calendar,
  Mail,
  Users,
  UserX,
  AlertOctagon,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Campaign, CampaignStatsSummary } from '@signalwave/shared';

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'default' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  scheduled: { label: 'Scheduled', variant: 'warning' },
  sending: { label: 'Sending', variant: 'default' },
  sent: { label: 'Sent', variant: 'success' },
  paused: { label: 'Paused', variant: 'warning' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<CampaignStatsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCampaign = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const [campaignRes, statsRes] = await Promise.allSettled([
        api<{ data: Campaign }>(`/campaigns/${campaignId}`, { token: token || undefined }),
        api<{ data: CampaignStatsSummary }>(`/campaigns/${campaignId}/stats`, { token: token || undefined }),
      ]);
      if (campaignRes.status === 'fulfilled') setCampaign(campaignRes.value.data);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data || null);
    } catch {
      // handled by state defaults
    } finally {
      setLoading(false);
    }
  }, [campaignId, getToken]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/campaigns')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Campaign not found</h3>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = (statusConfig[campaign.status] ?? statusConfig['draft'])!;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/campaigns')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Campaigns
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{campaign.name}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">Subject: {campaign.subject}</p>
        </div>
        {campaign.status === 'sent' && (
          <Link href={`/analytics/campaigns/${campaign.id}`}>
            <Button variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              View Analytics
            </Button>
          </Link>
        )}
      </div>

      {/* Campaign Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">From</span>
              <span className="font-medium">{campaign.fromName} &lt;{campaign.fromEmail}&gt;</span>
            </div>
            {campaign.replyTo && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reply-To</span>
                <span className="font-medium">{campaign.replyTo}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium capitalize">{campaign.type.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium">{new Date(campaign.createdAt).toLocaleDateString()}</span>
            </div>
            {campaign.sentAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sent</span>
                <span className="font-medium">{new Date(campaign.sentAt).toLocaleString()}</span>
              </div>
            )}
            {campaign.scheduledAt && campaign.status === 'scheduled' && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Scheduled</span>
                <span className="font-medium">{new Date(campaign.scheduledAt).toLocaleString()}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Estimated Recipients</span>
              <span className="font-medium">{campaign.estimatedRecipients.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sent</span>
              <span className="font-medium">{campaign.sentCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Lists</span>
              <span className="font-medium">{campaign.listIds.length} list(s)</span>
            </div>
            {campaign.tags.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tags</span>
                <div className="flex gap-1 flex-wrap justify-end">
                  {campaign.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      {stats && (
        <>
          <Separator />
          <h2 className="text-lg font-semibold">Performance</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.delivered.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{(stats.deliveryRate * 100).toFixed(1)}% delivery rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Opens</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.uniqueOpens.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{(stats.openRate * 100).toFixed(1)}% open rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clicks</CardTitle>
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.uniqueClicks.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{(stats.clickRate * 100).toFixed(1)}% click rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bounces</CardTitle>
                <MailX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(stats.bouncedHard + stats.bouncedSoft).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{(stats.bounceRate * 100).toFixed(1)}% bounce rate</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unsubscribes</CardTitle>
                <UserX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.unsubscribes}</div>
                <p className="text-xs text-muted-foreground">{(stats.unsubscribeRate * 100).toFixed(2)}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Complaints</CardTitle>
                <AlertOctagon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.complaints}</div>
                <p className="text-xs text-muted-foreground">{(stats.complaintRate * 100).toFixed(3)}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.failed}</div>
                <p className="text-xs text-muted-foreground">delivery failures</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
