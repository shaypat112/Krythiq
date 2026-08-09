# Krythiq for AI App Builders

  ## Summary

  Position Krythiq as the tool that answers: “Is my AI-built app ready to launch, what should I fix, and did the fix work?”

  Competitors already cover broad security scanning and pull-request reviews. Krythiq should win through simpler explanations, visual launch
  readiness, exact guided fixes, and verification afterward. Snyk (https://docs.snyk.io/scan-with-snyk/snyk-code), Semgrep
  (https://semgrep.dev/products/semgrep-appsec-platform/), and CodeRabbit (https://docs.coderabbit.ai/guides/code-review-overview) show that
  users value prioritized results, change-focused reviews, and fixes inside GitHub.

  ## First Feature Bundle

  - Add a “Ready to launch?” result with four understandable areas: Security, Reliability, Design quality, and Maintainability.
  - Show a clear result: Ready, Almost ready, or Fix before launch. Include the three most important actions rather than overwhelming users.
  - Expand each finding into a guided fix page showing the exact file, line, current code, replacement code, and a short explanation of what
    could happen if ignored.

  - Offer both “Copy this fix” and “Create a draft GitHub change.” Draft changes must never merge automatically.
  - Add “Check this fix” to rescan only the affected file or area. Show a before/after comparison and mark the issue fixed only when it is no
    longer detected.

  - Group repeated problems into one recommendation, such as “The same custom button appears on 12 pages.”

  ## Product and Data Changes

  - Extend scan results with launch-readiness scores, a plain-language status, priority actions, affected locations, replacement code, and
    verification state.

  - Give every recommendation a stable URL so users can return to it, share it, or open it from a notification.
  - Add draft-change records containing repository, branch, changed files, preview, status, and GitHub link.
  - Request GitHub write access only when the user chooses “Create a draft change.” Existing read-only scanning remains unchanged.
  - Send realtime notifications when a scan finishes, a draft change is ready, a fix passes verification, or a new scan brings back a
    previously fixed problem.

  ## Follow-up Features

  - “Ask about this fix” chat with simple prompts such as “Explain this,” “Can I ignore it?”, and “Give me an easier option.”
  - Automatic review of only new GitHub changes for faster, quieter feedback.
  - Weekly progress email showing problems fixed, new problems, launch-score movement, and the next best action.
  - A private shareable trust report for clients, cofounders, or investors that never exposes source code.
  - Team launch rules that can block approval when login, payments, private data, or critical findings remain unsafe.
  - User-experience previews such as “A customer may see another customer’s order” instead of abstract security terminology.

  ## Test Plan

  - Confirm Frontend, Backend, All, repository, and single-file scans produce understandable launch results.
  - Confirm exact file and line links open the correct recommendation.
  - Confirm copyable fixes preserve formatting and draft GitHub changes only modify approved files.
  - Confirm users can preview and cancel draft changes without changing their repository.
  - Confirm verification distinguishes fixed, still present, and unable to verify.
  - Confirm repeated issues are grouped without hiding affected locations.
  - Confirm private source code and credentials never appear in emails, notifications, or shareable reports.
  - Test explanations with non-security users and require that they can answer: what is wrong, where it is, why it matters, and what to do
    next.

  ## Assumptions

  - The primary audience is people building apps with AI tools.
  - Both copyable fixes and optional draft GitHub changes will be supported.
  - Krythiq remains read-only until the user explicitly authorizes a draft change.
  - Plain language is the default; deeper details remain available behind “Show details.”
  - Automatic merging and automatic production deployment are out of scope.


─ Worked for 2m 56s ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


› ### Task: Resolve all open Dependabot security vulnerabilities in the repository

  We have 5 open Dependabot security alerts across the root directory and the `backend/` directory. Please inspect the lock files (`package-
  lock.json` and `backend/package-lock.json`), identify the direct or transitive dependencies causing these vulnerabilities, and update or
  override them to safe versions.

  ---

  ### Vulnerability Inventory

  1. **Package:** `brace-expansion` (npm)
     - **Target Files:** `backend/package-lock.json` (#90) & `package-lock.json` (#89)
     - **Severity:** High
     - **Issue:** DoS via unbounded intermediate arrays (CVE mitigation bypass).
     - **Action Required:** Update `brace-expansion` (and parent packages like `minimatch` or `glob` if necessary) to the latest secure patch
  version in both root and `backend/`.

  2. **Package:** `fast-uri` (npm)
     - **Target File:** `backend/package-lock.json` (#91)
     - **Severity:** High
     - **Issue:** Host confusion via backslash authority introducer.
     - **Action Required:** Upgrade `fast-uri` in `backend/` to a patched release.

  3. **Package:** `js-yaml` (npm)
     - **Target File:** `package-lock.json` (#94)
     - **Severity:** High (Dev dependency)
     - **Issue:** Quadratic CPU consumption in `!!omap` resolution (CVE-2026-59870).
     - **Action Required:** Upgrade `js-yaml` to the safe release version in the root project lockfile.

  4. **Package:** `postcss` (npm)
     - **Target File:** `package-lock.json` (#93)
     - **Severity:** Moderate
     - **Issue:** Attacker-controlled `sourceMappingURL` reads arbitrary `.map` files when `from` is unset (incomplete fix of GHSA-6g55-p6wh-
  862q).
     - **Action Required:** Upgrade `postcss` to the latest secure version in the root project.

  ---

  ### Execution Instructions

  1. **Analyze Lockfiles:**
     - Run `npm audit` in both the **root** folder and the **`backend/`** folder to identify the dependency trees triggering these alerts.

  2. **Apply Upgrades:**
     - For direct dependencies, update their version in `package.json` / `backend/package.json` and run `npm install`.
     - For nested/transitive dependencies that aren't auto-fixing, use `npm update <package-name>` or npm `overrides` in `package.json` to
  enforce safe minimum versions.

  3. **Verify Fixes:**
     - Run `npm audit` in both directories to ensure **0 high or moderate vulnerabilities** remain.
     - Run existing tests (`npm test`) to confirm no breaking changes were introduced.
