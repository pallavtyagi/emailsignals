export default function FeaturesPage() {
  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Features</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          A complete overview of SignalWave&apos;s capabilities.
        </p>
      </div>

      {/* Campaigns */}
      <section id="campaigns" className="scroll-mt-20 space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Campaigns</h2>
        <p className="text-muted-foreground">
          Create, manage, and send email campaigns to your audience. SignalWave supports the full
          campaign lifecycle from draft to delivery.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Campaign Types</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Regular broadcasts, scheduled sends, and drip sequences. Each campaign tracks its own
              delivery metrics independently.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Email Editor</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Drag-and-drop visual editor powered by Unlayer. Design responsive emails without writing
              code, or paste raw HTML for full control.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Templates</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Save and reuse email templates across campaigns. Templates support Handlebars merge tags
              for personalization (e.g., <code className="text-xs bg-muted px-1 rounded">{'{{firstName}}'}</code>).
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Test Sends</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Preview your email by sending a test to any email address. Test sends render all merge
              tags with sample or real contact data.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Campaign Actions</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Send immediately, schedule for later, pause mid-send, resume, cancel, or duplicate
              campaigns. Full lifecycle control.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Compliance</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Automatic CAN-SPAM footer injection, one-click unsubscribe headers (RFC 8058), and
              physical address inclusion in every email.
            </p>
          </div>
        </div>
      </section>

      {/* Contacts */}
      <section id="contacts" className="scroll-mt-20 space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Contacts</h2>
        <p className="text-muted-foreground">
          Manage your audience with flexible contact management, lists, tags, and bulk import.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Contact Profiles</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Store email, name, company, phone, custom fields, and consent source for each contact.
              View activity history and engagement timeline.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Lists</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Organize contacts into lists for targeted campaigns. A contact can belong to multiple
              lists. Use exclusion lists to suppress specific segments.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Tags</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Apply tags to contacts for flexible segmentation. Filter contacts by tag, add or remove
              tags in bulk via the API.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">CSV Import</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload CSV files up to 10MB with custom field mapping. Choose to skip or update
              duplicates. Imports are processed asynchronously in the background.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Status Tracking</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Contacts are automatically marked as subscribed, unsubscribed, bounced, or complained
              based on email event feedback.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Search & Filter</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Search contacts by email, name, or company. Filter by status, tag, or list membership.
              Cursor-based pagination for large audiences.
            </p>
          </div>
        </div>
      </section>

      {/* Domains */}
      <section id="domains" className="scroll-mt-20 space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Domains</h2>
        <p className="text-muted-foreground">
          Verify and manage your sending domains for maximum deliverability.
        </p>
        <div className="space-y-3 text-sm">
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Domain Verification</h3>
            <p className="mt-1 text-muted-foreground">
              Add your domain and configure SPF, DKIM, and DMARC records. SignalWave automatically
              polls for DNS propagation and updates verification status.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Health Monitoring</h3>
            <p className="mt-1 text-muted-foreground">
              Check domain health at any time to verify DNS records are correctly configured.
              The health endpoint returns the status of each required DNS record.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">SES Integration</h3>
            <p className="mt-1 text-muted-foreground">
              Domains are verified through Amazon SES for production email delivery. Each domain
              gets its own DKIM signing keys for authenticated sending.
            </p>
          </div>
        </div>
      </section>

      {/* Analytics */}
      <section id="analytics" className="scroll-mt-20 space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Analytics</h2>
        <p className="text-muted-foreground">
          Real-time email engagement tracking and performance metrics.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Workspace Overview</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Aggregate metrics across all campaigns: total sent, delivered, open rate, click rate,
              and bounce rate. Filterable by date range.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Time Series Charts</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Daily breakdown of sends, opens, and clicks over time. Visualize engagement trends
              and identify patterns.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Campaign Stats</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Per-campaign metrics including delivery rate, unique opens, unique clicks, hard/soft
              bounces, unsubscribes, and complaints.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Event Stream</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Paginated event log for each campaign. Filter by event type (delivered, opened,
              clicked, bounced, etc.) for detailed analysis.
            </p>
          </div>
        </div>
      </section>

      {/* AI */}
      <section id="ai" className="scroll-mt-20 space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">AI Assistant</h2>
        <p className="text-muted-foreground">
          AI-powered tools to help you write better emails and improve engagement.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Subject Line Generator</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate compelling subject lines based on your campaign name, type, audience,
              and preferred tone. Get multiple options to choose from.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Email Copy Writer</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate or refine email body copy. Provide a prompt, tone, and call-to-action
              to get AI-crafted email content.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Template Suggestions</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Get AI-recommended template structures based on your campaign type, industry,
              and goals.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Tone Options</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose from professional, friendly, urgent, playful, or formal tones. The AI
              adapts its output to match your brand voice.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
