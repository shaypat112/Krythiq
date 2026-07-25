import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "node:crypto";
import {
  RequestAuthError,
  requireRequestAuth,
} from "@/app/lib/server/supabaseRest";

const execFileAsync = promisify(execFile);
const MAX_CODE_BYTES = 512 * 1024;

export const runtime = "nodejs";

interface CodeReviewRequest {
  code: string;
  filePath: string;
  language?: string;
  model?: string;
}

interface CodeReviewResponse {
  review: string;
  suggestions: Array<{
    line: number;
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    suggestion: string;
  }>;
  metrics: {
    complexity: number;
    maintainability: number;
    securityScore: number;
  };
}

interface AnalysisResult {
  metrics?: {
    averageComplexity?: number;
    averageCommentRatio?: number;
    totalFiles?: number;
    totalLinesOfCode?: number;
    vulnerabilityBreakdown?: { critical?: number; high?: number };
  };
  securityPosture?: { score?: number; summary?: string };
  architecture?: { type?: string; description?: string };
  technicalDebt?: { level?: string; areas?: string[] };
  frameworks?: string[];
  languages?: string[];
  databases?: string[];
}

export async function POST(request: Request) {
  try {
    requireRequestAuth(request);
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_CODE_BYTES * 1.4) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }

    const { code, filePath, language }: CodeReviewRequest = await request.json();

    if (typeof code !== "string" || !code) {
      return NextResponse.json({ error: "Missing code to review" }, { status: 400 });
    }
    if (Buffer.byteLength(code, "utf8") > MAX_CODE_BYTES) {
      return NextResponse.json({ error: "Code is too large" }, { status: 413 });
    }

    console.log(`🔍 Starting AI code review for ${filePath || 'unknown file'}`);
    console.log(`📊 Language: ${language || 'auto-detected'}`);
    console.log(`📏 Code length: ${code.length} characters`);

    // Create temporary file for analysis
    const tempDir = path.join(process.cwd(), 'tmp', 'code-review');
    await fs.mkdir(tempDir, { recursive: true });
    
    const safeExtension = typeof language === "string" && /^[a-z0-9]{1,12}$/i.test(language)
      ? language.toLowerCase()
      : "txt";
    const tempFile = path.join(tempDir, `review-${randomUUID()}.${safeExtension}`);
    await fs.writeFile(tempFile, code, 'utf-8');

    try {
      // Run Python AI service
      const pythonScript = path.join(process.cwd(), 'backend', 'ai_service.py');
      
      console.log(`🐍 Running Python AI service: ${pythonScript}`);
      
      const { stdout, stderr } = await execFileAsync(
        "python3",
        [pythonScript, tempDir],
        {
          timeout: 30000, // 30 second timeout
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        }
      );

      if (stderr) {
        console.error(`⚠️  Python service stderr: ${stderr}`);
      }

      console.log(`✅ Python service completed successfully`);
      
      // Parse the output
      let analysisResult;
      try {
        analysisResult = JSON.parse(stdout);
      } catch (parseError) {
        console.error(`❌ Failed to parse Python output: ${parseError}`);
        throw new Error("Invalid analysis result from AI service");
      }

      // Generate review from analysis
      const review = generateCodeReview(analysisResult, filePath);
      
      console.log(`📝 Review generated with ${review.suggestions.length} suggestions`);
      console.log(`📊 Overall scores - Complexity: ${review.metrics.complexity}, Maintainability: ${review.metrics.maintainability}, Security: ${review.metrics.securityScore}`);

      return NextResponse.json(review);

    } finally {
      // Cleanup temp file
      try {
        await fs.unlink(tempFile);
        console.log(`🧹 Cleaned up temporary file: ${tempFile}`);
      } catch (cleanupError) {
        console.error(`⚠️  Failed to cleanup temp file: ${cleanupError}`);
      }
    }

  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("❌ Code review error:", error);
    
    // Provide detailed error information
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error(`Error details: ${errorMessage}`);
    if (errorStack) {
      console.error(`Stack trace: ${errorStack}`);
    }
    
    return NextResponse.json(
      { 
        error: "Code review failed", 
        suggestion: "Ensure Python 3 and required dependencies (scikit-learn, numpy) are installed"
      }, 
      { status: 500 }
    );
  }
}

