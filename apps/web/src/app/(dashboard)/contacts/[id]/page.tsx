'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Calendar,
  Loader2,
  AlertTriangle,
  Tag,
  Plus,
  X,
  MousePointerClick,
  Eye,
  MailX,
  Send,
  UserX,
  AlertOctagon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { Contact, EmailEvent } from '@signalwave/shared';

const statusColors: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  subscribed: 'success',
  unsubscribed: 'secondary',
  bounced: 'destructive',
  complained: 'destructive',
};

const eventIcons: Record<string, typeof Mail> = {
  delivered: Send,
  opened: Eye,
  clicked: MousePointerClick,
  bounced_hard: MailX,
  bounced_soft: MailX,
  complained: AlertOctagon,
  unsubscribed: UserX,
  failed: AlertTriangle,
};

const eventLabels: Record<string, string> = {
  delivered: 'Delivered',
  opened: 'Opened',
  clicked: 'Clicked',
  bounced_hard: 'Hard Bounce',
  bounced_soft: 'Soft Bounce',
  complained: 'Complained',
  unsubscribed: 'Unsubscribed',
  failed: 'Failed',
};

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const contactId = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagInput, setTagInput] = useState('');

  const fetchContact = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const [contactRes, eventsRes] = await Promise.allSettled([
        api<{ data: Contact }>(`/contacts/${contactId}`, { token: token || undefined }),
        api<{ data: EmailEvent[] }>(`/contacts/${contactId}/events`, { token: token || undefined }),
      ]);
      if (contactRes.status === 'fulfilled') setContact(contactRes.value.data);
      if (eventsRes.status === 'fulfilled') setEvents(eventsRes.value.data || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load contact.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [contactId, getToken, toast]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  const addTag = async () => {
    const tag = tagInput.trim();
    if (!tag || !contact) return;
    if (contact.tags.includes(tag)) {
      setTagInput('');
      return;
    }

    try {
      const token = await getToken();
      await api(`/contacts/${contactId}/tags`, {
        method: 'POST',
        token: token || undefined,
        body: JSON.stringify({ tag }),
      });
      setContact({ ...contact, tags: [...contact.tags, tag] });
      setTagInput('');
    } catch {
      toast({ title: 'Error', description: 'Failed to add tag.', variant: 'destructive' });
    }
  };

  const removeTag = async (tag: string) => {
    if (!contact) return;
    try {
      const token = await getToken();
      await api(`/contacts/${contactId}/tags/${encodeURIComponent(tag)}`, {
        method: 'DELETE',
        token: token || undefined,
      });
      setContact({ ...contact, tags: contact.tags.filter((t) => t !== tag) });
    } catch {
      toast({ title: 'Error', description: 'Failed to remove tag.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/contacts')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Contacts
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Contact not found</h3>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/contacts')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Contacts
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {contact.firstName || contact.lastName
              ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
              : contact.email}
          </h1>
          <p className="text-muted-foreground mt-1">{contact.email}</p>
        </div>
        <Badge variant={statusColors[contact.status] || 'secondary'} className="text-sm">
          {contact.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Contact Info */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate">{contact.email}</span>
            </div>
            {contact.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">{contact.phone}</span>
              </div>
            )}
            {contact.company && (
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">{contact.company}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm">Added {new Date(contact.createdAt).toLocaleDateString()}</span>
            </div>

            <Separator />

            {/* Tags */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Tags</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {contact.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {contact.tags.length === 0 && (
                  <span className="text-xs text-muted-foreground">No tags</span>
                )}
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  className="h-8 text-sm"
                />
                <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={addTag}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Custom Fields */}
            {Object.keys(contact.customFields).length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <span className="text-sm font-medium">Custom Fields</span>
                  {Object.entries(contact.customFields).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
            <CardDescription>Email events for this contact.</CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No email activity yet.</p>
                <p className="text-xs mt-1">Events will appear here when emails are sent to this contact.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {events.map((event) => {
                  const EventIcon = eventIcons[event.eventType] || Mail;
                  const label = eventLabels[event.eventType] || event.eventType;
                  return (
                    <div key={event.id} className="flex items-start gap-3 py-3 border-b last:border-0">
                      <div className="mt-0.5 rounded-full bg-muted p-2">
                        <EventIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm">{label}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {new Date(event.occurredAt).toLocaleString()}
                          </span>
                        </div>
                        {event.metadata?.linkUrl && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            Link: {event.metadata.linkUrl}
                          </p>
                        )}
                        {event.metadata?.bounceMessage && (
                          <p className="text-xs text-destructive mt-1">{event.metadata.bounceMessage}</p>
                        )}
                        {(event.metadata?.device || event.metadata?.client) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {[event.metadata.device, event.metadata.client, event.metadata.country]
                              .filter(Boolean)
                              .join(' / ')}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
