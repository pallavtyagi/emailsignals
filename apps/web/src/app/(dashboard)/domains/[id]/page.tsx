'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Copy,
  RefreshCw,
  Shield,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { Domain, DnsRecord, DomainHealth } from '@signalwave/shared';

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'default' }> = {
  verified: { label: 'Verified', variant: 'success' },
  pending: { label: 'Pending Verification', variant: 'warning' },
  failed: { label: 'Verification Failed', variant: 'destructive' },
  degraded: { label: 'Degraded', variant: 'default' },
};

function DnsRecordRow({ record }: { record: DnsRecord }) {
  const { toast } = useToast();

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied to clipboard.` });
  };

  return (
    <tr className="border-b last:border-0">
      <td className="py-3 px-4">
        <Badge variant="outline" className="font-mono text-xs">
          {record.type}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <code className="text-sm bg-muted px-2 py-1 rounded max-w-xs truncate block">{record.name}</code>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => copyToClipboard(record.name, 'Record name')}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <code className="text-sm bg-muted px-2 py-1 rounded max-w-md truncate block">{record.value}</code>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => copyToClipboard(record.value, 'Record value')}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
      <td className="py-3 px-4 uppercase text-xs font-medium text-muted-foreground">{record.purpose}</td>
      <td className="py-3 px-4">
        {record.valid ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500" />
        )}
      </td>
    </tr>
  );
}

export default function DomainDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const domainId = params.id as string;

  const [domain, setDomain] = useState<Domain | null>(null);
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [health, setHealth] = useState<DomainHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const fetchDomain = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const [domainRes, dnsRes, healthRes] = await Promise.allSettled([
        api<{ data: Domain }>(`/domains/${domainId}`, { token: token || undefined }),
        api<{ data: DnsRecord[] }>(`/domains/${domainId}/dns-records`, { token: token || undefined }),
        api<{ data: DomainHealth }>(`/domains/${domainId}/health`, { token: token || undefined }),
      ]);
      if (domainRes.status === 'fulfilled') setDomain(domainRes.value.data);
      if (dnsRes.status === 'fulfilled') setDnsRecords(dnsRes.value.data || []);
      if (healthRes.status === 'fulfilled') setHealth(healthRes.value.data || null);
    } catch {
      toast({ title: 'Error', description: 'Failed to load domain details.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [domainId, getToken, toast]);

  useEffect(() => {
    fetchDomain();
  }, [fetchDomain]);

  const handleVerify = async () => {
    try {
      setVerifying(true);
      const token = await getToken();
      await api(`/domains/${domainId}/verify`, { method: 'POST', token: token || undefined });
      toast({ title: 'Verification started', description: 'DNS records are being checked. This may take a moment.' });
      await fetchDomain();
    } catch {
      toast({ title: 'Verification failed', description: 'Could not verify domain. Please check your DNS records.', variant: 'destructive' });
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/domains')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Domains
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Domain not found</h3>
            <p className="text-muted-foreground text-sm mt-1">This domain may have been deleted or you do not have access.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusConfig[domain.status] || statusConfig.pending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/domains')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{domain.domain}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Added on {new Date(domain.createdAt).toLocaleDateString()}
            {domain.verifiedAt && ` | Verified on ${new Date(domain.verifiedAt).toLocaleDateString()}`}
          </p>
        </div>
        <Button onClick={handleVerify} disabled={verifying}>
          {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Verify Now
        </Button>
      </div>

      {/* Verification Status Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SPF Record</CardTitle>
            {domain.spfValid ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{domain.spfValid ? 'Configured' : 'Not Configured'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {domain.spfValid
                ? 'SPF is properly configured and verified.'
                : 'Add the SPF TXT record to your DNS.'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DKIM Record</CardTitle>
            {domain.dkimValid ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{domain.dkimValid ? 'Configured' : 'Not Configured'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {domain.dkimValid
                ? 'DKIM signing is enabled and verified.'
                : 'Add the DKIM CNAME record to your DNS.'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DMARC Record</CardTitle>
            {domain.dmarcValid ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{domain.dmarcValid ? 'Configured' : 'Not Configured'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {domain.dmarcValid
                ? 'DMARC policy is set and verified.'
                : 'Add the DMARC TXT record to your DNS.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* DNS Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>DNS Records</CardTitle>
          <CardDescription>
            Add these records to your domain DNS configuration. Click the copy button to copy values.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dnsRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">Type</th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">Name / Host</th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">Value</th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">Purpose</th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dnsRecords.map((record, i) => (
                    <DnsRecordRow key={i} record={record} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>DNS records will appear here once the domain is being processed.</p>
              <p className="text-sm mt-1">Click &quot;Verify Now&quot; to check your domain configuration.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Health Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Domain Health
          </CardTitle>
          <CardDescription>Reputation score and blacklist monitoring for your sending domain.</CardDescription>
        </CardHeader>
        <CardContent>
          {health ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reputation Score</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="text-3xl font-bold">{health.reputationScore}</div>
                    <span className="text-sm text-muted-foreground">/ 100</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        health.reputationScore >= 80
                          ? 'bg-green-500'
                          : health.reputationScore >= 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${health.reputationScore}%` }}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Blacklist Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {health.blacklisted ? (
                      <>
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="text-lg font-semibold text-red-600">Blacklisted</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="text-lg font-semibold text-green-700">Clean</span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Checked</p>
                  <p className="text-lg font-semibold mt-1">
                    {new Date(health.lastCheckedAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {health.blacklistsChecked.length} blacklists checked
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Warmup Status</p>
                <div className="flex items-center gap-4">
                  <Badge variant={domain.warmupEnabled ? 'success' : 'secondary'}>
                    {domain.warmupEnabled ? 'Active' : 'Inactive'}
                  </Badge>
                  {domain.warmupEnabled && (
                    <span className="text-sm text-muted-foreground">Day {domain.warmupDay} of warmup</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Health data will be available once the domain is verified.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
