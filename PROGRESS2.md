# Krythiq Progress 2: From Early Product to Scalable Code Intelligence

## Current position

Krythiq now has the first complete vertical slice of an evidence-based code-intelligence system:

1. Normalized JavaScript and TypeScript module facts.
2. Relative, `tsconfig`/`jsconfig` alias, workspace-package, and monorepo resolution.
3. Versioned graph reports, diagnostics, entry-point evidence, and stable finding fingerprints.
4. A “Why is this unused?” report experience.
5. Reachability-aware unused-export candidates.
6. Revision capture and optional base-ref differential analysis.
7. Deterministic structural duplicate candidates.
8. Git-aware, multi-signal engineering-residue findings.
9. Optional advisory semantic review of deterministic duplicate candidates.
10. Revision-bound runtime coverage evidence ingestion.

This is a strong product foundation, but it is not yet a closed-world program analyzer or a horizontally scalable scan platform. Every cleanup and duplicate finding intentionally remains non-destructive.

## Correctness work still required

### Entry-point coverage

- Add explicit per-repository entry-point configuration and an entry-point diagnostics UI.
- Add framework adapters for Vite, Remix, Astro, SvelteKit, Nuxt, Express registration, NestJS, Storybook, common test runners, server actions, cron jobs, workers, and infrastructure handlers.
- Detect package scripts that execute local files without marking arbitrary script text as code.
- Model public versus private workspace packages explicitly.
- Add fixtures from real repositories and track false-positive/false-negative rates per framework.

Launch gate: no high-confidence dead-file finding may be emitted for a framework until its entry-point adapter passes a maintained convention corpus.

### Module resolution

- Support `tsconfig` inheritance, references, conditional exports, import maps, `package.json#imports`, Yarn Plug'n'Play, pnpm layouts, and workspace export subpaths.
- Model CommonJS assignments and destructured `require` precisely.
- Resolve CSS modules, JSON modules, generated virtual modules, and framework-specific aliases.
- Record ambiguous resolution separately from unresolved resolution.
- Add case-sensitivity tests for Linux and path normalization tests for Windows.

### Symbol correctness

- Distinguish value and type namespaces throughout import and re-export propagation.
- Handle default exports, declaration merging, overloads, namespace exports, ambiguous star exports, and local alias chains precisely.
- Add reachable function callers before claiming zero-call functions or unrendered components.
- Add an optional TypeScript checker refinement pass for exact declaration identity.
- Never make semantic analysis availability a requirement for the deterministic scan.

### Duplicate and residue quality

- Calibrate minimum token and line thresholds against a labeled corpus.
- Add deterministic clone families beyond whole-function equality, including bounded token-window clones.
- Exclude generated code, framework boilerplate, test fixtures, migrations, and vendored code using provenance rather than path names alone.
- Add Git rename detection, first-introduced commit, churn, replacement history, and author-independent temporal proximity.
- Join signals at function and export identity rather than only file paths.
- Build a human-reviewed evaluation set for “same responsibility,” “related but distinct,” and intentional duplication.

### Confidence and safety

- Replace scan-global confidence degradation with dependency-cone-specific caveats where safe.
- Define documented reason codes for every confidence transition.
- Preserve analyzer version, configuration digest, source revision, and extraction completeness on every finding.
- Require exact source hashes before proposing any patch.
- Keep automatic deletion disabled until closed-world semantic evidence, framework evidence, runtime caveats, and source-hash guards are all satisfied.

## Platform architecture needed for thousands of users

The current web scan runs inside a Next.js request. That is appropriate for a small beta but not for sustained multi-tenant load.

Target architecture:

```text
API request
→ authenticated scan record
→ durable queue
→ isolated ingestion worker
→ analysis worker
→ optional AI enrichment worker
→ transactional result writer
→ event stream / webhook / notification
```

### Durable jobs

