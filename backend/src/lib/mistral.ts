const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

type Severity = "low" | "medium" | "high" | "critical";

type FindingSummaryInput = {
  file: string;
  line: number;
  severity: Severity;
  type: string;
  message: string;
  suggestion?: string;
  snippet?: string;
};

// AI Service Configuration
const AI_CONFIG = {
  defaultModel: "mistral-large-latest",
  temperature: 0.2,
  maxTokens: 2000,
};

// System Prompts for Different AI Capabilities
const SYSTEM_PROMPTS = {
  // Original prompt
  SECURITY_REVIEWER:
    "You are a security reviewer. Return concise findings and refactoring advice.",

  // Repository Intelligence
  REPOSITORY_INTELLIGENCE: `You are the lead AI Security Engineer for Votrio, an enterprise cybersecurity SaaS platform.
Your task is to analyze repository code and provide comprehensive repository intelligence.
Focus on:
- Language and framework detection
- Architecture analysis (stack, deployment, database, auth)
- Security posture assessment
- Code quality metrics
- Technical debt identification
Be specific, technical, and actionable. Enterprise-grade analysis only.`,

  // Security Analysis
  SECURITY_ANALYST: `You are a senior Security Engineer at Votrio specializing in vulnerability detection and exploit simulation.
Your task is to analyze code for security vulnerabilities and provide:
- Vulnerability identification with CWE/CVE references
- Exploitability assessment
- Attack path simulation
- Concrete remediation steps
- Risk prioritization
Be thorough but concise. Focus on real security risks, not theoretical issues.`,

  // Architecture Evaluation
  ARCHITECTURE_EVALUATOR: `You are a Systems Architect and Technical Lead at Votrio.
Your task is to evaluate software architecture for:
- Maintainability and modularity
- Coupling and cohesion analysis
- Scalability assessment
- Design pattern usage
- Technical debt quantification
- Improvement recommendations
Provide specific, actionable architectural guidance.`,

  // Code Review Assistant
  CODE_REVIEWER: `You are a senior engineering lead conducting code reviews for a production system.
Your task is to:
- Explain findings clearly
- Estimate exploitability and engineering effort
- Generate secure replacement code when needed
- Prioritize findings by business impact
- Summarize architectural implications
Be concise but thorough. Focus on actionable insights.`,

  // Attack Path Simulator
  ATTACK_SIMULATOR: `You are a cybersecurity specialist simulating realistic attack scenarios.
Your task is to:
- Identify attack entry points
- Map privilege escalation paths
- Show lateral movement possibilities
- Assess business impact
- Provide mitigation for each attack stage
Be realistic and practical. Consider real-world attacker behavior.`,

  // "Ask Your Codebase" Assistant
  CODEBASE_ASSISTANT: `You are an AI assistant that understands entire software repositories.
Your task is to answer questions about codebases with full context awareness.
You understand:
- File relationships and dependencies
- Architecture patterns and design decisions
- Security implications of code changes
- Authentication and authorization flows
- Database interactions and ORM usage
- API endpoints and service boundaries
Provide clear, specific answers with code references when relevant.`,

  // Remediation Planner
  REMEDIATION_PLANNER: `You are a senior engineering lead planning security remediation work.
Your task is to:
- Group related vulnerabilities into actionable work
- Estimate engineering effort realistically
- Prioritize by severity and business risk
- Provide implementation steps
- Generate validation checklists
- Create developer action plans
Be practical and consider team capacity.`,
};

async function callMistralAPI(
  systemPrompt: string,
  userPrompt: string,
  model: string = AI_CONFIG.defaultModel,
  maxTokens: number = AI_CONFIG.maxTokens,
): Promise<string | null> {
  if (!MISTRAL_API_KEY) {
    console.error("MISTRAL_API_KEY not set");
    return null;
  }

  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: AI_CONFIG.temperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Mistral API error:", message);
    return null;
  }
}

export async function analyzeCode(
  prompt: string,
  model: string = "mistral-large-latest",
) {
  return callMistralAPI(SYSTEM_PROMPTS.SECURITY_REVIEWER, prompt, model, 500);
}