function generateCodeReview(analysis: AnalysisResult, filePath: string): CodeReviewResponse {
  // Generate AI-powered review based on the Python analysis
  const suggestions: CodeReviewResponse["suggestions"] = [];
  
  // Extract vulnerabilities from analysis
  if (analysis.metrics?.vulnerabilityBreakdown) {
    const breakdown = analysis.metrics.vulnerabilityBreakdown;
    
    if ((breakdown.critical ?? 0) > 0) {
      suggestions.push({
        line: 0,
        severity: "critical",
        message: `${breakdown.critical ?? 0} critical security vulnerabilities detected`,
        suggestion: "Immediately address all critical security issues before deployment"
      });
    }
    
    if ((breakdown.high ?? 0) > 0) {
      suggestions.push({
        line: 0,
        severity: "high",
        message: `${breakdown.high ?? 0} high-severity issues found`,
        suggestion: "Review and fix high-severity issues to improve code quality"
      });
    }
  }

  // Technical debt suggestions
  if (analysis.technicalDebt?.areas) {
    const debtLevel = analysis.technicalDebt.level;
    analysis.technicalDebt.areas.forEach((area: string) => {
      suggestions.push({
        line: 0,
        severity: debtLevel === "high" ? "high" : "medium",
        message: `Technical debt: ${area}`,
        suggestion: "Consider refactoring to reduce technical debt"
      });
    });
  }

  // Architecture suggestions
  if (analysis.architecture?.description) {
    suggestions.push({
      line: 0,
      severity: "low",
      message: `Architecture: ${analysis.architecture.description}`,
      suggestion: "Review architecture patterns for consistency"
    });
  }

  // Calculate metrics
  const complexity = analysis.metrics?.averageComplexity ?? 0;
  const maintainability = 100 - Math.min(complexity * 5, 100);
  const securityScore = analysis.securityPosture?.score ?? 50;

  // Generate comprehensive review text
  const reviewText = generateReviewText(analysis, filePath);

  return {
    review: reviewText,
    suggestions,
    metrics: {
      complexity: Math.round(complexity * 10) / 10,
      maintainability: Math.round(maintainability),
      securityScore: Math.round(securityScore)
    }
  };
}

function generateReviewText(analysis: AnalysisResult, filePath: string): string {
  const parts: string[] = [];
  
  parts.push(`# Code Review for ${filePath || 'Untitled'}`);
  parts.push("");
  
  // Security posture
  if (analysis.securityPosture) {
    parts.push("## Security Assessment");
    parts.push(`**Score:** ${analysis.securityPosture.score}/100`);
    parts.push(`**Summary:** ${analysis.securityPosture.summary}`);
    parts.push("");
  }
  
  // Architecture
  if (analysis.architecture) {
    parts.push("## Architecture Analysis");
    parts.push(`**Type:** ${analysis.architecture.type}`);
    parts.push(`**Description:** ${analysis.architecture.description}`);
    parts.push("");
  }
  
  // Technical debt
  if (analysis.technicalDebt) {
    parts.push("## Technical Debt");
    parts.push(`**Level:** ${(analysis.technicalDebt.level ?? "unknown").toUpperCase()}`);
    if ((analysis.technicalDebt.areas?.length ?? 0) > 0) {
      parts.push("**Areas of concern:**");
      analysis.technicalDebt.areas?.forEach((area: string) => {
        parts.push(`- ${area}`);
      });
    }
    parts.push("");
  }
  
  // Technologies detected
  const frameworks = analysis.frameworks ?? [];
  const databases = analysis.databases ?? [];
  if (frameworks.length > 0) {
    parts.push("## Technologies Detected");
    parts.push(`**Frameworks:** ${frameworks.join(", ")}`);
    parts.push(`**Languages:** ${(analysis.languages ?? []).join(", ")}`);
    if (databases.length > 0) {
      parts.push(`**Databases:** ${databases.join(", ")}`);
    }
    parts.push("");
  }
  
  // Overall metrics
  if (analysis.metrics) {
    const averageComplexity = analysis.metrics.averageComplexity ?? 0;
    const averageCommentRatio = analysis.metrics.averageCommentRatio ?? 0;
    parts.push("## Code Metrics");
    parts.push(`**Total Files:** ${analysis.metrics.totalFiles ?? 0}`);
    parts.push(`**Lines of Code:** ${analysis.metrics.totalLinesOfCode ?? 0}`);
    parts.push(`**Average Complexity:** ${averageComplexity.toFixed(2)}`);
    parts.push(`**Comment Ratio:** ${(averageCommentRatio * 100).toFixed(1)}%`);
    parts.push("");
  }
  
  // Recommendations
  parts.push("## Recommendations");
  if (analysis.technicalDebt?.level === "high") {
    parts.push("- ⚠️ High technical debt detected - consider refactoring");
  }
  if ((analysis.securityPosture?.score ?? 100) < 70) {
    parts.push("- 🔒 Security score below 70% - address vulnerabilities");
  }
  if ((analysis.metrics?.averageCommentRatio ?? 1) < 0.2) {
    parts.push("- 📝 Low documentation - add more comments");
  }
  if ((analysis.metrics?.averageComplexity ?? 0) > 5) {
    parts.push("- 🔧 High complexity - consider simplifying code");
  }
  
  return parts.join("\n");
}
