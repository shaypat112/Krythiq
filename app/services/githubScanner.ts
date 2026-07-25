import path from "path";
import { scannerPolicy, securityRuleRegistry } from "@/app/lib/scanner/rules/registry";

export type Severity = "low" | "medium" | "high" | "critical";

export type ScanOptions = {
  fix?: boolean;
  ci?: boolean;
  ai?: boolean;
  aiModel?: string;
  failOn?: Severity;
  format?: "text" | "json" | "markdown";
  ignore?: string[];
};

export type Finding = {
  file: string;
  line: number;
  severity: Severity;
  score: number;
  type: string;
  message: string;
  snippet?: string;
  suggestion?: string;
  source: "regex" | "ai";
  category?: "code" | "secrets";
  confidence?: "high";
  advisoryId?: string;
  technicalDetails?: string;
};

export type RepositoryProfile = {
  metadata: {
    description: string | null;
    defaultBranch: string;
    visibility: string;
    stars: number;
    forks: number;
    openIssues: number;
    sizeKb: number;
    pushedAt: string | null;
  };
  metrics: {
    repositoryFiles: number;
    scannedFiles: number;
    scannedLines: number;
    scannedBytes: number;
    directories: number;
  };
  languages: Array<{ name: string; bytes: number; files: number; lines: number; percent: number }>;
  fileTypes: Array<{ name: string; files: number; lines: number }>;
  largestFiles: Array<{ path: string; bytes: number; lines: number }>;
  manifests: string[];
};

export type SystemDesignScenario = {
  id: "traffic-spike" | "data-growth" | "dependency-failure" | "multi-region" | "cost-pressure";
  title: string;
  status: "ready" | "watch" | "risk" | "unknown";
  confidence: "low" | "medium";
  reflection: string;
  evidence: string[];
  nextStep: string;
};

export type SystemDesignAssessment = {
  summary: string;
  disclaimer: string;
  scenarios: SystemDesignScenario[];
};

export type ScanStage =
  | "validating"
  | "cloning"
  | "detecting"
  | "reading"
  | "analyzing"
  | "recommendations";

export type ScanProgress = (stage: ScanStage, detail: string) => void;

function isValidGitHubUrl(repoUrl: string) {
  const pattern = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?\/?$/;
  return pattern.test(repoUrl.trim());
}

function extractRepoName(repoUrl: string) {
  const trimmed = repoUrl.replace(/\/$/, "").replace(/\.git$/, "");
  const parts = trimmed.split("/");
  return parts.slice(-2).join("/");
}

type RepositoryFile = { path: string; content: string };

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript", ".jsx": "JavaScript",
  ".py": "Python", ".go": "Go", ".rs": "Rust", ".java": "Java", ".cs": "C#", ".php": "PHP",
};

function buildRepositoryProfile(input: {
  repository: {
    description: string | null;
    default_branch: string;
    visibility?: string;
    private: boolean;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    size: number;
    pushed_at: string | null;
  };
  tree: Array<{ path: string; type: string; size?: number }>;
  files: RepositoryFile[];
  manifests: string[];
  languageBytes: Record<string, number>;
}): RepositoryProfile {
  const languageStats = new Map<string, { files: number; lines: number }>();
  const fileTypeStats = new Map<string, { files: number; lines: number }>();
  const largestFiles: RepositoryProfile["largestFiles"] = [];
  let scannedLines = 0;
  let scannedBytes = 0;

  for (const file of input.files) {
    const extension = path.extname(file.path).toLowerCase() || "other";
    const language = LANGUAGE_BY_EXTENSION[extension] ?? extension.replace(".", "").toUpperCase();
    const lines = file.content ? file.content.split("\n").length : 0;
    const bytes = Buffer.byteLength(file.content, "utf8");
    scannedLines += lines;
    scannedBytes += bytes;
    const languageEntry = languageStats.get(language) ?? { files: 0, lines: 0 };
    languageEntry.files += 1;
    languageEntry.lines += lines;
    languageStats.set(language, languageEntry);
    const typeEntry = fileTypeStats.get(extension) ?? { files: 0, lines: 0 };
    typeEntry.files += 1;
    typeEntry.lines += lines;
    fileTypeStats.set(extension, typeEntry);
    largestFiles.push({ path: file.path, bytes, lines });
  }

  const totalLanguageBytes = Object.values(input.languageBytes).reduce((sum, bytes) => sum + bytes, 0);
  const languageNames = new Set([...Object.keys(input.languageBytes), ...languageStats.keys()]);
  const languages = [...languageNames].map((name) => ({
    name,
    bytes: input.languageBytes[name] ?? 0,
    files: languageStats.get(name)?.files ?? 0,
    lines: languageStats.get(name)?.lines ?? 0,
    percent: totalLanguageBytes ? Math.round(((input.languageBytes[name] ?? 0) / totalLanguageBytes) * 1000) / 10 : 0,
  })).sort((a, b) => b.bytes - a.bytes || b.lines - a.lines);

  return {
    metadata: {
      description: input.repository.description,
      defaultBranch: input.repository.default_branch,
      visibility: input.repository.visibility ?? (input.repository.private ? "private" : "public"),
      stars: input.repository.stargazers_count,
      forks: input.repository.forks_count,
      openIssues: input.repository.open_issues_count,
      sizeKb: input.repository.size,
      pushedAt: input.repository.pushed_at,
    },
    metrics: {
      repositoryFiles: input.tree.filter((entry) => entry.type === "blob").length,
      scannedFiles: input.files.length,
      scannedLines,
      scannedBytes,
      directories: input.tree.filter((entry) => entry.type === "tree").length,
    },
    languages,
    fileTypes: [...fileTypeStats].map(([name, value]) => ({ name, ...value })).sort((a, b) => b.lines - a.lines),
    largestFiles: largestFiles.sort((a, b) => b.bytes - a.bytes).slice(0, 8),
    manifests: input.manifests,
  };
}

