import Link from 'next/link';
import { Rocket, Code2, Mail, BarChart3, Zap, Shield } from 'lucide-react';

const cards = [
  {
    title: 'Quick Start',
    description: 'Set up your workspace, verify a domain, and send your first campaign in minutes.',
    href: '/docs/getting-started',
    icon: Rocket,
  },
  {
    title: 'API Reference',
    description: 'Complete REST API documentation with authentication, endpoints, and examples.',
    href: '/docs/api',
    icon: Code2,
  },
  {
    title: 'Campaigns',
    description: 'Create, schedule, A/B test, and monitor email campaigns at scale.',
    href: '/docs/features#campaigns',
    icon: Mail,
  },
  {
    title: 'Analytics',
    description: 'Track opens, clicks, bounces, and engagement metrics in real-time.',
    href: '/docs/features#analytics',
    icon: BarChart3,
  },
  {
    title: 'AI Assistant',
    description: 'Generate subject lines, email copy, and template suggestions with AI.',
    href: '/docs/features#ai',
    icon: Zap,
  },
  {
    title: 'Security & Compliance',
    description: 'Domain verification, CAN-SPAM compliance, and unsubscribe handling.',
    href: '/docs/guides#domain-verification',
    icon: Shield,
  },
];

export default function DocsPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">SignalWave Documentation</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Everything you need to build and manage email campaigns with SignalWave.
          From getting started to advanced API integrations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-lg border p-6 transition-colors hover:border-primary/50 hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="font-semibold group-hover:text-primary transition-colors">{card.title}</h2>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{card.description}</p>
            </Link>
          );
        })}
      </div>

      <div className="rounded-lg border bg-muted/30 p-6">
        <h2 className="text-lg font-semibold">Platform Overview</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          SignalWave is an AI-powered email campaign platform built for businesses that demand
          deliverability, compliance, and results. Key capabilities include:
        </p>
        <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <li className="flex items-center gap-2"><span className="text-primary">-</span> Multi-tenant workspaces with role-based access</li>
          <li className="flex items-center gap-2"><span className="text-primary">-</span> Custom domain verification (SPF, DKIM, DMARC)</li>
          <li className="flex items-center gap-2"><span className="text-primary">-</span> Drag-and-drop email editor with templates</li>
          <li className="flex items-center gap-2"><span className="text-primary">-</span> Contact management with lists and tags</li>
          <li className="flex items-center gap-2"><span className="text-primary">-</span> CSV import with field mapping</li>
          <li className="flex items-center gap-2"><span className="text-primary">-</span> AI-powered subject lines and email copy</li>
          <li className="flex items-center gap-2"><span className="text-primary">-</span> Real-time analytics and engagement tracking</li>
          <li className="flex items-center gap-2"><span className="text-primary">-</span> Webhook integrations for event notifications</li>
          <li className="flex items-center gap-2"><span className="text-primary">-</span> CAN-SPAM compliance and one-click unsubscribe</li>
          <li className="flex items-center gap-2"><span className="text-primary">-</span> Stripe-powered billing and usage tracking</li>
        </ul>
      </div>
    </div>
  );
}
