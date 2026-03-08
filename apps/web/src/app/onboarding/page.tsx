'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useOrganizationList, useOrganization } from '@clerk/nextjs';
import { CreateOrganization } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Globe, Users, Mail, ArrowRight, Building2 } from 'lucide-react';

const STEPS = [
  {
    id: 'org',
    title: 'Create your workspace',
    description: 'Set up your organization to get started.',
    icon: Building2,
  },
  {
    id: 'domain',
    title: 'Add a sending domain',
    description: 'Verify a domain to send emails from.',
    icon: Globe,
    path: '/domains',
  },
  {
    id: 'contacts',
    title: 'Import your contacts',
    description: 'Upload a CSV or add contacts manually.',
    icon: Users,
    path: '/contacts',
  },
  {
    id: 'campaign',
    title: 'Send your first campaign',
    description: 'Create and launch an email campaign.',
    icon: Mail,
    path: '/campaigns/new',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { orgId } = useAuth();
  const { organization } = useOrganization();
  const { isLoaded } = useOrganizationList();
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  const hasOrg = !!orgId;

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to SignalWave</h1>
          <p className="mt-2 text-muted-foreground">
            Let&apos;s get you set up to start sending email campaigns.
          </p>
        </div>

        {!hasOrg && !showCreateOrg && (
          <Card>
            <CardHeader className="text-center">
              <Building2 className="mx-auto h-12 w-12 text-primary" />
              <CardTitle className="mt-4">Create your workspace</CardTitle>
              <p className="text-sm text-muted-foreground">
                You need a workspace to manage your campaigns, contacts, and domains.
              </p>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button size="lg" onClick={() => setShowCreateOrg(true)}>
                Create Workspace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {!hasOrg && showCreateOrg && (
          <div className="flex justify-center">
            <CreateOrganization
              afterCreateOrganizationUrl="/onboarding"
              appearance={{
                elements: {
                  rootBox: 'w-full max-w-md',
                  card: 'shadow-none border',
                },
              }}
            />
          </div>
        )}

        {hasOrg && (
          <>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex items-center gap-3 pt-6">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Workspace ready: {organization?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Your workspace has been created. Here&apos;s what to do next.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {STEPS.slice(1).map((step, index) => {
                const Icon = step.icon;
                return (
                  <Card
                    key={step.id}
                    className="cursor-pointer transition-colors hover:border-primary/50"
                    onClick={() => step.path && router.push(step.path)}
                  >
                    <CardContent className="flex items-center gap-4 pt-6">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {index + 1}
                      </div>
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{step.title}</p>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="text-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push('/dashboard')}
              >
                Skip to Dashboard
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
