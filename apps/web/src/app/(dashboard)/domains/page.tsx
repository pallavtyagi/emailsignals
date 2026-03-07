'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Globe, Plus, Search, Shield, AlertTriangle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { AddDomainDialog } from './add-domain-dialog';
import type { Domain } from '@signalwave/shared';

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'default'; icon: typeof CheckCircle2 }> = {
  verified: { label: 'Verified', variant: 'success', icon: CheckCircle2 },
  pending: { label: 'Pending', variant: 'warning', icon: AlertTriangle },
  failed: { label: 'Failed', variant: 'destructive', icon: XCircle },
  degraded: { label: 'Degraded', variant: 'default', icon: AlertTriangle },
};

export default function DomainsPage() {
  const { getToken } = useAuth();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchDomains = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const data = await api<{ data: Domain[] }>('/domains', { token: token || undefined });
      setDomains(data.data || []);
    } catch {
      setDomains([]);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const filteredDomains = domains.filter((d) =>
    d.domain.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDomainAdded = () => {
    setDialogOpen(false);
    fetchDomains();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Domains</h1>
          <p className="text-muted-foreground">Manage your sending domains and DNS verification.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Domain
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : domains.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No domains configured</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              Add your sending domain to start sending emails.
            </p>
            <Button onClick={() => setDialogOpen(true)}>Add Domain</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search domains..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SPF</TableHead>
                  <TableHead>DKIM</TableHead>
                  <TableHead>DMARC</TableHead>
                  <TableHead>Reputation</TableHead>
                  <TableHead className="text-right">Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDomains.map((domain) => {
                  const status = (statusConfig[domain.status] ?? statusConfig['pending'])!;
                  const StatusIcon = status.icon;
                  return (
                    <TableRow key={domain.id}>
                      <TableCell>
                        <Link
                          href={`/domains/${domain.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {domain.domain}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {domain.spfValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        {domain.dkimValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        {domain.dmarcValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        {domain.reputationScore !== null ? (
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{domain.reputationScore}/100</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {new Date(domain.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredDomains.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No domains match your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <AddDomainDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={handleDomainAdded} />
    </div>
  );
}
