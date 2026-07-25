// AI Service for Votrio - Real AI-powered analysis integration

export interface RepositoryData {
  files: Array<{ path: string; content?: string; size: number }>;
  packageJson?: any;
  readme?: string;
  languages: string[];
}

export interface SecurityVulnerability {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  cwe: string;
  line: number;
  description: string;
  exploitability: "low" | "medium" | "high";
  impact: string;
  remediation: string;
  codeExample: string;
}

export interface SecurityAnalysisResult {
  vulnerabilities: SecurityVulnerability[];
  overallRisk: "low" | "medium" | "high" | "critical";
}

export interface AttackPathStage {
  stage: number;
  description: string;
  vulnerability: string;
  privilegeLevel: string;
  impact: string;
}

export interface AttackPath {
  entryPoint: string;
  stages: AttackPathStage[];
  finalImpact: string;
  mitigation: string;
}

export interface AttackPathResult {
  attackPaths: AttackPath[];
  overallRiskAssessment: string;
}

export interface ArchitectureCategory {
  score: number;
  issues: string[];
}

export interface ArchitectureHealthResult {
  overallScore: number;
  categories: {
    maintainability: ArchitectureCategory;
    modularity: ArchitectureCategory;
    coupling: ArchitectureCategory;
    cohesion: ArchitectureCategory;
    scalability: ArchitectureCategory;
    technicalDebt: ArchitectureCategory;
    documentation: ArchitectureCategory;
    testCoverage: ArchitectureCategory;
  };
  recommendations: Array<{ priority: string; action: string }>;
}

export interface CodebaseContext {
  relevantFiles: Array<{ path: string; content: string }>;
  architecture: string;
  summary: string;
}

export interface RemediationPlan {
  id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  affectedFiles: string[];
  description: string;
  estimatedEffort: string;
  implementationSteps: string[];
  codeSuggestions: Array<{
    file: string;
    line: number;
    original: string;
    suggested: string;
  }>;
  validationChecklist: string[];
}

export interface RemediationResult {
  plans: RemediationPlan[];
  priorityOrder: string[];
  totalEstimatedEffort: string;
}

export interface RepositoryIntelligence {
  languages: string[];
  frameworks: string[];
  packageManagers: string[];
  databases: string[];
  orms: string[];
  cloudProviders: string[];
  hosting: string[];
  authProviders: string[];
  cicd: string[];
  architecture: {
    type: string;
    description: string;
  };
  securityPosture: {
    score: number;
    summary: string;
  };
  technicalDebt: {
    level: string;
    areas: string[];
  };
}

class AIService {
  private baseUrl = "/api/ai";

  async analyzeRepositoryIntelligence(
    repositoryData: RepositoryData,
    model?: string
  ): Promise<RepositoryIntelligence | null> {
    try {
      const response = await fetch(`${this.baseUrl}/repository-intelligence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryData, model }),
      });

      if (!response.ok) {
        console.error("Repository intelligence analysis failed");
        return null;
      }

      const data = await response.json();
      const parsed = JSON.parse(data.analysis);
      return parsed as RepositoryIntelligence;
    } catch (error) {
      console.error("Repository intelligence error:", error);
      return null;
    }
  }

  async analyzeSecurityVulnerabilities(
    codeContext: string,
    filePath: string,
    model?: string
  ): Promise<SecurityAnalysisResult | null> {
    try {
      const response = await fetch(`${this.baseUrl}/security-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeContext, filePath, model }),
      });

      if (!response.ok) {
        console.error("Security analysis failed");
        return null;
      }

      const data = await response.json();
      const parsed = JSON.parse(data.analysis);
      return parsed as SecurityAnalysisResult;
    } catch (error) {
      console.error("Security analysis error:", error);
      return null;
    }
  }

  async simulateAttackPath(
    vulnerabilities: any[],
    repositoryContext: string,
    model?: string
  ): Promise<AttackPathResult | null> {
    try {
      const response = await fetch(`${this.baseUrl}/attack-path`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vulnerabilities, repositoryContext, model }),
      });

      if (!response.ok) {
        console.error("Attack path simulation failed");
        return null;
      }

      const data = await response.json();
      const parsed = JSON.parse(data.analysis);
      return parsed as AttackPathResult;
    } catch (error) {
      console.error("Attack path simulation error:", error);
      return null;
    }
  }

  async evaluateArchitectureHealth(
    repositoryStructure: {
      files: Array<{ path: string; lines: number; complexity?: number }>;
      dependencies: Record<string, string>;
      patterns: string[];
    },
    model?: string
  ): Promise<ArchitectureHealthResult | null> {
    try {
      const response = await fetch(`${this.baseUrl}/architecture-health`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryStructure, model }),
      });

      if (!response.ok) {
        console.error("Architecture health evaluation failed");
        return null;
      }

      const data = await response.json();
      const parsed = JSON.parse(data.analysis);
      return parsed as ArchitectureHealthResult;
    } catch (error) {
      console.error("Architecture health evaluation error:", error);
      return null;
    }
  }

  async askCodebase(
    question: string,
    codebaseContext: CodebaseContext,
    model?: string
  ): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/ask-codebase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, codebaseContext, model }),
      });

      if (!response.ok) {
        console.error("Ask codebase failed");
        return null;
      }

      const data = await response.json();
      return data.answer;
    } catch (error) {
      console.error("Ask codebase error:", error);
      return null;
    }
  }

  async generateRemediationPlan(
    vulnerabilities: any[],
    repositoryContext: string,
    model?: string
  ): Promise<RemediationResult | null> {
    try {
      const response = await fetch(`${this.baseUrl}/remediation-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vulnerabilities, repositoryContext, model }),
      });

      if (!response.ok) {
        console.error("Remediation planning failed");
        return null;
      }

      const data = await response.json();
      const parsed = JSON.parse(data.plan);
      return parsed as RemediationResult;
    } catch (error) {
      console.error("Remediation planning error:", error);
      return null;
    }
  }
}

export const aiService = new AIService();
