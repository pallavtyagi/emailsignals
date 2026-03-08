export default function GuidesPage() {
  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Guides</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Step-by-step guides for common workflows and integrations.
        </p>
      </div>

      {/* Domain Verification */}
      <section id="domain-verification" className="scroll-mt-20 space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Domain Verification</h2>
        <p className="text-muted-foreground">
          Properly configuring your sending domain is critical for email deliverability.
          This guide walks through the full verification process.
        </p>

        <h3 className="text-lg font-medium mt-6">Required DNS Records</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border rounded-lg">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Record Type</th>
                <th className="px-4 py-2 text-left font-medium">Purpose</th>
                <th className="px-4 py-2 text-left font-medium">Example</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-4 py-2"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">TXT (SPF)</code></td>
                <td className="px-4 py-2 text-muted-foreground">Authorizes SES to send email for your domain</td>
                <td className="px-4 py-2"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">v=spf1 include:amazonses.com ~all</code></td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-2"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">CNAME (DKIM)</code></td>
                <td className="px-4 py-2 text-muted-foreground">3 CNAME records for DKIM signing</td>
                <td className="px-4 py-2"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">selector._domainkey → dkim.amazonses.com</code></td>
              </tr>
              <tr>
                <td className="px-4 py-2"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">TXT (DMARC)</code></td>
                <td className="px-4 py-2 text-muted-foreground">Policy for handling authentication failures</td>
                <td className="px-4 py-2"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">v=DMARC1; p=quarantine; rua=mailto:...</code></td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-medium mt-6">Verification Flow</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Call <code className="text-xs bg-muted px-1.5 py-0.5 rounded">POST /v1/domains</code> with your domain name</li>
          <li>The API returns the required DNS records to add</li>
          <li>Add the records to your DNS provider (Cloudflare, Route 53, GoDaddy, etc.)</li>
          <li>SignalWave automatically polls for verification every 30 seconds</li>
          <li>You can also trigger a manual check via <code className="text-xs bg-muted px-1.5 py-0.5 rounded">POST /v1/domains/:id/verify</code></li>
          <li>Once verified, the domain status changes to <code className="text-xs bg-muted px-1.5 py-0.5 rounded">VERIFIED</code></li>
        </ol>

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium text-amber-600">Common Issues</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>DNS propagation can take up to 48 hours (usually 5-30 minutes)</li>
            <li>Some providers require removing the domain suffix from CNAME records</li>
            <li>Cloudflare users: disable the orange proxy cloud for CNAME records</li>
          </ul>
        </div>
      </section>

      {/* CSV Import */}
      <section id="csv-import" className="scroll-mt-20 space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">CSV Import</h2>
        <p className="text-muted-foreground">
          Import contacts in bulk from CSV files with custom field mapping.
        </p>

        <h3 className="text-lg font-medium mt-6">CSV Format</h3>
        <div className="rounded-lg border bg-muted/30 p-4">
          <pre className="text-xs overflow-x-auto"><code>{`email,first_name,last_name,company,tags
john@example.com,John,Doe,Acme Inc,"lead,newsletter"
jane@example.com,Jane,Smith,Widget Co,"customer,vip"`}</code></pre>
        </div>

        <h3 className="text-lg font-medium mt-6">Field Mapping</h3>
        <p className="text-sm text-muted-foreground">
          When importing via the API, provide a <code className="text-xs bg-muted px-1.5 py-0.5 rounded">fieldMapping</code> array
          to map CSV columns to contact fields:
        </p>
        <div className="rounded-lg border bg-muted/30 p-4">
          <pre className="text-xs overflow-x-auto"><code>{`[
  { "csvColumn": "email", "contactField": "email" },
  { "csvColumn": "first_name", "contactField": "firstName" },
  { "csvColumn": "last_name", "contactField": "lastName" },
  { "csvColumn": "company", "contactField": "company" },
  { "csvColumn": "tags", "contactField": "tags" }
]`}</code></pre>
        </div>

        <h3 className="text-lg font-medium mt-6">Import Options</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><strong>onDuplicate: &quot;skip&quot;</strong> — Skip contacts that already exist (default)</li>
          <li><strong>onDuplicate: &quot;update&quot;</strong> — Update existing contacts with new data</li>
          <li><strong>listIds</strong> — Automatically add imported contacts to specified lists</li>
        </ul>

        <h3 className="text-lg font-medium mt-6">Limits</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>Maximum file size: 10MB</li>
          <li>Imports are processed asynchronously via a background job queue</li>
          <li>Check import status via <code className="text-xs bg-muted px-1.5 py-0.5 rounded">GET /v1/contacts/import/:id</code></li>
        </ul>
      </section>

      {/* Webhooks */}
      <section id="webhooks" className="scroll-mt-20 space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Webhooks</h2>
        <p className="text-muted-foreground">
          Receive real-time event notifications via HTTP webhooks.
        </p>

        <h3 className="text-lg font-medium mt-6">Setting Up a Webhook</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Call <code className="text-xs bg-muted px-1.5 py-0.5 rounded">POST /v1/webhooks</code> with your endpoint URL and event types</li>
          <li>You&apos;ll receive a <code className="text-xs bg-muted px-1.5 py-0.5 rounded">whsec_*</code> signing secret in the response</li>
          <li>Store this secret securely — it&apos;s used to verify webhook signatures</li>
          <li>Your endpoint will receive POST requests with event payloads</li>
        </ol>

        <h3 className="text-lg font-medium mt-6">Event Types</h3>
        <div className="grid gap-2 sm:grid-cols-2 text-sm">
          <div className="rounded border px-3 py-2"><code className="text-xs">email.delivered</code> — Email successfully delivered</div>
          <div className="rounded border px-3 py-2"><code className="text-xs">email.opened</code> — Recipient opened the email</div>
          <div className="rounded border px-3 py-2"><code className="text-xs">email.clicked</code> — Recipient clicked a link</div>
          <div className="rounded border px-3 py-2"><code className="text-xs">email.bounced</code> — Email bounced (hard or soft)</div>
          <div className="rounded border px-3 py-2"><code className="text-xs">email.complained</code> — Recipient marked as spam</div>
          <div className="rounded border px-3 py-2"><code className="text-xs">contact.unsubscribed</code> — Contact unsubscribed</div>
        </div>

        <h3 className="text-lg font-medium mt-6">Verifying Signatures</h3>
        <p className="text-sm text-muted-foreground">
          Each webhook request includes a signature header. Verify it using your signing secret
          to ensure the request is authentic and hasn&apos;t been tampered with.
        </p>
      </section>

      {/* Billing */}
      <section id="billing" className="scroll-mt-20 space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Billing</h2>
        <p className="text-muted-foreground">
          SignalWave uses Stripe for subscription management and billing.
        </p>

        <h3 className="text-lg font-medium mt-6">Subscription Management</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>View your current subscription: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">GET /v1/billing/subscription</code></li>
          <li>Check usage against limits: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">GET /v1/billing/usage</code></li>
          <li>Start a checkout session: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">POST /v1/billing/checkout</code></li>
          <li>Open the billing portal: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">POST /v1/billing/portal</code> — Stripe-hosted page for managing payment methods, invoices, and cancellation</li>
        </ul>
      </section>
    </div>
  );
}
