'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Users, Globe, BarChart3, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface DashboardStats {
  totalCampaigns: number;
  totalContacts: number;
  verifiedDomains: number;
  avgOpenRate: number;
}

export default function DashboardPage() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const opts = { token: token || undefined };

      const [campaignsRes, contactsRes, domainsRes, overviewRes] = await Promise.allSettled([
        api<{ data: unknown[]; total: number }>('/campaigns?limit=1', opts),
        api<{ data: unknown[]; total: number }>('/contacts?limit=1', opts),
        api<{ data: unknown[] }>('/domains', opts),
        api<{ avgOpenRate: number }>('/analytics/overview', opts),
      ]);

      setStats({
        totalCampaigns: campaignsRes.status === 'fulfilled' ? (campaignsRes.value.total ?? 0) : 0,
        totalContacts: contactsRes.status === 'fulfilled' ? (contactsRes.value.total ?? 0) : 0,
        verifiedDomains: domainsRes.status === 'fulfilled' ? (domainsRes.value.data?.length ?? 0) : 0,
        avgOpenRate: overviewRes.status === 'fulfilled' ? (overviewRes.value.avgOpenRate ?? 0) : 0,
      });
    } catch {
      setStats({ totalCampaigns: 0, totalContacts: 0, verifiedDomains: 0, avgOpenRate: 0 });
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to SignalWave. Here is your campaign overview.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCampaigns ?? 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalCampaigns ? 'across all statuses' : 'Create your first campaign'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalContacts ?? 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalContacts ? 'in your audience' : 'Import your contacts'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verified Domains</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.verifiedDomains ?? 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.verifiedDomains ? 'sending domains' : 'Add your sending domain'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.avgOpenRate ? `${stats.avgOpenRate.toFixed(1)}%` : '--%'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.avgOpenRate ? 'average across campaigns' : 'Send campaigns to see analytics'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
