# Votrio

Votrio is a code intelligence and application security platform for reviewing GitHub repositories. It combines fast static checks with optional AI-generated repository context, then presents findings, architecture notes, remediation priorities, and scan history in a team-oriented web dashboard.

The repository also contains the publishable `votrio` CLI, which scans local projects and analyzes terminal failures without requiring the web application.

## What it does

- Scans public and authorized private GitHub repositories
- Detects risky code patterns and possible exposed credentials
- Builds a repository profile from languages, manifests, file sizes, and source metrics
- Uses Mistral to produce bounded architecture and security summaries
- Tracks findings, review status, scan history, and recent activity
- Supports teams, environments, notifications, outgoing webhooks, and retention controls
- Provides Stripe-backed billing and account management
- Includes a local CLI for security scans, CI output, and terminal trace analysis

## Architecture

Votrio is split into two applications that share the same product domain but run independently:

```text
┌──────────────────────────────── Web platform ────────────────────────────────┐
│                                                                             │
│  Next.js pages and client UI                                                │
│        │                                                                    │
│        ▼                                                                    │
│  App Router API handlers ──► authentication, teams, billing, settings       │
│        │                                                                    │
│        ├──► GitHub API ──► static rules ──► repository profile              │
│        ├──► Mistral API ──► architecture and security intelligence          │
│        ├──► Supabase ──► users, scans, findings, teams, and activity        │
│        └──► Stripe / Resend / outgoing webhooks                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────── Local CLI ──────────────────────────────────┐
│                                                                             │
│  votrio scan ──► file discovery ──► custom rules + Semgrep + npm audit      │
│  votrio run  ──► wrapped process ──► trace extraction ──► Anthropic         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Web scan flow

1. The browser sends an authenticated repository scan request to `app/api/scan/github`.
2. The server validates the GitHub URL and uses the supplied provider token or server-side GitHub token to read repository metadata and supported source files.
3. The scanner checks TypeScript, JavaScript, Python, Go, Rust, Java, C#, and PHP files. Dependencies, build output, Git metadata, and oversized files are excluded.
4. Findings are normalized and combined with a repository profile.
5. When Mistral is configured, a bounded subset of the scan is used to generate a summary, security posture, strengths, and prioritized recommendations.
6. The result is written to Supabase. Notifications, activity records, retention cleanup, and configured webhook deliveries run after a successful scan.
7. Progress can be returned to the UI over server-sent events; completed reports are available under `/reports`.

Authentication is carried by a Supabase access token. Database access is performed through Supabase REST with the user token so Row Level Security remains the authorization boundary.

## Project structure

```text
app/
├── api/                  # Server-side route handlers
├── auth/                 # Supabase authentication UI
├── dashboard/            # Signed-in overview
├── documentation/        # Product and CLI documentation
├── landing-page/         # Public marketing site
├── lib/                  # Browser utilities and server integrations
│   └── server/           # Auth, teams, webhooks, retention, and AI helpers
├── reports/              # Scan reports and finding detail views
├── routes/               # Scan orchestration
├── scan/                 # Repository scan workspace
├── services/             # GitHub repository scanner
└── settings/             # Account, team, billing, and integration settings

backend/
├── src/commands/         # CLI commands: init, scan, run, and auth
├── src/lib/              # Mistral integration
├── src/utils/            # Configuration, updates, and trace extraction
└── README.md             # Complete CLI documentation

components/
├── ui/                   # Shared Radix-based UI primitives
└── ...                   # Reusable presentation components

supabase/migrations/      # Versioned database additions and RLS policies
public/                   # Static images and social metadata
```

## Technology

- Next.js 16 App Router and React 19
- TypeScript and Tailwind CSS 4
- Supabase Auth, Postgres, REST, and Row Level Security
- Mistral for repository intelligence
- Anthropic for CLI terminal trace analysis
- Stripe for subscriptions and billing
- Resend for transactional email
- Radix UI, Framer Motion, Recharts, and React Three Fiber

## Local development

### Requirements

- Node.js 20.9 or newer
- npm
- A Supabase project with the application schema and RLS policies

The migrations in `supabase/migrations/` contain incremental schema additions. They are not a complete bootstrap of every table currently used by the application.

### Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Create `.env.local` with the services needed for the part of the application you are developing:

```dotenv
# Required by authenticated application features
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Repository access and AI scan summaries
GITHUB_TOKEN=
MISTRAL_API_KEY=
MISTRAL_MODEL=mistral-large-latest

# Public application URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Billing
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO=
STRIPE_PRICE_TEAM=

# Email and waitlist notifications
RESEND_API_KEY=
RESEND_FROM_EMAIL=
WAITLIST_NOTIFY_EMAIL=

# Privileged server operations
SUPABASE_SERVICE_ROLE_KEY=
```

Never expose `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, or provider API keys through a `NEXT_PUBLIC_` variable.

`GITHUB_TOKEN`, Mistral, Stripe, Resend, and service-role credentials are feature-specific. The Supabase public URL and anon key are required for authentication and most dashboard workflows.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm start` | Run the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Check TypeScript without emitting files |
| `npm run install:backend` | Install and build the CLI package |
| `npm run build:backend` | Build the existing CLI installation |

## CLI

The CLI lives in `backend/` and has its own dependencies and release lifecycle:

```bash
cd backend
npm install
npm run build
node dist/index.js --help
```

Common workflows:

```bash
votrio init
votrio scan
votrio scan --ci --fail-on high --format sarif
votrio run "npm test"
```

The base local scan does not send source code to an AI provider. AI-assisted scan summaries require an explicit `--ai` option and Mistral credentials. Terminal trace analysis uses Anthropic unless it is disabled with `--no-ai`.

See [`backend/README.md`](backend/README.md) for installation, configuration, custom rules, CI usage, publishing, and the full command reference.

## Design principles

- **Server-owned integrations:** provider credentials, billing operations, and privileged data access stay in server route handlers.
- **User-scoped data:** Supabase access tokens and Row Level Security keep reports and settings scoped to the authenticated user or team.
- **Bounded analysis:** scans limit file types, file count, file size, and AI context to keep work predictable.
- **Graceful degradation:** static scanning remains useful when optional AI, email, or webhook integrations are unavailable.
- **Traceable findings:** each finding includes a location, severity, rule type, source, explanation, and suggested next action where available.
- **Separated delivery surfaces:** the hosted dashboard and local CLI can evolve and deploy independently.

## Deployment

Build the web application with:

```bash
npm run build
npm start
```

For production, configure the environment variables above, apply the required Supabase schema and RLS policies, register the Stripe webhook at `/api/stripe/webhook`, and set `NEXT_PUBLIC_SITE_URL` to the public origin.

Before opening a change, run:

```bash
npm run lint
npm run typecheck
npm run build
```
