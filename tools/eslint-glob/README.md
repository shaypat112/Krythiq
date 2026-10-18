# Next.js lint directory matcher

The root package overrides `fast-glob` only within `@next/eslint-plugin-next`
with this private adapter. It removes the dependency chain affected by
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), which
has no patched `braces` release.

The installed Next.js plugin uses only `globSync` with `onlyDirectories: true`
in its `getRootDirs` helper. This adapter preserves that API using `tinyglobby`;
it is not a general replacement for `fast-glob`. Directory expansion is disabled
as required by the [migration guide](https://superchupu.dev/tinyglobby/migration).

`npm test` exercises the installed plugin's resolver and a Next.js lint rule.
Recheck those tests when updating `eslint-config-next`, and remove the adapter
when the upstream dependency chain no longer includes vulnerable `braces`.

Use npm 11.13 or newer to install the local dependency override. CI installs
npm 11.13.0 on Node 22 before running `npm ci`.