- Move scans out of Route Handler lifetimes into a durable queue such as managed Postgres jobs, SQS, or another operationally supported queue.
- Add explicit states: queued, ingesting, extracting, resolving, analyzing, enriching, completed, failed, canceled, and expired.
- Make every stage idempotent with lease ownership, heartbeat, bounded retries, and dead-letter handling.
- Persist progress events so reconnecting clients do not lose scan status.
- Support cancellation and hard per-tier CPU, memory, file, byte, network, and wall-time budgets.

### Worker isolation

- Run untrusted repository processing in ephemeral containers or microVM-backed sandboxes.
- Disable outbound network after controlled ingestion unless a stage explicitly requires it.
- Use read-only source mounts, non-root users, seccomp/AppArmor where available, and strict temporary-storage quotas.
- Never execute repository scripts during static analysis.
- Separate GitHub credentials, AI credentials, database credentials, and runtime-evidence upload authority.

### Storage model

The current `scan_history.findings` JSONB document is convenient but will become expensive to query and update.

- Keep an immutable scan summary row.
- Add versioned `scan_findings`, `scan_diagnostics`, `scan_entry_points`, and `scan_artifacts` tables.
- Store large graph artifacts in compressed object storage with a content digest and short-lived signed access.
- Index organization, repository, revision, finding fingerprint, status, analyzer version, and creation time.
- Partition or archive high-volume scan/finding data by time and tenant.
- Add retention policies by plan and legal requirement.
- Introduce schema-contract tests and forward/backward readers before changing the finding schema again.

### Incremental analysis and caching

- Hash normalized file contents and cache extraction facts by analyzer version plus content hash.
- Cache resolved module graphs by repository revision and configuration digest.
- On a PR, re-extract changed files and invalidate only affected resolution and reachability regions.
- Keep cache data tenant-scoped and encrypt sensitive artifacts.
- Track cache hit rate, bytes avoided, and analysis time saved.

### API reliability

- Add explicit request and response schemas with runtime validation.
- Version public APIs and webhook payloads.
- Use cursor pagination for scans and findings.
- Add idempotency to scan creation, evidence upload, webhook delivery, and billing operations.
- Use per-user, per-organization, per-repository, and global concurrency limits.
- Return stable error codes rather than relying on message matching.
- Add timeouts and circuit breakers for GitHub, Supabase, Stripe, OSV, Mistral, Groq, and email providers.

## Observability and operations

- Add trace IDs spanning API, queue, worker, AI provider, persistence, webhook, and UI events.
- Emit structured metrics for queue delay, scan duration by stage, repository size, parse coverage, unresolved edges, findings, retries, provider errors, token spend, and gross margin.
- Define service-level objectives for scan acceptance, completion latency, result availability, and webhook delivery.
- Add dashboards and alerts for queue saturation, stuck leases, database pressure, AI cost spikes, GitHub throttling, and elevated false-positive feedback.
- Add replay tooling that can rerun a scan artifact with a pinned analyzer version without contacting GitHub again.
- Add operational runbooks for provider outage, queue backlog, credential leak, bad analyzer release, migration failure, and billing discrepancy.
- Test database backups and point-in-time recovery regularly.

## Security and compliance

- Address the critical/high dependency alerts reported by GitHub before expanding production traffic.
- Add secret scanning and dependency review to CI for Krythiq itself.
- Encrypt provider tokens with envelope encryption and rotate keys.
- Reduce service-role usage and audit every privileged Supabase path.
- Add organization-level RBAC, repository access checks, SCIM/SAML readiness, and audit-log export for larger customers.
- Document source retention, AI-provider data handling, subprocess behavior, and deletion guarantees.
- Add abuse prevention for repository size bombs, decompression bombs, adversarial parser inputs, prompt injection, webhook SSRF, and runtime-evidence flooding.
- Commission penetration testing before enterprise launch.
- Prepare SOC 2 controls only after operational processes actually exist; do not treat paperwork as a substitute for controls.

## Product and UI work

