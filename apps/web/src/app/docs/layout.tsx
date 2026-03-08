'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Book,
  Rocket,
  Code2,
  Mail,
  Users,
  Globe,
  BarChart3,
  Zap,
  Shield,
  Webhook,
  CreditCard,
  ArrowLeft,
} from 'lucide-react';

const navigation = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Introduction', href: '/docs', icon: Book },
      { title: 'Quick Start', href: '/docs/getting-started', icon: Rocket },
    ],
  },
  {
    title: 'Features',
    items: [
      { title: 'Campaigns', href: '/docs/features#campaigns', icon: Mail },
      { title: 'Contacts', href: '/docs/features#contacts', icon: Users },
      { title: 'Domains', href: '/docs/features#domains', icon: Globe },
      { title: 'Analytics', href: '/docs/features#analytics', icon: BarChart3 },
      { title: 'AI Assistant', href: '/docs/features#ai', icon: Zap },
    ],
  },
  {
    title: 'Guides',
    items: [
      { title: 'Domain Verification', href: '/docs/guides#domain-verification', icon: Shield },
      { title: 'CSV Import', href: '/docs/guides#csv-import', icon: Users },
      { title: 'Webhooks', href: '/docs/guides#webhooks', icon: Webhook },
      { title: 'Billing', href: '/docs/guides#billing', icon: CreditCard },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { title: 'API Documentation', href: '/docs/api', icon: Code2 },
    ],
  },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col border-r bg-muted/30">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to SignalWave
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {navigation.map((section) => (
            <div key={section.title}>
              <h4 className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </h4>
              <ul className="mt-2 space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/docs' && pathname.startsWith(item.href.split('#')[0]!));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                          isActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile nav */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            SignalWave
          </Link>
          <span className="text-sm font-semibold">Documentation</span>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-10 lg:py-12 lg:mt-0 mt-14">
          {children}
        </div>
      </main>
    </div>
  );
}
