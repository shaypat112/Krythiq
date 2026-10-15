# Repository maintenance — October 14, 2026

Guided Fixes and Launch Readiness have been removed, including their pages,
scan navigation, prompt-generation and automatic draft-patch APIs, server helpers,
Token pricing, and current documentation links. Repository scanning, reports,
manual repository workspaces, collaboration, and publishing remain available.
The old product roadmap is explicitly marked historical.

The landing page now has a compact black-and-blue design: a hero with an
interactive R3F system map, one example report, and a closing scan link. The long
scroll narrative and laptop/terminal demonstrations have been removed.

## Cleanup and dependency updates

- Removed unreachable legacy landing, profile, billing, and UI code, plus the
  unused repository analyzer and helper functions.
- Removed unused exports and localized implementation types and helpers.
- Replaced broad `any` types in the AI scanner/service and three API callbacks
  with finding types, inferred result types, and explicit file shapes.
- Removed unused direct SWR, glob, Radix icons, and Framer Motion dependencies.
- Declared directly imported Accordion, server-only, and PostCSS dependencies.
- Updated compatible dependency versions in both lockfiles, including Next.js
  and its ESLint config to 16.4.1, React/React DOM to 19.3.1, R3F to 9.8.2,
  Supabase JS to 2.117.3, and Motion to 14.2.0.
- Added Knip 6.41.0, configured for both the application and the separately
  packaged CLI. The `krythiq` dependency is retained for `krythiq.config.mjs`;
  Knip misidentifies it as a self-reference because the root package has the
  same name as the published CLI.

## Repeatable checks

Run `npm run check:maintenance` for application lint, TypeScript, complete Knip
analysis, and local security/contract/unit tests. Run `npm run build` for the
production build. In `backend`, run `npm run typecheck`, `npm run lint`, and
`npm test` (which also builds the CLI). CI now runs these checks.

Verified: the production build, application and CLI typechecks, complete Knip
analysis, 71 application tests, and 7 CLI tests pass. Browser visual verification
was not performed.

The application suite includes a regression check that the retired routes and
APIs are absent. Existing database contract tests validate source contracts;
they do not connect to a database.

## Remaining maintenance findings

The application lint check passes with 16 warnings in existing code: effect-driven
state updates, a memoization dependency, and internal hard navigations. No
explicit-any or unused-variable warnings remain. These warnings have not been
suppressed or promoted to errors in this change.

The production dependency audit and the backend audit report zero vulnerabilities.
The complete root audit reports five high-severity development-tool findings in
one chain: `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` →
`micromatch` → `braces`. The
[upstream advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists no
patched braces version. npm proposes downgrading the Next.js ESLint configuration
to 14.2.35; that incompatible downgrade was not applied. No audit exceptions were
added.

Major-version upgrades for ESLint, TypeScript, Stripe, Lucide, and backend tooling
were checked and left for separate migrations. Their integration changes are not
required for this feature removal.

## Database migration pending

`supabase/migrations/20261014000000_remove_retired_workflows.sql` removes obsolete
workflow pricing and drops `change_drafts`, `remediation_items`, and
`launch_snapshots`. Applying it deletes the retired workflow records. Historical
billing transactions and the current repository editor tables are retained.

The migration is committed for review and has not been applied to any database.
