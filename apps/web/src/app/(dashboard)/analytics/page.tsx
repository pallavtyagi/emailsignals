'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  MousePointerClick,
  MailX,
  Send,
  Loader2,
  Eye,
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
} from 'recharts';
import { api } from '@/lib/api';
import type { WorkspaceOverview, TimeSeriesPoint, Campaign, CampaignStatsSummary } from '@signalwave/shared';

interface CampaignWithStats extends Campaign {
  stats?: CampaignStatsSummary;
}

export default function AnalyticsPage() {
  const { getToken } = useAuth();
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const [overviewRes, campaignsRes] = await Promise.allSettled([
        api<{ data: WorkspaceOverview }>(`/analytics/overview?period=${period}`, { token: token || undefined }),
        api<{ data: CampaignWithStats[] }>('/analytics/campaigns', { token: token || undefined }),
      ]);
      if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value.data || null);
      if (campaignsRes.status === 'fulfilled') setCampaigns(campaignsRes.value.data || []);
    } catch {
      // handled by state
    } finally {
      setLoading(false);
    }
  }, [getToken, period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Track your email campaign performance.</p>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const totalSent = overview?.totalSent || 0;
  const totalDelivered = overview?.totalDelivered || 0;
  const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
  const openRate = (overview?.avgOpenRate || 0) * 100;
  const clickRate = (overview?.avgClickRate || 0) * 100;
  const bounceRate = totalSent > 0 ? ((totalSent - totalDelivered) / totalSent) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Track your email campaign performance.</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{overview?.campaignsSent || 0} campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{totalDelivered.toLocaleString()} delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">avg across campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clickRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">avg across campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            <MailX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bounceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {(totalSent - totalDelivered).toLocaleString()} bounced
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time Series Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Opens & Clicks Over Time</CardTitle>
          <CardDescription>Daily email engagement metrics.</CardDescription>
        </CardHeader>
        <CardContent>
          {overview?.timeSeries && overview.timeSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={overview.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sent"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  dot={false}
                  name="Sent"
                />
                <Line
                  type="monotone"
                  dataKey="opens"
                  stroke="hsl(220, 90%, 56%)"
                  strokeWidth={2}
                  dot={false}
                  name="Opens"
                />
                <Line
                  type="monotone"
                  dataKey="clicks"
                  stroke="hsl(142, 72%, 40%)"
                  strokeWidth={2}
                  dot={false}
                  name="Clicks"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Send campaigns to see engagement data here.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>Performance breakdown by campaign.</CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Opens</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Bounces</TableHead>
                  <TableHead className="text-right">Unsubs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <Link
                        href={`/analytics/campaigns/${campaign.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {campaign.name}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {campaign.sentAt ? new Date(campaign.sentAt).toLocaleDateString() : 'Not sent'}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">{campaign.stats?.sent.toLocaleString() || '-'}</TableCell>
                    <TableCell className="text-right">
                      {campaign.stats ? (
                        <span>
                          {campaign.stats.delivered.toLocaleString()}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({(campaign.stats.deliveryRate * 100).toFixed(0)}%)
                          </span>
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {campaign.stats ? (
                        <span>
                          {campaign.stats.uniqueOpens.toLocaleString()}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({(campaign.stats.openRate * 100).toFixed(0)}%)
                          </span>
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {campaign.stats ? (
                        <span>
                          {campaign.stats.uniqueClicks.toLocaleString()}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({(campaign.stats.clickRate * 100).toFixed(0)}%)
                          </span>
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {campaign.stats ? (campaign.stats.bouncedHard + campaign.stats.bouncedSoft).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {campaign.stats?.unsubscribes.toLocaleString() || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              <p className="text-sm">No campaign data available yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
