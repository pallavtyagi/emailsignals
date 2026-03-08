export default function GettingStartedPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Quick Start</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Get up and running with SignalWave in under 5 minutes.
        </p>
      </div>

      {/* Step 1 */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
            1
          </div>
          <h2 className="text-2xl font-semibold">Create Your Workspace</h2>
        </div>
        <p className="text-muted-foreground">
          After signing up, you&apos;ll be prompted to create a workspace (organization). This is where
          all your campaigns, contacts, and domains are managed. Each workspace is isolated — perfect
          for agencies managing multiple clients.
        </p>
        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <p className="font-medium">Roles</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li><code className="text-xs bg-muted px-1.5 py-0.5 rounded">admin</code> — Full access: manage domains, billing, team members, and all resources</li>
            <li><code className="text-xs bg-muted px-1.5 py-0.5 rounded">marketer</code> — Create campaigns, import contacts, send emails</li>
            <li><code className="text-xs bg-muted px-1.5 py-0.5 rounded">viewer</code> — Read-only access to analytics and reports</li>
          </ul>
        </div>
      </section>

      {/* Step 2 */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
            2
          </div>
          <h2 className="text-2xl font-semibold">Verify Your Sending Domain</h2>
        </div>
        <p className="text-muted-foreground">
          To send emails, you need to verify a domain. This ensures deliverability and prevents your
          emails from landing in spam folders.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Go to <strong>Domains</strong> in the sidebar and click <strong>Add Domain</strong></li>
          <li>Enter your domain (e.g., <code className="text-xs bg-muted px-1.5 py-0.5 rounded">yourdomain.com</code>)</li>
          <li>Add the DNS records shown (SPF, DKIM, DMARC) to your domain registrar</li>
          <li>Click <strong>Verify</strong> — DNS propagation can take up to 48 hours, but usually completes in minutes</li>
        </ol>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium text-amber-600">DNS Records Required</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li><strong>SPF</strong> — Authorizes SignalWave to send on your behalf</li>
            <li><strong>DKIM</strong> — Cryptographically signs your emails</li>
            <li><strong>DMARC</strong> — Tells receivers how to handle failed authentication</li>
          </ul>
        </div>
      </section>

      {/* Step 3 */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
            3
          </div>
          <h2 className="text-2xl font-semibold">Import Your Contacts</h2>
        </div>
        <p className="text-muted-foreground">
          Add your audience manually or import from a CSV file.
        </p>
        <div className="space-y-3 text-sm">
          <div className="rounded-lg border p-4">
            <p className="font-medium">Manual Entry</p>
            <p className="mt-1 text-muted-foreground">
              Go to <strong>Contacts</strong> → <strong>Add Contact</strong>. Enter email, name, company, and tags.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="font-medium">CSV Import</p>
            <p className="mt-1 text-muted-foreground">
              Go to <strong>Contacts</strong> → <strong>Import CSV</strong>. Upload your file (max 10MB), map columns
              to fields, and choose duplicate handling (skip or update). Import runs in the background.
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Organize contacts into <strong>Lists</strong> for targeted campaigns, and use <strong>Tags</strong> for
          flexible segmentation.
        </p>
      </section>

      {/* Step 4 */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
            4
          </div>
          <h2 className="text-2xl font-semibold">Send Your First Campaign</h2>
        </div>
        <p className="text-muted-foreground">
          Create and send an email campaign to your contacts.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Go to <strong>Campaigns</strong> → <strong>New Campaign</strong></li>
          <li>Fill in the campaign details: name, subject line, sender info</li>
          <li>Design your email using the drag-and-drop editor or paste HTML</li>
          <li>Select your audience (contact lists) and exclusion lists</li>
          <li>Send a <strong>test email</strong> to yourself to preview</li>
          <li>Click <strong>Send</strong> to deliver immediately, or <strong>Schedule</strong> for later</li>
        </ol>
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-sm">
          <p className="font-medium text-blue-600">AI Assist</p>
          <p className="mt-1 text-muted-foreground">
            Use the <strong>AI Assistant</strong> to generate compelling subject lines and email copy.
            Navigate to the AI page in the sidebar or use AI suggestions inline while composing.
          </p>
        </div>
      </section>

      {/* Step 5 */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
            5
          </div>
          <h2 className="text-2xl font-semibold">Track Your Results</h2>
        </div>
        <p className="text-muted-foreground">
          Monitor campaign performance from the <strong>Analytics</strong> dashboard. Track delivery rates,
          opens, clicks, bounces, and unsubscribes in real-time. Drill down into individual campaigns
          for detailed event-level data.
        </p>
      </section>

      <div className="rounded-lg border p-6">
        <h3 className="font-semibold">Next Steps</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>Set up <a href="/docs/guides#webhooks" className="text-primary hover:underline">webhooks</a> to receive real-time event notifications</li>
          <li>Explore the <a href="/docs/api" className="text-primary hover:underline">API reference</a> to integrate SignalWave into your stack</li>
          <li>Configure <a href="/docs/guides#billing" className="text-primary hover:underline">billing</a> to unlock higher sending limits</li>
        </ul>
      </div>
    </div>
  );
}
