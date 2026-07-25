// AI-Enhanced Scanner Service - Integrates AI analysis with existing scanning

import { aiService, RepositoryData } from "@/app/lib/ai-service";
import {
  repositoryAnalyzer,
  RepositoryStructure,
} from "@/app/lib/repository-analyzer";
import {
  runGitHubScanWithToken,
  type RepositoryProfile,
  type SystemDesignAssessment,
} from "./githubScanner";

export interface AIScanResult {
  repositoryUrl: string;
  repositoryName: string;
  findings: any[];
  profile: RepositoryProfile;
  systemDesign: SystemDesignAssessment;
  aiAnalysis: {
    intelligence: any;
    securityAnalysis: any;
    attackPaths: any;
    architectureHealth: any;
  };
  summary: {
    totalFiles: number;
    totalVulnerabilities: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    overallRisk: string;
    architectureScore: number;
  };
}

export class AIScanner {
  async scanRepository(
    repoUrl: string,
    providerToken?: string,
    options: { useAI?: boolean; model?: string } = {},
  ): Promise<AIScanResult> {
    const { useAI = true, model } = options;

    // First, run the basic GitHub scan (regex-based)
    const basicScan = await runGitHubScanWithToken(
      repoUrl,
      { ai: false },
      providerToken,
    );

    if (!useAI) {
      return {
        repositoryUrl: basicScan.repoUrl,
        repositoryName: basicScan.repoName,
        findings: basicScan.findings,
        profile: basicScan.profile,
        systemDesign: basicScan.systemDesign,
        aiAnalysis: {
          intelligence: null,
          securityAnalysis: null,
          attackPaths: null,
          architectureHealth: null,
        },
        summary: this.generateSummary(basicScan.findings),
      };
    }

    // Perform AI-enhanced analysis
    const aiAnalysis = await this.performAIAnalysis(basicScan, model);

    return {
      repositoryUrl: basicScan.repoUrl,
      repositoryName: basicScan.repoName,
      findings: basicScan.findings,
      profile: basicScan.profile,
      systemDesign: basicScan.systemDesign,
      aiAnalysis,
      summary: this.generateEnhancedSummary(basicScan.findings, aiAnalysis),
    };
  }

  private async performAIAnalysis(
    basicScan: any,
    model?: string,
  ): Promise<{
    intelligence: any;
    securityAnalysis: any;
    attackPaths: any;
    architectureHealth: any;
  }> {
    // Prepare repository data for AI analysis
    const repositoryData: RepositoryData = {
      files: basicScan.findings.map((f: any) => ({
        path: f.file,
        size: f.snippet?.length || 100,
      })),
      languages: this.detectLanguagesFromFindings(basicScan.findings),
    };

    const repositoryStructure = {
      files: repositoryData.files.map((f) => ({
        path: f.path,
        lines: Math.floor(f.size / 50), // Estimate lines from size
        complexity: f.size,
      })),
      dependencies: {},
      patterns: [],
    };

    // Run AI analyses in parallel where possible
    const [intelligence, securityAnalysis, attackPaths, architectureHealth] =
      await Promise.allSettled([
        aiService.analyzeRepositoryIntelligence(repositoryData, model),
        this.performDeepSecurityAnalysis(basicScan.findings, model),
        aiService.simulateAttackPath(
          basicScan.findings,
          JSON.stringify(repositoryData),
          model,
        ),
        aiService.evaluateArchitectureHealth(repositoryStructure, model),
      ]);

    return {
      intelligence:
        intelligence.status === "fulfilled" ? intelligence.value : null,
      securityAnalysis:
        securityAnalysis.status === "fulfilled" ? securityAnalysis.value : null,
      attackPaths:
        attackPaths.status === "fulfilled" ? attackPaths.value : null,
      architectureHealth:
        architectureHealth.status === "fulfilled"
          ? architectureHealth.value
          : null,
    };
  }

