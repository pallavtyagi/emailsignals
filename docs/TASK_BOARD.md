# SignalWave - Task Board

## Team

| Role | ID | Focus |
|---|---|---|
| Lead/Architect | `lead-architect` | Scaffold, infra, SES pipeline, compliance, hardening |
| Frontend Engineer | `frontend` | Next.js UI, shadcn/ui, Unlayer editor, dashboards |
| Backend Engineer | `backend` | Fastify API, BullMQ workers, Stripe, event processing |
| AI Engineer | `ai-engineer` | Claude API integration, prompt engineering, E2E testing |

---

## Sprint 1 (Week 1-2) - Foundation

| # | Task | Owner | Blocked By |
|---|---|---|---|
| 1 | Scaffold Turborepo monorepo | Lead | - |
| 2 | Terraform infrastructure (SES, S3, IAM, SNS) | Lead | #1 |
| 3 | GitHub Actions CI/CD workflows | Lead | #1 |
| 4 | Prisma database schema | Lead | #1 |
| 5 | Next.js 14 frontend scaffold (shadcn/ui) | Frontend | #1 |
| 6 | Fastify API server scaffold | Backend | #1, #4 |
| 7 | Shared package (types, Zod schemas, constants) | Lead | #1 |
| 8 | AI service package (Claude API) | AI | #1 |
| 9 | Clerk auth integration (frontend) | Frontend | #5 |
| 10 | Clerk auth middleware (API) | Backend | #6 |

**Parallel tracks after Task #1:**
- Lead: #2, #3, #4, #7 (sequentially, #2/#3 can overlap with #4/#7)
- Frontend: #5 then #9
- Backend: waits for #4, then #6, then #10
- AI: #8

---

## Sprint 2 (Week 3-4) - Core Features

| # | Task | Owner | Blocked By |
|---|---|---|---|
| 11 | Domain management API (SES integration) | Lead | #2, #6, #10 |
| 12 | Domain management dashboard UI | Frontend | #9, #11 |
| 13 | Contact management API (CSV import) | Backend | #6, #10 |
| 14 | Contact management UI (import flow) | Frontend | #9, #13 |
| 15 | AI subject line generator | AI | #8 |
| 16 | AI email copy writer | AI | #8 |

**Parallel tracks:**
- Lead: #11 (domain API + SES + verification worker)
- Frontend: #12 (domains UI), then #14 (contacts UI)
- Backend: #13 (contacts API + CSV import)
- AI: #15 and #16 in parallel

---

## Sprint 3 (Week 5-6) - Campaign Engine

| # | Task | Owner | Blocked By |
|---|---|---|---|
| 17 | Unlayer email editor integration | Frontend | #9, #7 |
| 18 | Campaign builder wizard UI | Frontend | #17, #14, #12, #15 |
| 19 | Campaign API (CRUD + send orchestration) | Backend | #13, #11, #6 |
| 20 | Email sending worker (SES, rate limiting, warm-up) | Lead | #19, #11 |
| 21 | AI template suggester | AI | #8, #17 |

**Parallel tracks:**
- Lead: #20 (sending pipeline)
- Frontend: #17 then #18 (editor then campaign wizard)
- Backend: #19 (campaign API)
- AI: #21 (template suggestions)

---

## Sprint 4 (Week 7-8) - Analytics, Billing, Polish

| # | Task | Owner | Blocked By |
|---|---|---|---|
| 22 | SES event webhook processor + auto-suppression | Backend | #20, #2 |
| 23 | Analytics dashboard (stats + charts) | Frontend | #22, #18 |
| 24 | Stripe billing (plans, usage, overage) | Backend | #10, #19 |
| 25 | Compliance (unsubscribe, headers, CAN-SPAM) | Lead | #20 |
| 26 | Production hardening (monitoring, security) | Lead | #6, #5 |
| 27 | Settings pages (workspace, team, branding) | Frontend | #9, #10 |
| 28 | End-to-end testing (full lifecycle) | AI | #20, #22, #23, #24, #25 |

**Parallel tracks:**
- Lead: #25 (compliance), #26 (hardening)
- Frontend: #23 (analytics), #27 (settings)
- Backend: #22 (event processing), #24 (billing)
- AI: #28 (E2E testing after all features complete)

---

## Dependency Graph

```
#1 (Monorepo Scaffold)
├── #2 (Terraform) ──────────────┐
├── #3 (CI/CD)                   │
├── #4 (Prisma Schema) ──┐       │
├── #7 (Shared Package)  │       │
│   └── #17 (Unlayer)    │       │
├── #8 (AI Package)      │       │
│   ├── #15 (AI Subject) │       │
│   ├── #16 (AI Copy)    │       │
│   └── #21 (AI Templates)       │
├── #5 (Next.js) ────────┤       │
│   ├── #9 (Clerk FE)    │       │
│   │   ├── #12 (Domain UI)      │
│   │   ├── #14 (Contact UI)     │
│   │   ├── #17 (Unlayer)        │
│   │   └── #27 (Settings)       │
│   └── #26 (Hardening)  │       │
└── #6 (Fastify) ────────┘       │
    ├── #10 (Clerk API)          │
    │   ├── #13 (Contact API)    │
    │   ├── #24 (Billing)        │
    │   └── #27 (Settings)       │
    ├── #11 (Domain API) ────────┘
    │   ├── #12 (Domain UI)
    │   ├── #19 (Campaign API)
    │   └── #20 (Send Worker)
    ├── #13 (Contact API)
    │   ├── #14 (Contact UI)
    │   └── #19 (Campaign API)
    └── #26 (Hardening)

#18 (Campaign Wizard) ← #17, #14, #12, #15
#19 (Campaign API) ← #13, #11
#20 (Send Worker) ← #19, #11
#22 (Event Processor) ← #20, #2
#23 (Analytics) ← #22, #18
#24 (Billing) ← #10, #19
#25 (Compliance) ← #20
#28 (E2E Tests) ← #20, #22, #23, #24, #25
```

---

## Per-Engineer Task Sequence

### Lead/Architect (8 tasks)
`#1` → `#2` + `#3` + `#4` + `#7` → `#11` → `#20` → `#25` + `#26`

### Frontend Engineer (8 tasks)
`#5` → `#9` → `#12` + `#14` → `#17` → `#18` → `#23` + `#27`

### Backend Engineer (6 tasks)
`#6` → `#10` → `#13` → `#19` → `#22` + `#24`

### AI Engineer (6 tasks)
`#8` → `#15` + `#16` → `#21` → `#28`
