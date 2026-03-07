'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Users, Loader2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { ContactList } from '@signalwave/shared';

interface ContactListsPanelProps {
  lists: ContactList[];
  onRefresh: () => void;
}

export function ContactListsPanel({ lists, onRefresh }: ContactListsPanelProps) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setCreating(true);
      const token = await getToken();
      await api('/contacts/lists', {
        method: 'POST',
        token: token || undefined,
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });
      toast({ title: 'List created', description: `"${name}" has been created.` });
      setName('');
      setDescription('');
      setCreateOpen(false);
      onRefresh();
    } catch {
      toast({ title: 'Error', description: 'Failed to create list.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (listId: string, listName: string) => {
    try {
      const token = await getToken();
      await api(`/contacts/lists/${listId}`, { method: 'DELETE', token: token || undefined });
      toast({ title: 'List deleted', description: `"${listName}" has been deleted.` });
      onRefresh();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete list.', variant: 'destructive' });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Contact Lists</CardTitle>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New List
          </Button>
        </CardHeader>
        <CardContent>
          {lists.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No lists yet. Create one to organize your contacts.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {lists.map((list) => (
                <div key={list.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm truncate">{list.name}</h4>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {list.contactCount} contacts
                      </Badge>
                    </div>
                    {list.description && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{list.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 ml-2"
                    onClick={() => handleDelete(list.id, list.name)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Contact List</DialogTitle>
            <DialogDescription>Create a new list to organize and segment your contacts.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="list-name">List Name</Label>
                <Input
                  id="list-name"
                  placeholder="e.g., Newsletter Subscribers"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="list-desc">Description (optional)</Label>
                <Textarea
                  id="list-desc"
                  placeholder="A brief description of this list..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={creating}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !name.trim()}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create List
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