export async function summarizeFindings(
  findings: FindingSummaryInput[],
  model: string = "mistral-large-latest",
) {
  if (!MISTRAL_API_KEY || findings.length === 0) return null;

  const condensedFindings = findings.slice(0, 50).map((finding) => ({
    file: finding.file,
    line: finding.line,
    severity: finding.severity,
    type: finding.type,
    message: finding.message,
    suggestion: finding.suggestion ?? null,
    snippet: finding.snippet ?? null,
  }));

  const userPrompt = `Summarize these findings for a developer:\n${JSON.stringify(condensedFindings, null, 2)}`;
  return callMistralAPI(
    "You turn repository scan findings into a concise remediation summary. Do not invent files, lines, or vulnerabilities. Use only the provided findings. Return 2-5 short sentences in plain text with the highest-risk issues first and concrete fixes.",
    userPrompt,
    model,
    300,
  );
}

// Repository Intelligence Functions
export async function analyzeRepositoryIntelligence(
  repositoryData: {
    files: Array<{ path: string; content?: string; size: number }>;
    packageJson?: any;
    readme?: string;
    languages: string[];
  },
  model: string = "mistral-large-latest",
): Promise<string | null> {
  const prompt = `Analyze this repository and provide comprehensive intelligence:

Files: ${repositoryData.files.length} files
Languages: ${repositoryData.languages.join(", ")}
Package.json: ${repositoryData.packageJson ? JSON.stringify(repositoryData.packageJson, null, 2) : "Not found"}
README: ${repositoryData.readme ? repositoryData.readme.slice(0, 1000) : "Not found"}

Sample files:
${repositoryData.files
  .slice(0, 10)
  .map((f) => `- ${f.path} (${f.size} bytes)`)
  .join("\n")}

Provide analysis in JSON format:
{
  "languages": ["detected languages"],
  "frameworks": ["detected frameworks"],
  "packageManagers": ["npm", "yarn", "pip", etc],
  "databases": ["detected databases"],
  "orms": ["detected ORMs"],
  "cloudProviders": ["AWS", "GCP", "Azure", etc],
  "hosting": ["detected hosting platforms"],
  "authProviders": ["detected auth systems"],
  "cicd": ["detected CI/CD systems"],
  "architecture": {
    "type": "monolith|microservices|serverless",
    "description": "architecture description"
  },
  "securityPosture": {
    "score": 0-100,
    "summary": "security assessment"
  },
  "technicalDebt": {
    "level": "low|medium|high",
    "areas": ["specific debt areas"]
  }
}`;

  return callMistralAPI(
    SYSTEM_PROMPTS.REPOSITORY_INTELLIGENCE,
    prompt,
    model,
    1500,
  );
}

// Security Analysis Functions
export async function analyzeSecurityVulnerabilities(
  codeContext: string,
  filePath: string,
  model: string = "mistral-large-latest",
): Promise<string | null> {
  const prompt = `Analyze this code file for security vulnerabilities:

File: ${filePath}
Code:
${codeContext.slice(0, 4000)}

Provide analysis in JSON format:
{
  "vulnerabilities": [
    {
      "type": "vulnerability type",
      "severity": "low|medium|high|critical",
      "cwe": "CWE identifier",
      "line": line number,
      "description": "vulnerability description",
      "exploitability": "low|medium|high",
      "impact": "business impact",
      "remediation": "specific fix steps",
      "codeExample": "secure code example"
    }
  ],
  "overallRisk": "low|medium|high|critical"
}`;

  return callMistralAPI(SYSTEM_PROMPTS.SECURITY_ANALYST, prompt, model, 1500);
}

// Attack Path Simulation
export async function simulateAttackPath(
  vulnerabilities: FindingSummaryInput[],
  repositoryContext: string,
  model: string = "mistral-large-latest",
): Promise<string | null> {
  const prompt = `Simulate realistic attack paths based on these vulnerabilities:

Repository Context: ${repositoryContext.slice(0, 500)}

Vulnerabilities:
${JSON.stringify(vulnerabilities.slice(0, 20), null, 2)}

Provide attack path analysis in JSON format:
{
  "attackPaths": [
    {
      "entryPoint": "initial vulnerability",
      "stages": [
        {
          "stage": 1,
          "description": "attack stage description",
          "vulnerability": "vulnerability exploited",
          "privilegeLevel": "current privilege",
          "impact": "stage impact"
        }
      ],
      "finalImpact": "ultimate business impact",
      "mitigation": "stage-by-stage mitigation"
    }
  ],
  "overallRiskAssessment": "risk assessment summary"
}`;

  return callMistralAPI(SYSTEM_PROMPTS.ATTACK_SIMULATOR, prompt, model, 2000);
}