function shouldScanFile(filePath: string, ignore: Set<string>) {
  const segments = filePath.split("/");
  const baseName = segments.at(-1)?.toLowerCase() ?? "";
  return (
    !segments.some((segment) => ignore.has(segment)) &&
    (scannerPolicy.extensions.has(path.extname(filePath).toLowerCase()) ||
      scannerPolicy.securityConfigFiles.has(baseName))
  );
}

function buildSystemDesignAssessment(
  files: RepositoryFile[],
  tree: Array<{ path: string; type: string }>,
  manifests: string[],
): SystemDesignAssessment {
  const paths = tree.map((entry) => entry.path.toLowerCase());
  const searchable = files.map((file) => `${file.path}\n${file.content}`).join("\n").toLowerCase();
  const evidenceFor = (signals: Array<[string, boolean]>) => signals.filter(([, present]) => present).map(([label]) => label);
  const hasRuntime = manifests.length > 0 || paths.some((file) => /(?:server|api|route|handler|controller)/.test(file));

  const trafficEvidence = evidenceFor([
    ["Caching or Redis references", /\b(redis|cache-control|unstable_cache|memcached)\b/.test(searchable)],
    ["Rate-limiting references", /\b(rate.?limit|throttl)/.test(searchable)],
    ["Queue or worker references", /\b(queue|worker|bullmq|celery|sidekiq|kafka|sqs)\b/.test(searchable)],
  ]);
  const dataEvidence = evidenceFor([
    ["Database schema or migrations", paths.some((file) => /(?:migration|schema|prisma|drizzle)/.test(file))],
    ["Pagination references", /\b(cursor|pagination|page.?size|limit\s*[:=(])/.test(searchable)],
    ["Index definitions", /\b(create\s+(?:unique\s+)?index|@@index|index\s*[:(])/.test(searchable)],
  ]);
  const failureEvidence = evidenceFor([
    ["Health-check route", paths.some((file) => /health|readiness|liveness/.test(file))],
    ["Retry or backoff logic", /\b(retr(?:y|ies)|backoff|circuit.?breaker)\b/.test(searchable)],
    ["Structured logging or error monitoring", /\b(sentry|datadog|opentelemetry|pino|winston|structlog)\b/.test(searchable)],
  ]);
  const regionEvidence = evidenceFor([
    ["Infrastructure configuration", paths.some((file) => /(?:terraform|pulumi|kubernetes|k8s|cloudformation|vercel\.json)/.test(file))],
    ["External session or cache store", /\b(redis|database.?session|session.?store)\b/.test(searchable)],
    ["Object storage references", /\b(s3|blob storage|cloudinary|supabase\.storage)\b/.test(searchable)],
  ]);
  const costEvidence = evidenceFor([
    ["Background jobs or queues", /\b(queue|worker|cron|scheduler)\b/.test(searchable)],
    ["Usage limits or budgets", /\b(budget|quota|usage.?limit|max_tokens)\b/.test(searchable)],
    ["Request caching", /\b(cache-control|unstable_cache|redis)\b/.test(searchable)],
  ]);

  const scenario = (
    id: SystemDesignScenario["id"],
    title: string,
    evidence: string[],
    riskReflection: string,
    readyReflection: string,
    nextStep: string,
  ): SystemDesignScenario => ({
    id,
    title,
    status: !hasRuntime ? "unknown" : evidence.length >= 2 ? "ready" : evidence.length === 1 ? "watch" : "risk",
    confidence: evidence.length > 0 ? "medium" : "low",
    reflection: !hasRuntime
      ? "This repository does not expose enough runtime structure for a useful static assessment."
      : evidence.length >= 2 ? readyReflection : riskReflection,
    evidence: evidence.length > 0 ? evidence : ["No clear implementation signal found in supported files"],
    nextStep,
  });

  const scenarios = [
    scenario("traffic-spike", "10× traffic spike", trafficEvidence, "A sudden traffic spike may reach application or database limits directly because protective capacity signals were not clear.", "The repository shows multiple traffic-control primitives, but load testing is still needed to find the real ceiling.", "Add a request limit to your busiest API route, then run a basic load test."),
    scenario("data-growth", "100× data growth", dataEvidence, "Large tables and list endpoints may slow down as data grows; pagination and index strategy are not evident.", "Schema, pagination, or indexing signals suggest data growth has been considered, but query plans remain unverified.", "Show long lists one page at a time, then add an index for the field users search most."),
    scenario("dependency-failure", "Upstream outage", failureEvidence, "A slow or unavailable dependency may cascade into user-facing failures because resilience and observability signals are limited.", "Health, retry, or observability primitives are present, reducing—but not eliminating—cascade risk.", "Make external requests stop after 10 seconds and retry no more than twice."),
    scenario("multi-region", "Multi-region deployment", regionEvidence, "State placement and infrastructure topology are unclear, so adding regions could introduce session, storage, or consistency failures.", "The repository contains some portable infrastructure or external-state signals; consistency requirements still need an explicit design.", "Stay in one region for now and write down where logins, uploads, and database writes live."),
    scenario("cost-pressure", "10× usage cost", costEvidence, "Usage may scale cost linearly because caching, quotas, and asynchronous work controls are not obvious.", "The repository contains cost-control primitives, but production usage and unit economics must confirm their effect.", "Turn on a cloud spending alert and track the cost of one successful user request."),
  ];
  const risks = scenarios.filter((item) => item.status === "risk").length;

  return {
    summary: !hasRuntime
      ? "System-design readiness is unknown because this repository exposes limited runtime structure."
      : risks > 0
        ? `${risks} of ${scenarios.length} growth scenarios lack clear safeguards in the scanned repository.`
        : "The repository contains useful scalability signals across the assessed scenarios.",
    disclaimer: "This is a static, repository-evidence review—not a capacity test. Infrastructure, production traffic, data shape, and managed-service configuration may change the outcome.",
    scenarios,
  };
}

async function scanFiles(files: RepositoryFile[], options: ScanOptions, onProgress?: ScanProgress) {
  const ignore = new Set(scannerPolicy.defaultIgnoreDirectories);
  for (const entry of options.ignore ?? []) {
    ignore.add(entry);
  }

  const selectedFiles = files.filter((file) => shouldScanFile(file.path, ignore));
  onProgress?.("reading", `Reading ${selectedFiles.length} supported source file${selectedFiles.length === 1 ? "" : "s"}.`);
  onProgress?.("analyzing", "Reviewing supported source files for risky code and exposed credentials.");
  const findings: Finding[] = [];

  for (const file of selectedFiles) {
    const content = file.content;
    const lines = content.split("\n");
    for (const rule of securityRuleRegistry.rules) {
      const matches = [...content.matchAll(rule.pattern)];
      for (const match of matches) {
        const line = content.slice(0, match.index ?? 0).split("\n").length;
        const sourceLine = lines[line - 1]?.trim() ?? "";
        if (rule.validator && !rule.validator(match, sourceLine)) continue;
        findings.push({
          file: file.path,
          line,
          severity: rule.severity,
          score: rule.score,
          type: rule.id,
          message: rule.message,
          snippet: sourceLine,
          suggestion: rule.suggestion,
          source: "regex",
          category: rule.category,
          confidence: "high",
          advisoryId: rule.advisoryId,
          technicalDetails: `Matched Votrio ruleset ${securityRuleRegistry.rulesetVersion}, rule ${rule.id}, in ${file.path}:${line}.`,
        });
      }
    }
  }

  const map = new Map<string, Finding>();
  for (const f of findings) {
    const key = `${f.file}:${f.line}:${f.type}`;
    if (!map.has(key)) map.set(key, f);
  }

  return [...map.values()].sort(
    (a, b) => b.score - a.score,
  );
}

export async function runGitHubScan(
  repoUrl: string,
  options: ScanOptions = {},
  onProgress?: ScanProgress,
) {
  return runGitHubScanWithToken(repoUrl, options, undefined, onProgress);
}

export async function runGitHubScanWithToken(
  repoUrl: string,
  options: ScanOptions = {},
  providerToken?: string,
  onProgress?: ScanProgress,
) {
  if (!isValidGitHubUrl(repoUrl)) {
    throw new Error("Invalid GitHub repository URL.");
  }

  onProgress?.("validating", "Repository URL validated. Preparing read-only GitHub API access.");
  const repoName = extractRepoName(repoUrl);
  const [owner, repo] = repoName.split("/");
  const token = providerToken ?? process.env.GITHUB_TOKEN;
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "User-Agent": "votrio-scanner",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const githubRequest = async <T>(endpoint: string): Promise<T> => {
    const response = await fetch(`https://api.github.com${endpoint}`, {
      headers,
      cache: "no-store",
    });
    if (!response.ok) {
      const requestError = new Error(`GitHub API request failed (${response.status}).`) as Error & { status?: number };
      requestError.status = response.status;
      throw requestError;
    }
    return response.json() as Promise<T>;
  };

  try {
    onProgress?.("cloning", "Reading the default branch through the GitHub API.");
    const repository = await githubRequest<{
      description: string | null; default_branch: string; visibility?: string; private: boolean;
      stargazers_count: number; forks_count: number; open_issues_count: number; size: number; pushed_at: string | null;
    }>(`/repos/${owner}/${repo}`);
    const languageBytes = await githubRequest<Record<string, number>>(`/repos/${owner}/${repo}/languages`);
    const tree = await githubRequest<{
      truncated: boolean;
      tree: Array<{ path: string; type: string; sha: string; size?: number }>;
    }>(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(repository.default_branch)}?recursive=1`);
    if (tree.truncated) {
      throw new Error("Repository is too large to scan safely in one request.");
    }

    onProgress?.("detecting", "Detecting package managers and repository manifests.");
    const rootEntries = tree.tree.filter((entry) => !entry.path.includes("/")).map((entry) => entry.path);
    const manifests = scannerPolicy.manifestFiles
      .filter((name) => rootEntries.includes(name));
    onProgress?.(
      "detecting",
      manifests.length > 0
        ? `Found ${manifests.join(", ")}. Dependency advisories are not enabled in this scanner.`
        : "No supported manifest found at the repository root; continuing with source analysis.",
    );
    const ignore = new Set([...scannerPolicy.defaultIgnoreDirectories, ...(options.ignore ?? [])]);
    const eligibleBlobs = tree.tree.filter((entry) =>
      entry.type === "blob" &&
      (entry.size ?? scannerPolicy.limits.maxFileBytes + 1) <= scannerPolicy.limits.maxFileBytes &&
      shouldScanFile(entry.path, ignore),
    );
    const blobs: typeof eligibleBlobs = [];
    let selectedBytes = 0;
    for (const blob of eligibleBlobs) {
      const blobBytes = blob.size ?? 0;
      if (blobs.length >= scannerPolicy.limits.maxFiles || selectedBytes + blobBytes > scannerPolicy.limits.maxScanBytes) break;
      blobs.push(blob);
      selectedBytes += blobBytes;
    }
    const files: RepositoryFile[] = [];
    for (let index = 0; index < blobs.length; index += 10) {
      const batch = blobs.slice(index, index + 10);
      const loaded = await Promise.all(batch.map(async (blob) => {
        const data = await githubRequest<{ content: string; encoding: string }>(`/repos/${owner}/${repo}/git/blobs/${blob.sha}`);
        if (data.encoding !== "base64") return null;
        return { path: blob.path, content: Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8") };
      }));
      files.push(...loaded.filter((file): file is RepositoryFile => file !== null));
    }
    const findings = await scanFiles(files, options, onProgress);
    const profile = buildRepositoryProfile({ repository, tree: tree.tree, files, manifests, languageBytes });
    const systemDesign = buildSystemDesignAssessment(files, tree.tree, manifests);
    onProgress?.("recommendations", "Ranking findings and generating remediation guidance.");

    return {
      repoUrl,
      repoName,
      findings,
      profile,
      systemDesign,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const lowerMessage = message.toLowerCase();
    const status = typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status)
      : 0;
    if (
      status === 401 || status === 403 || status === 404 ||
      lowerMessage.includes("authentication")
    ) {
      throw new Error("GitHub authorization is required to access this repository.");
    }
    if (status === 429 || lowerMessage.includes("rate limit")) {
      throw new Error("GitHub rate limit reached. Wait and try the scan again.");
    }
    if (message.includes("too large")) throw error;
    throw new Error("Scan failed.");
  }
}
