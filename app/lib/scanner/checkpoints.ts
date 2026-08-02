import type { ScanScope } from "@/app/lib/ai-settings";

export const frontendScanCheckpoints = [
  "Modern UI libraries & design system usage (shadcn/ui, Magic UI, Aceternity, Tailwind, etc.)",
  "Accessibility (semantic HTML, ARIA, keyboard nav, contrast, alt text)",
  "Design consistency (spacing, typography, color tokens)",
  "Responsive & mobile-first patterns",
  "Dangerous patterns (dangerouslySetInnerHTML, innerHTML, eval)",
  "Client-side secrets or sensitive data in localStorage",
  "Performance risks (large bundles, unoptimized images, heavy client JS)",
  "Animation quality and reduced-motion support",
] as const;

export const backendScanCheckpoints = [
  "Hardcoded secrets, API keys, and credentials",
  "Authentication & authorization gaps",
  "Input validation and injection risks",
  "Insecure API routes / missing rate limiting",
  "Proper error handling (no sensitive data leaked)",
  "Dependency vulnerabilities and outdated packages",
  "Missing security headers and CORS misconfigurations",
  "Unsafe file handling or path traversal risks",
] as const;

export const sharedScanCheckpoints = [
  "Exposed secrets in any file",
  "Vulnerable or abandoned dependencies",
  "Missing or weak security headers (CSP, HSTS, X-Frame-Options, etc.)",
  "Poor TypeScript usage / missing strict mode",
  "Dead code and heavy duplication",
  "Overall code organization and maintainability",
  "Supply-chain and license risks",
  "Missing tests or critical error boundaries",
] as const;

export function scanCheckpointsForScope(scope: ScanScope): readonly string[] {
  if (scope === "frontend") return frontendScanCheckpoints;
  if (scope === "backend") return backendScanCheckpoints;
  return [...frontendScanCheckpoints, ...backendScanCheckpoints, ...sharedScanCheckpoints];
}
