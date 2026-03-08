import Link from 'next/link';
import {
  Mail,
  Users,
  Globe,
  BarChart3,
  Zap,
  Shield,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  MousePointerClick,
  Send,
  Code2,
} from 'lucide-react';

const features = [
  {
    icon: Mail,
    title: 'Campaign Builder',
    description:
      'Drag-and-drop email editor with Handlebars merge tags. Create beautiful, responsive emails without writing code.',
  },
  {
    icon: Zap,
    title: 'AI-Powered Writing',
    description:
      'Generate compelling subject lines and email copy with AI. Choose your tone — professional, friendly, urgent, or playful.',
  },
  {
    icon: Users,
    title: 'Audience Management',
    description:
      'Import contacts via CSV, organize into lists, segment with tags. Track subscriptions, bounces, and complaints automatically.',
  },
  {
    icon: Globe,
    title: 'Custom Domains',
    description:
      'Send from your own domain with full SPF, DKIM, and DMARC authentication. Maximize deliverability and brand trust.',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description:
      'Track opens, clicks, bounces, and unsubscribes as they happen. Daily time series charts and per-campaign breakdowns.',
  },
  {
    icon: Shield,
    title: 'Built-In Compliance',
    description:
      'CAN-SPAM footer injection, RFC 8058 one-click unsubscribe, and physical address handling — all automatic.',
  },
];

const stats = [
  { value: '99.5%', label: 'Delivery Rate', icon: Send },
  { value: '<2s', label: 'API Response Time', icon: Zap },
  { value: '10M+', label: 'Emails per Month', icon: Mail },
  { value: '100%', label: 'CAN-SPAM Compliant', icon: Shield },
];

const steps = [
  { step: '1', title: 'Create your workspace', description: 'Sign up and set up your organization in seconds.' },
  { step: '2', title: 'Verify your domain', description: 'Add DNS records to authenticate your sending domain.' },
  { step: '3', title: 'Import contacts', description: 'Upload a CSV or add contacts manually with tags and lists.' },
  { step: '4', title: 'Launch your campaign', description: 'Design your email, pick your audience, and hit send.' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-xl font-bold tracking-tight">
            SignalWave
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition-colors">
              Docs
            </Link>
            <Link href="/docs/api" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition-colors">
              API
            </Link>
            <Link
              href="/sign-in"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-powered email platform
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Email campaigns that{' '}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                actually deliver
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto leading-relaxed">
              Send from your own domain with full authentication. AI writes your copy.
              Real-time analytics track every open and click. Built-in compliance keeps you legal.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl"
              >
                Start Sending Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-8 py-3.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Read the Docs
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="text-center">
                  <Icon className="mx-auto h-5 w-5 text-primary mb-2" />
                  <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to run email campaigns
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From contact management to analytics, SignalWave handles the entire lifecycle.
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="group relative rounded-xl border p-6 transition-all hover:border-primary/40 hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Up and running in minutes
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Four steps from sign-up to your first delivered campaign.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
                  {item.step}
                </div>
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API / Developer Section */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground mb-4">
              <Code2 className="h-3.5 w-3.5" />
              Developer-First
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Full REST API included
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Integrate SignalWave into your stack with a complete API. Manage campaigns, contacts,
              domains, and analytics programmatically. Webhook support for real-time event notifications.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Cursor-based pagination for large datasets',
                'Role-based access control (admin, marketer, viewer)',
                'Webhook endpoints with HMAC signature verification',
                'AI endpoints for subject lines and email copy',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link
                href="/docs/api"
                className="inline-flex items-center text-sm font-medium text-primary hover:underline"
              >
                View API Reference
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-6 overflow-hidden">
            <pre className="text-xs leading-relaxed overflow-x-auto"><code className="text-muted-foreground">{`// Create and send a campaign
const campaign = await fetch('/v1/campaigns', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'March Newsletter',
    subject: 'What\\'s new this month',
    fromName: 'Acme',
    fromEmail: 'hello@acme.com',
    domainId: 'clx...',
    listIds: ['clx...'],
    html: '<h1>Hello {{firstName}}!</h1>',
  }),
});

// Send it
await fetch(\`/v1/campaigns/\${id}/send\`, {
  method: 'POST',
  headers: { 'Authorization': 'Bearer <token>' },
});

// Track results
const stats = await fetch(
  \`/v1/analytics/campaigns/\${id}/stats\`,
  { headers: { 'Authorization': 'Bearer <token>' } }
);
// → { sent: 1500, delivered: 1485,
//     openRate: 24.6, clickRate: 3.2 }`}</code></pre>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Built for teams that take email seriously
            </h2>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border bg-background p-6">
              <MousePointerClick className="h-8 w-8 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">SaaS Companies</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Onboarding sequences, product updates, and re-engagement campaigns. Use the API to trigger sends from your app.
              </p>
            </div>
            <div className="rounded-xl border bg-background p-6">
              <Users className="h-8 w-8 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">Marketing Agencies</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Multi-tenant workspaces let you manage multiple clients. Each workspace has its own domains, contacts, and billing.
              </p>
            </div>
            <div className="rounded-xl border bg-background p-6">
              <Send className="h-8 w-8 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">E-Commerce</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Promotional campaigns, order confirmations, and abandoned cart recovery. CSV import makes migrating from other tools easy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to send better emails?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Create your free workspace and send your first campaign today. No credit card required.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/docs/getting-started"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-8 py-3.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Quick Start Guide
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-8 sm:grid-cols-4">
            <div>
              <p className="font-bold">SignalWave</p>
              <p className="mt-2 text-sm text-muted-foreground">
                AI-powered email campaigns with deliverability you can trust.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold">Product</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li><Link href="/docs/features#campaigns" className="hover:text-foreground transition-colors">Campaigns</Link></li>
                <li><Link href="/docs/features#contacts" className="hover:text-foreground transition-colors">Contacts</Link></li>
                <li><Link href="/docs/features#analytics" className="hover:text-foreground transition-colors">Analytics</Link></li>
                <li><Link href="/docs/features#ai" className="hover:text-foreground transition-colors">AI Assistant</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold">Developers</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li><Link href="/docs" className="hover:text-foreground transition-colors">Documentation</Link></li>
                <li><Link href="/docs/api" className="hover:text-foreground transition-colors">API Reference</Link></li>
                <li><Link href="/docs/guides#webhooks" className="hover:text-foreground transition-colors">Webhooks</Link></li>
                <li><Link href="/docs/getting-started" className="hover:text-foreground transition-colors">Quick Start</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold">Resources</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li><Link href="/docs/guides#domain-verification" className="hover:text-foreground transition-colors">Domain Setup</Link></li>
                <li><Link href="/docs/guides#csv-import" className="hover:text-foreground transition-colors">CSV Import</Link></li>
                <li><Link href="/docs/guides#billing" className="hover:text-foreground transition-colors">Billing</Link></li>
                <li><Link href="/sign-up" className="hover:text-foreground transition-colors">Sign Up</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t pt-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} SignalWave. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