// Architecture Health Scoring
export async function evaluateArchitectureHealth(
  repositoryStructure: {
    files: Array<{ path: string; lines: number; complexity?: number }>;
    dependencies: Record<string, string>;
    patterns: string[];
  },
  model: string = "mistral-large-latest",
): Promise<string | null> {
  const prompt = `Evaluate the architecture health of this repository:

Files: ${repositoryStructure.files.length}
Total Lines: ${repositoryStructure.files.reduce((sum, f) => sum + f.lines, 0)}
Dependencies: ${Object.keys(repositoryStructure.dependencies).length}
Patterns detected: ${repositoryStructure.patterns.join(", ")}

Sample structure:
${repositoryStructure.files
  .slice(0, 15)
  .map((f) => `- ${f.path} (${f.lines} lines)`)
  .join("\n")}

Provide architecture health assessment in JSON format:
{
  "overallScore": 0-100,
  "categories": {
    "maintainability": {"score": 0-100, "issues": ["specific issues"]},
    "modularity": {"score": 0-100, "issues": ["specific issues"]},
    "coupling": {"score": 0-100, "issues": ["specific issues"]},
    "cohesion": {"score": 0-100, "issues": ["specific issues"]},
    "scalability": {"score": 0-100, "issues": ["specific issues"]},
    "technicalDebt": {"score": 0-100, "issues": ["specific issues"]},
    "documentation": {"score": 0-100, "issues": ["specific issues"]},
    "testCoverage": {"score": 0-100, "issues": ["specific issues"]}
  },
  "recommendations": [
    {"priority": "high|medium|low", "action": "specific recommendation"}
  ]
}`;

  return callMistralAPI(
    SYSTEM_PROMPTS.ARCHITECTURE_EVALUATOR,
    prompt,
    model,
    2000,
  );
}

// "Ask Your Codebase" Assistant
export async function askCodebase(
  question: string,
  codebaseContext: {
    relevantFiles: Array<{ path: string; content: string }>;
    architecture: string;
    summary: string;
  },
  model: string = "mistral-large-latest",
): Promise<string | null> {
  const prompt = `Question: ${question}

Codebase Context:
Architecture: ${codebaseContext.architecture}
Summary: ${codebaseContext.summary}

Relevant Files:
${codebaseContext.relevantFiles
  .map(
    (f) => `
File: ${f.path}
Content:
${f.content.slice(0, 2000)}
`,
  )
  .join("\n---\n")}

Provide a comprehensive answer with specific code references and explanations.`;

  return callMistralAPI(SYSTEM_PROMPTS.CODEBASE_ASSISTANT, prompt, model, 2000);
}

// Remediation Planning
export async function generateRemediationPlan(
  vulnerabilities: FindingSummaryInput[],
  repositoryContext: string,
  model: string = "mistral-large-latest",
): Promise<string | null> {
  const prompt = `Generate a remediation plan for these vulnerabilities:

Repository Context: ${repositoryContext.slice(0, 500)}

Vulnerabilities:
${JSON.stringify(vulnerabilities.slice(0, 30), null, 2)}

Provide remediation plan in JSON format:
{
  "plans": [
    {
      "id": "plan-1",
      "title": "remediation plan title",
      "severity": "low|medium|high|critical",
      "affectedFiles": ["file paths"],
      "description": "plan description",
      "estimatedEffort": "hours estimate",
      "implementationSteps": [
        "step 1",
        "step 2"
      ],
      "codeSuggestions": [
        {
          "file": "file path",
          "line": line number,
          "original": "original code",
          "suggested": "secure code"
        }
      ],
      "validationChecklist": [
        "validation item 1",
        "validation item 2"
      ]
    }
  ],
  "priorityOrder": ["plan ids in priority order"],
  "totalEstimatedEffort": "total hours"
}`;

  return callMistralAPI(
    SYSTEM_PROMPTS.REMEDIATION_PLANNER,
    prompt,
    model,
    2000,
  );
}
