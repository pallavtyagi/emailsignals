export default function ApiReferencePage() {
  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">API Reference</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Complete REST API documentation for SignalWave. All endpoints use JSON and require
          authentication unless noted otherwise.
        </p>
      </div>

      {/* Base URL & Auth */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Authentication</h2>
        <p className="text-muted-foreground">
          All API requests require a Bearer token from Clerk in the <code className="text-xs bg-muted px-1.5 py-0.5 rounded">Authorization</code> header.
          The token must include both a user ID and an organization ID.
        </p>
        <CodeBlock>{`curl -X GET https://api.signalwave.app/v1/campaigns \\
  -H "Authorization: Bearer <clerk_session_token>" \\
  -H "Content-Type: application/json"`}</CodeBlock>

        <h3 className="text-lg font-medium mt-6">Roles</h3>
        <p className="text-sm text-muted-foreground">
          Some endpoints require specific workspace roles. The role is derived from the Clerk
          organization membership.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border rounded-lg">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Role</th>
                <th className="px-4 py-2 text-left font-medium">Permissions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-4 py-2"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">admin</code></td>
                <td className="px-4 py-2 text-muted-foreground">Full access — manage domains, billing, webhooks, team, and all resources</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-2"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">marketer</code></td>
                <td className="px-4 py-2 text-muted-foreground">Create and send campaigns, import contacts, manage templates</td>
              </tr>
              <tr>
                <td className="px-4 py-2"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">viewer</code></td>
                <td className="px-4 py-2 text-muted-foreground">Read-only access to all resources</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-medium mt-6">Error Responses</h3>
        <CodeBlock>{`// Validation Error (422)
{
  "error": {
    "code": "VALIDATION_ERROR",
    "details": { "fieldErrors": {}, "formErrors": [] }
  }
}

// Not Found (404)
{ "error": { "code": "NOT_FOUND" } }

// Unauthorized (401)
{ "error": { "code": "UNAUTHORIZED", "message": "..." } }`}</CodeBlock>

        <h3 className="text-lg font-medium mt-6">Pagination</h3>
        <p className="text-sm text-muted-foreground">
          List endpoints use cursor-based pagination. Pass the <code className="text-xs bg-muted px-1.5 py-0.5 rounded">nextCursor</code> value
          from the response as the <code className="text-xs bg-muted px-1.5 py-0.5 rounded">after</code> query parameter to get the next page.
        </p>
        <CodeBlock>{`GET /v1/campaigns?limit=20
→ { "data": [...], "total": 45, "nextCursor": "clx..." }

GET /v1/campaigns?limit=20&after=clx...
→ { "data": [...], "total": 45, "nextCursor": null }`}</CodeBlock>
      </section>

      {/* Campaigns */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b pb-2">Campaigns</h2>

        <Endpoint method="GET" path="/v1/campaigns" description="List all campaigns">
          <ParamTable
            title="Query Parameters"
            params={[
              ['status', 'string', 'Filter by status (draft, scheduled, sending, sent, paused, cancelled)'],
              ['limit', 'number', 'Max results per page (default: 50, max: 100)'],
              ['after', 'string', 'Cursor for pagination'],
            ]}
          />
          <ResponseBlock>{`{
  "data": [
    {
      "id": "clx...",
      "name": "March Newsletter",
      "subject": "Your monthly update",
      "status": "draft",
      "type": "regular",
      "fromName": "Acme",
      "fromEmail": "hello@acme.com",
      "estimatedRecipients": 1500,
      "sentCount": 0,
      "createdAt": "2026-03-01T00:00:00Z",
      "sentAt": null,
      "scheduledAt": null
    }
  ],
  "total": 12,
  "nextCursor": "clx..."
}`}</ResponseBlock>
        </Endpoint>

        <Endpoint method="POST" path="/v1/campaigns" description="Create a campaign" role="marketer">
          <CodeBlock>{`{
  "name": "March Newsletter",
  "type": "regular",
  "subject": "Your monthly update",
  "previewText": "What's new this month...",
  "fromName": "Acme",
  "fromEmail": "hello@acme.com",
  "replyTo": "support@acme.com",
  "domainId": "clx...",
  "templateId": "clx...",
  "html": "<html>...</html>",
  "listIds": ["clx..."],
  "exclusionListIds": ["clx..."],
  "utmParams": { "source": "email", "medium": "newsletter" },
  "tags": ["monthly", "newsletter"]
}`}</CodeBlock>
        </Endpoint>

        <Endpoint method="GET" path="/v1/campaigns/:id" description="Get a single campaign" />

        <Endpoint method="PATCH" path="/v1/campaigns/:id" description="Update a campaign">
          <p className="text-sm text-muted-foreground">Accepts any subset of the creation fields (except type, domainId, listIds).</p>
        </Endpoint>

        <Endpoint method="POST" path="/v1/campaigns/:id/send" description="Send or schedule a campaign" role="marketer">
          <CodeBlock>{`// Send immediately
{}

// Schedule for later
{ "sendAt": "2026-03-15T09:00:00Z", "timezone": "America/New_York" }`}</CodeBlock>
        </Endpoint>

        <Endpoint method="POST" path="/v1/campaigns/:id/pause" description="Pause a sending campaign" role="marketer" />
        <Endpoint method="POST" path="/v1/campaigns/:id/resume" description="Resume a paused campaign" role="marketer" />
        <Endpoint method="POST" path="/v1/campaigns/:id/cancel" description="Cancel a campaign" role="admin" />
        <Endpoint method="POST" path="/v1/campaigns/:id/duplicate" description="Duplicate a campaign as a new draft" />

        <Endpoint method="POST" path="/v1/campaigns/:id/test" description="Send test emails">
          <CodeBlock>{`{
  "to": ["test@example.com"],
  "testContactId": "clx..."  // optional: use real contact data for merge tags
}`}</CodeBlock>
          <ResponseBlock>{`{
  "sentTo": ["test@example.com"],
  "results": [{ "email": "test@example.com", "status": "sent" }],
  "message": "Test emails dispatched"
}`}</ResponseBlock>
        </Endpoint>
      </section>

      {/* Contacts */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b pb-2">Contacts</h2>

        <Endpoint method="GET" path="/v1/contacts" description="List contacts with filtering">
          <ParamTable
            title="Query Parameters"
            params={[
              ['search', 'string', 'Search by email, first name, or last name'],
              ['status', 'string', 'Filter: subscribed, unsubscribed, bounced, complained'],
              ['tag', 'string', 'Filter by tag'],
              ['listId', 'string', 'Filter by list membership'],
              ['limit', 'number', 'Max results (default: 50, max: 100)'],
              ['after', 'string', 'Cursor for pagination'],
            ]}
          />
          <ResponseBlock>{`{
  "data": [
    {
      "id": "clx...",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "company": "Acme",
      "status": "subscribed",
      "tags": ["newsletter", "vip"],
      "createdAt": "2026-03-01T00:00:00Z"
    }
  ],
  "total": 1500,
  "nextCursor": "clx..."
}`}</ResponseBlock>
        </Endpoint>

        <Endpoint method="POST" path="/v1/contacts" description="Create a contact">
          <CodeBlock>{`{
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "company": "Acme",
  "phone": "+1234567890",
  "tags": ["newsletter"],
  "customFields": { "role": "CTO" },
  "listIds": ["clx..."],
  "consentSource": "signup_form"
}`}</CodeBlock>
        </Endpoint>

        <Endpoint method="GET" path="/v1/contacts/:id" description="Get a contact" />
        <Endpoint method="PATCH" path="/v1/contacts/:id" description="Update a contact (all fields except email)" />
        <Endpoint method="DELETE" path="/v1/contacts/:id" description="Delete a contact" role="admin" />
        <Endpoint method="GET" path="/v1/contacts/:id/activity" description="Get contact activity timeline" />

        <Endpoint method="POST" path="/v1/contacts/:id/tags" description="Add tags to a contact">
          <CodeBlock>{`{ "tags": ["vip", "customer"] }`}</CodeBlock>
        </Endpoint>

        <Endpoint method="DELETE" path="/v1/contacts/:id/tags" description="Remove tags from a contact">
          <CodeBlock>{`{ "tags": ["vip"] }`}</CodeBlock>
        </Endpoint>

        <Endpoint method="POST" path="/v1/contacts/import" description="Import contacts from CSV" role="marketer">
          <p className="text-sm text-muted-foreground">
            Multipart form upload. File field: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">file</code> (max 10MB).
            Additional fields: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">fieldMapping</code> (JSON),
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded ml-1">listIds</code> (JSON),
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded ml-1">onDuplicate</code> (&quot;skip&quot; or &quot;update&quot;).
          </p>
          <ResponseBlock>{`{
  "importJobId": "clx...",
  "status": "queued",
  "message": "CSV import has been queued for processing"
}`}</ResponseBlock>
        </Endpoint>

        <Endpoint method="GET" path="/v1/contacts/import/:id" description="Check import job status" />
      </section>

      {/* Contact Lists */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b pb-2">Contact Lists</h2>

        <Endpoint method="GET" path="/v1/contacts/lists" description="List all contact lists">
          <ResponseBlock>{`{
  "data": [
    {
      "id": "clx...",
      "name": "Newsletter Subscribers",
      "description": "Monthly newsletter list",
      "contactCount": 850,
      "createdAt": "2026-03-01T00:00:00Z"
    }
  ]
}`}</ResponseBlock>
        </Endpoint>

        <Endpoint method="POST" path="/v1/contacts/lists" description="Create a contact list">
          <CodeBlock>{`{ "name": "VIP Customers", "description": "High-value customer segment" }`}</CodeBlock>
        </Endpoint>

        <Endpoint method="DELETE" path="/v1/contacts/lists/:id" description="Delete a list" role="admin" />

        <Endpoint method="POST" path="/v1/contacts/lists/:id/contacts" description="Add contacts to a list">
          <CodeBlock>{`{ "contactIds": ["clx...", "clx..."] }`}</CodeBlock>
          <ResponseBlock>{`{ "added": 2 }`}</ResponseBlock>
        </Endpoint>

        <Endpoint method="DELETE" path="/v1/contacts/lists/:id/contacts" description="Remove contacts from a list">
          <CodeBlock>{`{ "contactIds": ["clx..."] }`}</CodeBlock>
          <ResponseBlock>{`{ "removed": 1 }`}</ResponseBlock>
        </Endpoint>
      </section>

      {/* Domains */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b pb-2">Domains</h2>

        <Endpoint method="GET" path="/v1/domains" description="List all domains">
          <ResponseBlock>{`{
  "data": [
    {
      "id": "clx...",
      "domain": "acme.com",
      "verificationStatus": "VERIFIED",
      "createdAt": "2026-03-01T00:00:00Z"
    }
  ]
}`}</ResponseBlock>
        </Endpoint>

        <Endpoint method="POST" path="/v1/domains" description="Add a new domain" role="admin">
          <CodeBlock>{`{ "domain": "acme.com" }`}</CodeBlock>
        </Endpoint>

        <Endpoint method="POST" path="/v1/domains/:id/verify" description="Trigger manual DNS verification" />

        <Endpoint method="GET" path="/v1/domains/:id/health" description="Check domain health and DNS records">
          <ResponseBlock>{`{
  "domain": "acme.com",
  "dnsRecords": [
    { "type": "SPF", "value": "v=spf1 include:amazonses.com ~all", "status": "valid" },
    { "type": "DKIM", "value": "...", "status": "valid" },
    { "type": "DMARC", "value": "v=DMARC1; p=quarantine", "status": "valid" }
  ],
  "verificationStatus": "VERIFIED"
}`}</ResponseBlock>
        </Endpoint>

        <Endpoint method="DELETE" path="/v1/domains/:id" description="Delete a domain" role="admin" />
      </section>

      {/* Templates */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b pb-2">Templates</h2>

        <Endpoint method="GET" path="/v1/templates" description="List templates">
          <ParamTable
            title="Query Parameters"
            params={[
              ['category', 'string', 'Filter by category'],
              ['search', 'string', 'Search by name'],
              ['limit', 'number', 'Max results (default: 50, max: 100)'],
              ['after', 'string', 'Cursor for pagination'],
            ]}
          />
        </Endpoint>

        <Endpoint method="POST" path="/v1/templates" description="Create a template" role="marketer">
          <CodeBlock>{`{
  "name": "Welcome Email",
  "subject": "Welcome to {{company}}!",
  "previewText": "Thanks for signing up",
  "html": "<html>...</html>",
  "text": "Plain text version...",
  "editorJson": {},
  "category": "onboarding"
}`}</CodeBlock>
        </Endpoint>

        <Endpoint method="GET" path="/v1/templates/:id" description="Get a template" />
        <Endpoint method="PUT" path="/v1/templates/:id" description="Replace a template" role="marketer" />
        <Endpoint method="DELETE" path="/v1/templates/:id" description="Delete a template" role="admin" />
      </section>

      {/* Analytics */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b pb-2">Analytics</h2>

        <Endpoint method="GET" path="/v1/analytics/overview" description="Workspace-wide analytics overview">
          <ParamTable
            title="Query Parameters"
            params={[
              ['from', 'string', 'Start date (ISO 8601)'],
              ['to', 'string', 'End date (ISO 8601)'],
            ]}
          />
          <ResponseBlock>{`{
  "totalSent": 15000,
  "totalDelivered": 14850,
  "avgOpenRate": 24.5,
  "avgClickRate": 3.2,
  "campaignsSent": 8,
  "timeSeries": [
    { "date": "2026-03-01", "sent": 500, "opens": 120, "clicks": 15 },
    { "date": "2026-03-02", "sent": 480, "opens": 115, "clicks": 12 }
  ]
}`}</ResponseBlock>
        </Endpoint>

        <Endpoint method="GET" path="/v1/analytics/campaigns/:id/stats" description="Campaign-specific statistics">
          <ResponseBlock>{`{
  "campaignId": "clx...",
  "sent": 1500,
  "delivered": 1485,
  "deliveryRate": 99.0,
  "opens": 520,
  "uniqueOpens": 365,
  "openRate": 24.6,
  "clicks": 89,
  "uniqueClicks": 48,
  "clickRate": 3.2,
  "bouncedHard": 5,
  "bouncedSoft": 10,
  "bounceRate": 1.0,
  "unsubscribes": 3,
  "unsubscribeRate": 0.2,
  "complaints": 0,
  "complaintRate": 0,
  "failed": 0
}`}</ResponseBlock>
        </Endpoint>

        <Endpoint method="GET" path="/v1/analytics/campaigns/:id/events" description="Campaign event stream">
          <ParamTable
            title="Query Parameters"
            params={[
              ['event_type', 'string', 'Filter: DELIVERED, OPENED, CLICKED, BOUNCED_HARD, BOUNCED_SOFT, COMPLAINED, FAILED'],
              ['limit', 'number', 'Max results (default: 50)'],
              ['after', 'string', 'Cursor for pagination'],
            ]}
          />
          <ResponseBlock>{`{
  "data": [
    {
      "id": "clx...",
      "eventType": "OPENED",
      "contactId": "clx...",
      "occurredAt": "2026-03-01T14:30:00Z"
    }
  ],
  "nextCursor": "clx..."
}`}</ResponseBlock>
        </Endpoint>
      </section>

      {/* AI */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b pb-2">AI</h2>

        <Endpoint method="POST" path="/v1/ai/subject-lines" description="Generate AI subject line suggestions">
          <CodeBlock>{`{
  "campaignName": "March Newsletter",
  "campaignType": "newsletter",
  "targetAudience": "SaaS founders",
  "tone": "professional",
  "industry": "technology",
  "keyPoints": ["product update", "new features"]
}`}</CodeBlock>
        </Endpoint>

        <Endpoint method="POST" path="/v1/ai/email-copy" description="Generate or refine email copy">
          <CodeBlock>{`{
  "subject": "Your monthly update",
  "prompt": "Write a newsletter about our new AI features",
  "tone": "friendly",
  "industry": "technology",
  "targetAudience": "SaaS founders",
  "callToAction": "Try it free",
  "maxLength": 500,
  "existingCopy": "...",
  "action": "generate"
}`}</CodeBlock>
          <p className="text-sm text-muted-foreground mt-2">
            Set <code className="text-xs bg-muted px-1.5 py-0.5 rounded">action</code> to <code className="text-xs bg-muted px-1.5 py-0.5 rounded">&quot;refine&quot;</code> to
            improve existing copy instead of generating from scratch.
          </p>
        </Endpoint>

        <Endpoint method="POST" path="/v1/ai/template-suggestions" description="Get AI template recommendations">
          <CodeBlock>{`{
  "campaignType": "welcome",
  "industry": "e-commerce",
  "goal": "onboard new customers",
  "tone": "friendly"
}`}</CodeBlock>
        </Endpoint>
      </section>

      {/* Billing */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b pb-2">Billing</h2>

        <Endpoint method="GET" path="/v1/billing/subscription" description="Get current subscription" />
        <Endpoint method="GET" path="/v1/billing/usage" description="Get usage summary for current billing period" />

        <Endpoint method="POST" path="/v1/billing/checkout" description="Create a Stripe checkout session" role="admin">
          <CodeBlock>{`{ "plan": "pro" }`}</CodeBlock>
          <ResponseBlock>{`{ "sessionId": "cs_...", "url": "https://checkout.stripe.com/..." }`}</ResponseBlock>
        </Endpoint>

        <Endpoint method="POST" path="/v1/billing/portal" description="Get Stripe customer portal URL" role="admin">
          <ResponseBlock>{`{ "url": "https://billing.stripe.com/..." }`}</ResponseBlock>
        </Endpoint>
      </section>

      {/* Webhooks */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b pb-2">Webhooks</h2>

        <Endpoint method="GET" path="/v1/webhooks" description="List webhook endpoints" />

        <Endpoint method="POST" path="/v1/webhooks" description="Create a webhook endpoint" role="admin">
          <CodeBlock>{`{
  "url": "https://yourapp.com/webhooks/signalwave",
  "events": ["email.delivered", "email.opened", "email.clicked"]
}`}</CodeBlock>
        </Endpoint>

        <Endpoint method="PATCH" path="/v1/webhooks/:id" description="Update a webhook endpoint" role="admin">
          <CodeBlock>{`{ "url": "...", "events": [...], "active": true }`}</CodeBlock>
        </Endpoint>

        <Endpoint method="DELETE" path="/v1/webhooks/:id" description="Delete a webhook endpoint" role="admin" />
      </section>

      {/* Queue Status */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b pb-2">System</h2>

        <Endpoint method="GET" path="/v1/queues/status" description="Get background job queue status" role="admin">
          <ResponseBlock>{`{
  "queues": [
    { "name": "email-send", "active": 5, "waiting": 120, "delayed": 0, "failed": 0, "completed": 5000 },
    { "name": "csv-import", "active": 1, "waiting": 0, "delayed": 0, "failed": 0, "completed": 12 }
  ],
  "timestamp": "2026-03-01T00:00:00Z"
}`}</ResponseBlock>
        </Endpoint>

        <Endpoint method="GET" path="/health" description="Health check (no auth required)" auth={false}>
          <ResponseBlock>{`{
  "status": "ok",
  "timestamp": "2026-03-01T00:00:00Z",
  "version": "1.0.0",
  "uptime": 86400,
  "checks": {
    "database": "ok",
    "redis": "ok",
    "memory": { "used": 128, "total": 512 }
  }
}`}</ResponseBlock>
        </Endpoint>
      </section>
    </div>
  );
}

/* ─── Helper Components ─── */

function Endpoint({
  method,
  path,
  description,
  role,
  auth = true,
  children,
}: {
  method: string;
  path: string;
  description: string;
  role?: string;
  auth?: boolean;
  children?: React.ReactNode;
}) {
  const methodColors: Record<string, string> = {
    GET: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    POST: 'bg-green-500/10 text-green-600 border-green-500/20',
    PATCH: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    PUT: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    DELETE: 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  return (
    <div className="rounded-lg border">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3 bg-muted/30">
        <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-bold ${methodColors[method] || ''}`}>
          {method}
        </span>
        <code className="text-sm font-medium">{path}</code>
        {role && (
          <span className="inline-flex items-center rounded bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-xs text-purple-600">
            {role}
          </span>
        )}
        {!auth && (
          <span className="inline-flex items-center rounded bg-muted border px-2 py-0.5 text-xs text-muted-foreground">
            public
          </span>
        )}
      </div>
      <div className="px-4 py-3 space-y-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        {children}
      </div>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4 overflow-x-auto">
      <pre className="text-xs"><code>{children}</code></pre>
    </div>
  );
}

function ResponseBlock({ children }: { children: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">Response</p>
      <CodeBlock>{children}</CodeBlock>
    </div>
  );
}

function ParamTable({
  title,
  params,
}: {
  title: string;
  params: [string, string, string][];
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border rounded-lg">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-1.5 text-left font-medium text-xs">Parameter</th>
              <th className="px-3 py-1.5 text-left font-medium text-xs">Type</th>
              <th className="px-3 py-1.5 text-left font-medium text-xs">Description</th>
            </tr>
          </thead>
          <tbody>
            {params.map(([name, type, desc]) => (
              <tr key={name} className="border-b last:border-0">
                <td className="px-3 py-1.5"><code className="text-xs bg-muted px-1 rounded">{name}</code></td>
                <td className="px-3 py-1.5 text-xs text-muted-foreground">{type}</td>
                <td className="px-3 py-1.5 text-xs text-muted-foreground">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
