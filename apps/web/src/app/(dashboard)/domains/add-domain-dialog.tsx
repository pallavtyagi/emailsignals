'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface AddDomainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddDomainDialog({ open, onOpenChange, onSuccess }: AddDomainDialogProps) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [domain, setDomain] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const validateDomain = (value: string): boolean => {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
    return domainRegex.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedDomain = domain.trim().toLowerCase();
    if (!trimmedDomain) {
      setError('Domain is required');
      return;
    }

    if (!validateDomain(trimmedDomain)) {
      setError('Please enter a valid domain name (e.g., example.com)');
      return;
    }

    try {
      setSubmitting(true);
      const token = await getToken();
      await api('/domains', {
        method: 'POST',
        token: token || undefined,
        body: JSON.stringify({ domain: trimmedDomain }),
      });
      toast({
        title: 'Domain added',
        description: `${trimmedDomain} has been added. Configure DNS records to verify it.`,
      });
      setDomain('');
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add domain';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Sending Domain</DialogTitle>
          <DialogDescription>
            Enter the domain you want to send emails from. You will need to add DNS records to verify ownership.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Domain Name</Label>
              <Input
                id="domain"
                placeholder="example.com"
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value);
                  setError('');
                }}
                disabled={submitting}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                After adding your domain, you will need to configure SPF, DKIM, and DMARC DNS records
                with your DNS provider. This typically takes a few minutes to propagate.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Domain
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
