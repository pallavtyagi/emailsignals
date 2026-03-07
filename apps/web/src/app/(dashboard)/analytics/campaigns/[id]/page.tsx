'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Loader2,
  Send,
  Eye,
  MousePointerClick,
  MailX,
  UserX,
  AlertOctagon,
  AlertTriangle,
  Link as LinkIcon,
  TrendingUp,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { api } from '@/lib/api';
import type { Campaign, CampaignStatsSummary, TimeSeriesPoint, LinkClickStats } from '@signalwave/shared';

export default function CampaignAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<CampaignStatsSummary | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [linkStats, setLinkStats] = useState<LinkClickStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const [campaignRes, statsRes, timeSeriesRes, linksRes] = await Promise.allSettled([
        api<{ data: Campaign }>(`/campaigns/${campaignId}`, { token: token || undefined }),
        api<{ data: CampaignStatsSummary }>(`/campaigns/${campaignId}/stats`, { token: token || undefined }),
        api<{ data: TimeSeriesPoint[] }>(`/analytics/campaigns/${campaignId}/timeseries`, { token: token || undefined }),
        api<{ data: LinkClickStats[] }>(`/analytics/campaigns/${campaignId}/links`, { token: token || undefined }),
      ]);
      if (campaignRes.status === 'fulfilled') setCampaign(campaignRes.value.data);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (timeSeriesRes.status === 'fulfilled') setTimeSeries(timeSeriesRes.value.data || []);
      if (linksRes.status === 'fulfilled') setLinkStats(linksRes.value.data || []);
    } catch {
      // handled by state
    } finally {
      setLoading(false);
    }
  }, [campaignId, getToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        <Button variant="ghost" onClick={() => router.push('/analytics')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Analytics
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

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/analytics')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Analytics
      </Button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{campaign.name}</h1>
        <p className="text-muted-foreground">Detailed analytics for this campaign.</p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.delivered.toLocaleString()}</div>
                <Progress value={stats.deliveryRate * 100} className="h-1.5 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">{(stats.deliveryRate * 100).toFixed(1)}% of {stats.sent.toLocaleString()} sent</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Opens</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.uniqueOpens.toLocaleString()}</div>
                <Progress value={stats.openRate * 100} className="h-1.5 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {(stats.openRate * 100).toFixed(1)}% open rate ({stats.opens.toLocaleString()} total opens)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Clicks</CardTitle>
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.uniqueClicks.toLocaleString()}</div>
                <Progress value={stats.clickRate * 100} className="h-1.5 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {(stats.clickRate * 100).toFixed(1)}% click rate ({stats.clicks.toLocaleString()} total clicks)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bounces</CardTitle>
                <MailX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(stats.bouncedHard + stats.bouncedSoft).toLocaleString()}</div>
                <Progress value={stats.bounceRate * 100} className="h-1.5 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.bouncedHard} hard / {stats.bouncedSoft} soft ({(stats.bounceRate * 100).toFixed(1)}%)
                </p>
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
                <p className="text-xs text-muted-foreground">{(stats.unsubscribeRate * 100).toFixed(2)}% rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Complaints</CardTitle>
                <AlertOctagon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.complaints}</div>
                <p className="text-xs text-muted-foreground">{(stats.complaintRate * 100).toFixed(3)}% rate</p>
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

      {/* Engagement Over Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Engagement Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => { const d = new Date(v); return `${d.getMonth()+1}/${d.getDate()}`; }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="opens" stroke="hsl(220, 90%, 56%)" strokeWidth={2} dot={false} name="Opens" />
                <Line type="monotone" dataKey="clicks" stroke="hsl(142, 72%, 40%)" strokeWidth={2} dot={false} name="Clicks" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              No time series data available for this campaign.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Click Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Link Performance
          </CardTitle>
          <CardDescription>Click statistics for each link in the email.</CardDescription>
        </CardHeader>
        <CardContent>
          {linkStats.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead className="text-right">Total Clicks</TableHead>
                  <TableHead className="text-right">Unique Clicks</TableHead>
                  <TableHead className="text-right">Click Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkStats.map((link, i) => (
                  <TableRow key={i}>
                    <TableCell className="max-w-sm truncate font-mono text-xs">
                      {link.url}
                    </TableCell>
                    <TableCell className="text-right">{link.totalClicks.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{link.uniqueClicks.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{(link.clickRate * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
              No link click data available for this campaign.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
