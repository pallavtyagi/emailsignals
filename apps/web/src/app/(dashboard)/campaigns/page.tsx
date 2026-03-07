'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Mail, Plus, Search, Loader2, MoreHorizontal, Eye, BarChart3, Copy } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { Campaign } from '@signalwave/shared';

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'default' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  scheduled: { label: 'Scheduled', variant: 'warning' },
  sending: { label: 'Sending', variant: 'default' },
  sent: { label: 'Sent', variant: 'success' },
  paused: { label: 'Paused', variant: 'warning' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

export default function CampaignsPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const data = await api<{ data: Campaign[] }>('/campaigns', { token: token || undefined });
      setCampaigns(data.data || []);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleDuplicate = async (campaign: Campaign) => {
    try {
      const token = await getToken();
      await api('/campaigns', {
        method: 'POST',
        token: token || undefined,
        body: JSON.stringify({
          name: `${campaign.name} (Copy)`,
          type: campaign.type,
          subject: campaign.subject,
          previewText: campaign.previewText,
          fromName: campaign.fromName,
          fromEmail: campaign.fromEmail,
          replyTo: campaign.replyTo,
          domainId: campaign.domainId,
          templateId: campaign.templateId,
          html: campaign.html,
          listIds: campaign.listIds,
          exclusionListIds: campaign.exclusionListIds,
        }),
      });
      toast({ title: 'Campaign duplicated', description: 'A draft copy has been created.' });
      fetchCampaigns();
    } catch {
      toast({ title: 'Error', description: 'Failed to duplicate campaign.', variant: 'destructive' });
    }
  };

  const filteredCampaigns = campaigns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.subject.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">Create and manage your email campaigns.</p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No campaigns yet</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              Create your first email campaign to get started.
            </p>
            <Link href="/campaigns/new">
              <Button>Create Campaign</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right">Recipients</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => {
                  const status = statusConfig[campaign.status] || statusConfig.draft;
                  return (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <Link href={`/campaigns/${campaign.id}`} className="font-medium text-primary hover:underline">
                          {campaign.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {campaign.subject}
                      </TableCell>
                      <TableCell className="text-right">{campaign.estimatedRecipients.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{campaign.sentCount.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {campaign.sentAt
                          ? new Date(campaign.sentAt).toLocaleDateString()
                          : campaign.scheduledAt
                          ? new Date(campaign.scheduledAt).toLocaleDateString()
                          : new Date(campaign.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/campaigns/${campaign.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/analytics/campaigns/${campaign.id}`}>
                                <BarChart3 className="mr-2 h-4 w-4" />
                                Analytics
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(campaign)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredCampaigns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No campaigns match your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
