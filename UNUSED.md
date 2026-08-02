# Unused code audit

Audited on 2026-08-02 using repository-wide import, symbol, and package-reference searches. Next.js route handlers, pages, layouts, metadata files, CSS imports, configuration files, and convention-based entrypoints were excluded from the unused-file list because the framework loads them without ordinary imports.

## Unused dependency

- `swr` — declared in the root `package.json`, but no source file imports or requires it.

`tw-animate-css` may look unused to JavaScript-only tools, but it is used by `app/globals.css`. `@radix-ui/react-icons` is used by the installed Magic UI bento grid.

## Unused components and component files

- `components/ui/spotlight-card.tsx` — `SpotlightCard` has no references.
- `components/ui/separator.tsx` — the standalone `Separator` primitive has no references. Separators exported by other menu/select components are separate implementations and are in use.
- `components/ui/radio-group.tsx` — `RadioGroup` and `RadioGroupItem` have no references.
- `app/components/GoogleIcon.tsx` — `GoogleIcon` has no references.
- `app/landing-page/components/Problem.tsx` — `Problem` is not rendered or imported.
- `app/landing-page/shared/Eyebrow.tsx` — referenced only by the unused `Problem` component.
- `app/landing-page/components/Footer.tsx` — unused duplicate landing footer; the application uses `app/components/SiteFooter.tsx`.

## Unused exported code

- `lib/billingsdk-config.ts` — `CurrentPlan`.
- `app/services/githubScanner.ts` — `runGitHubScan`; active scans call `runGitHubScanWithToken`.
- `app/lib/server/supabaseRest.ts` — `isValidHttpsUrl`.
- `app/lib/server/email.ts` — `isEmailConfigured`.
- `app/lib/server/integrationCredentials.ts` — `decryptIntegrationCredential`.
- `app/lib/server/teams.ts` — `getOwnedTeamIds` and `isTeamOwner`.
- `app/lib/tokens.ts` — `STARTER_TOKEN_AMOUNT`, `REFERRAL_REWARD_AMOUNT`, and `isTokenAction`.
- `components/ui/bento-grid.tsx` — `BentoCard` is exported but currently unused; `BentoGrid` is used by the scan summary.

These exports may be intentional public or future-facing APIs. Confirm external consumers before deleting them.

## Removed during this cleanup

- `components/ui/tweet-card.tsx`.
- `app/landing-page/components/FounderPost.tsx`, the only Twitter-card consumer.
- `react-tweet`, which became unnecessary after removing the Twitter component.

## Audit limitation

The preferred dedicated unused-code analyzer could not be downloaded because registry access was unavailable. This list is therefore conservative and contains only high-confidence candidates found through local static references. Dynamic string imports outside Next.js conventions may require manual confirmation.