  private async performDeepSecurityAnalysis(
    findings: any[],
    model?: string,
  ): Promise<any> {
    // Group findings by file for more efficient analysis
    const findingsByFile = new Map<string, any[]>();
    for (const finding of findings) {
      const existing = findingsByFile.get(finding.file) || [];
      existing.push(finding);
      findingsByFile.set(finding.file, existing);
    }

    // Analyze high-severity files with AI
    const highRiskFiles = Array.from(findingsByFile.entries()).filter(
      ([, fileFindings]) =>
        fileFindings.some(
          (f) => f.severity === "high" || f.severity === "critical",
        ),
    );

    if (highRiskFiles.length === 0) {
      return null;
    }

    // Analyze the most critical file
    const [mostCriticalFile, fileFindings] = highRiskFiles[0];
    const codeContext = this.buildCodeContext(fileFindings);

    return aiService.analyzeSecurityVulnerabilities(
      codeContext,
      mostCriticalFile,
      model,
    );
  }

  private buildCodeContext(findings: any[]): string {
    return findings
      .map(
        (f) => `
File: ${f.file}
Line: ${f.line}
Type: ${f.type}
Severity: ${f.severity}
Message: ${f.message}
Snippet: ${f.snippet || "N/A"}
Suggestion: ${f.suggestion || "N/A"}
`,
      )
      .join("\n---\n");
  }

  private detectLanguagesFromFindings(findings: any[]): string[] {
    const languageSet = new Set<string>();
    for (const finding of findings) {
      const ext = finding.file.split(".").pop();
      if (ext) {
        const languageMap: Record<string, string> = {
          ts: "TypeScript",
          tsx: "TypeScript",
          js: "JavaScript",
          jsx: "JavaScript",
          py: "Python",
          go: "Go",
          rs: "Rust",
          java: "Java",
          cs: "C#",
          php: "PHP",
        };
        if (languageMap[ext]) {
          languageSet.add(languageMap[ext]);
        }
      }
    }
    return Array.from(languageSet);
  }

  private generateSummary(findings: any[]) {
    const critical = findings.filter((f) => f.severity === "critical").length;
    const high = findings.filter((f) => f.severity === "high").length;
    const medium = findings.filter((f) => f.severity === "medium").length;
    const low = findings.filter((f) => f.severity === "low").length;

    let overallRisk = "low";
    if (critical > 0) overallRisk = "critical";
    else if (high > 3) overallRisk = "high";
    else if (high > 0 || medium > 5) overallRisk = "medium";

    return {
      totalFiles: new Set(findings.map((f) => f.file)).size,
      totalVulnerabilities: findings.length,
      criticalIssues: critical,
      highIssues: high,
      mediumIssues: medium,
      lowIssues: low,
      overallRisk,
      architectureScore: 0, // Will be enhanced with AI
    };
  }

  private generateEnhancedSummary(findings: any[], aiAnalysis: any) {
    const baseSummary = this.generateSummary(findings);

    // Enhance with AI analysis results
    if (aiAnalysis.architectureHealth) {
      baseSummary.architectureScore =
        aiAnalysis.architectureHealth.overallScore;
    }

    if (aiAnalysis.securityAnalysis) {
      baseSummary.overallRisk = aiAnalysis.securityAnalysis.overallRisk;
    }

    return baseSummary;
  }

  // Generate a comprehensive AI summary for display
  async generateAISummary(
    findings: any[],
    repositoryContext: string,
    model?: string,
  ): Promise<string> {
    const prompt = `Generate a comprehensive security summary for this repository scan:

Repository Context: ${repositoryContext.slice(0, 500)}

Findings:
${JSON.stringify(findings.slice(0, 30), null, 2)}

Provide a 3-5 paragraph executive summary covering:
1. Overall security posture
2. Most critical issues requiring immediate attention
3. Architecture and code quality observations
4. Recommended prioritization of fixes
5. Estimated effort for remediation`;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          context: repositoryContext,
          model,
        }),
      });

      if (!response.ok) return "";

      const data = await response.json();
      return data.message || "";
    } catch (error) {
      console.error("Error generating AI summary:", error);
      return "";
    }
  }
}

export const aiScanner = new AIScanner();