- Add a repository setup screen showing detected framework adapters and editable entry points.
- Add graph exploration: path from entry point, direct importers, re-export chain, unresolved edges, and parse gaps.
- Add PR summary views that default to new findings and clearly separate inherited debt.
- Add finding lifecycle states tied to stable fingerprints across scans.
- Let users mark framework registrations and false positives; feed aggregate reason codes into analyzer prioritization without training on private source.
- Add side-by-side duplicate and semantic-review views with callers, tests, Git history, and behavioral caveats.
- Add runtime-evidence upload documentation and coverage-provider adapters.
- Add organization dashboards for trend, prevented regressions, accepted findings, time-to-resolution, and scan cost.

## Monetization and unit economics

Token pricing currently needs to be connected to measured marginal cost.

- Measure GitHub API cost, worker compute, storage, egress, AI tokens, retries, and support burden per scan tier.
- Define plan limits around repositories, seats, monthly analyzed lines, concurrent scans, retention, PR checks, runtime evidence, and AI enrichment.
- Keep deterministic static analysis available when AI budgets are exhausted.
- Add organization budgets, hard spending caps, usage alerts, invoice reconciliation, and admin-visible cost breakdowns.
- Record reserved versus actual usage and refund failed work transactionally.
- Track gross margin by tier and prevent an unusually large repository from consuming unbounded subsidized compute.
- Offer value-based upgrades: PR gates, longer history, team workflows, policy controls, runtime evidence, enterprise identity, audit exports, and support—not artificial degradation of correctness.

Core business metrics:

- Activation: first repository connected and first actionable finding reviewed.
- Time to value: repository connection to first evidence-backed result.
- Precision proxy: accepted versus false-positive findings by detector and framework.
- Retention: repositories scanning weekly and PR checks active after 4/8/12 weeks.
- Expansion: additional repositories, seats, and enabled PR integrations.
- Cost: infrastructure and AI cost per completed scan and per retained organization.
- Value: regressions prevented, findings resolved, and review time saved.

## Delivery sequence

### Next 30 days

1. Fix dependency vulnerabilities and add CI gates.
2. Add durable scan records and background workers.
3. Normalize the database schema for findings and diagnostics.
4. Add explicit entry-point configuration and the highest-usage framework adapters.
5. Add corpus-based precision tests and production metrics.
6. Expose `baseRef` in the GitHub/PR user flow and installable check-run integration.

### 30–90 days

1. Add incremental extraction caches and object-storage graph artifacts.
2. Add exact TypeScript semantic refinement.
3. Add PR annotations, baseline management, and stable finding lifecycle.
4. Add Git history enrichment and duplicate comparison UI.
5. Add organization concurrency, budgets, retention, and operational dashboards.
6. Begin measured pricing experiments based on real scan costs and retention.

### 90–180 days

1. Expand framework and language coverage according to customer demand.
2. Add enterprise RBAC, SSO, audit export, and data-residency design.
3. Add supported coverage adapters and runtime/static contradiction workflows.
4. Complete load, failure, recovery, and security testing.
5. Establish support and incident-response operations.

## Production-readiness gates

Krythiq should not claim readiness for thousands of users until:

- Scans survive web deploys and worker restarts without duplication or lost charges.
- Tenant concurrency and repository resource limits are enforced.
- Queue backlog and completion SLOs are measured under load.
- Database restore and bad-release rollback are tested.
- Findings can be reproduced from revision, config digest, analyzer version, and stored inputs.
- False-positive rates are measured for the most-used frameworks.
- Runtime or parser uncertainty can never enable a destructive fix.
- Provider outages degrade optional enrichment without losing deterministic results.
- Billing usage reconciles with completed work and tested refunds.
- Critical dependency alerts and high-risk security findings in Krythiq itself are resolved.

The next highest-leverage engineering milestone is the durable job and normalized finding-storage boundary. It removes the largest scalability risk while making later incremental analysis, PR checks, cost accounting, and operational reliability substantially easier.
