import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Zap, GitBranch } from "lucide-react";

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="group rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden my-4">
      {label && (
        <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
          <span className="text-xs text-zinc-500 font-mono">{label}</span>
        </div>
      )}
      <pre className="px-4 py-3.5 text-zinc-200 font-mono text-sm overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function AIDetectionPage() {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-2 text-foreground">
          AI Detection & Architecture Analysis
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Votrio uses advanced techniques to detect AI-generated code and analyze
          architectural patterns. This guide explains how the detection works
          under the hood.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Detection Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Votrio detects AI-generated code using a hybrid approach combining
            multiple analysis techniques. Instead of relying on a single method,
            it scores code across three independent detectors that each look for
            different patterns:
          </p>

          <div className="space-y-3">
            <div className="border-l-2 border-amber-500 pl-4">
              <h4 className="text-sm font-semibold text-foreground">
                Pattern Analysis (40% weight)
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Looks for common AI characteristics like generic comments, boilerplate code,
                and excessive documentation
              </p>
            </div>

            <div className="border-l-2 border-blue-500 pl-4">
              <h4 className="text-sm font-semibold text-foreground">
                AST Analysis (40% weight)
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Examines code structure for AI preferences like uniform function lengths,
                arrow functions, and destructuring patterns
              </p>
            </div>

            <div className="border-l-2 border-purple-500 pl-4">
              <h4 className="text-sm font-semibold text-foreground">
                LLM Verification (20% weight)
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Optional: sends code snippets to Claude for semantic verification (disabled by default)
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            Each file receives a probability score from 0-1, and scores above 0.5
            are flagged as findings. The final report shows overall AI likelihood
            and confidence metrics.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pattern Analysis Detector</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This detector searches for comment patterns and coding conventions
            that AI models tend to produce:
          </p>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              What It Looks For
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
              <li>
                <strong>Generic comments:</strong> "TODO:", "FIXME:", "//"
                function descriptions
              </li>
              <li>
                <strong>Overly documented code:</strong> Excessive JSDoc
                comments and verbose docstrings
              </li>
              <li>
                <strong>Boilerplate sections:</strong> "// Import dependencies",
                "// Configuration", "// Initialize"
              </li>
              <li>
                <strong>Generic adjectives:</strong> "simple", "basic", "standard",
                "common", "typical"
              </li>
              <li>
                <strong>Generic action comments:</strong> "// Handle error",
                "// Check if", "// Make sure"
              </li>
              <li>
                <strong>Excessive comments:</strong> More than 30% of lines are
                comments
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Example: Pattern Scoring
            </h4>
            <CodeBlock
              label="Code sample"
              code={`// Import dependencies
import { useState } from 'react';

// Define types
interface User {
  id: string;
  name: string;
}

// Handle user state
const handleUser = (user: User) => {
  // Check if user exists
  if (!user) {
    // Make sure we handle this case
    console.log('User not found');
  }
};`}
            />
            <p className="text-xs text-muted-foreground mt-2">
              This code would score high on pattern detection because it contains
              multiple boilerplate comments ("Import dependencies", "Define types",
              "Handle user"), generic action comments ("Check if", "Make sure"),
              and has a comment-to-code ratio of ~40%.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AST Analysis Detector</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Abstract Syntax Tree (AST) analysis examines the structure of code
            itself. AI models have preferred coding styles that differ from human
            developers.
          </p>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              JavaScript/TypeScript Patterns
            </h4>
            <ul className="space-y-3 text-sm text-muted-foreground list-disc list-inside space-y-2">
              <li>
                <strong>Uniform function lengths:</strong> Low variance in
                function sizes (AI tends to generate similarly-sized functions)
              </li>
              <li>
                <strong>Excessive default parameters:</strong> 5+ default parameter
                assignments
              </li>
              <li>
                <strong>Arrow function dominance:</strong> Prefers{" "}
                <code>=&gt;</code> syntax over function declarations
              </li>
              <li>
                <strong>Heavy destructuring:</strong> Frequent use of{" "}
                <code>{`{ property } = object`}</code> patterns
              </li>
              <li>
                <strong>Template strings:</strong> Prefers template syntax like{" "}
                <code>string with variables</code> over concatenation
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Python Patterns
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
              <li>
                <strong>Type hints:</strong> Frequent use of typing annotations
              </li>
              <li>
                <strong>Docstrings:</strong> Multiple documentation blocks
              </li>
              <li>
                <strong>List comprehensions:</strong> Prefers{" "}
                <code>[x for x in list]</code> syntax
              </li>
              <li>
                <strong>F-strings:</strong> Uses f-string formatting extensively
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Generic Checks (All Languages)
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
              <li>
                <strong>Consistent indentation:</strong> Very few indentation
                variations (3 or fewer)
              </li>
              <li>
                <strong>Line length consistency:</strong> Lines don't exceed
                average by more than 50%
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scoring & Severity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Each file is scored on a 0-1 probability scale. The final score
            combines all three detectors:
          </p>

          <CodeBlock
            code={`aiProbability = (patternScore × 0.4) + (astScore × 0.4) + (llmScore × 0.2)`}
          />

          <div className="space-y-3 mt-4">
            <div className="border-l-2 border-red-500 pl-4">
              <h4 className="text-sm font-semibold text-red-600">
                80%+ Probability → CRITICAL
              </h4>
              <p className="text-xs text-muted-foreground">
                Very likely AI-generated
              </p>
            </div>

            <div className="border-l-2 border-orange-500 pl-4">
              <h4 className="text-sm font-semibold text-orange-600">
                60-80% Probability → HIGH
              </h4>
              <p className="text-xs text-muted-foreground">
                Probably AI-generated
              </p>
            </div>

            <div className="border-l-2 border-yellow-500 pl-4">
              <h4 className="text-sm font-semibold text-yellow-600">
                40-60% Probability → MEDIUM
              </h4>
              <p className="text-xs text-muted-foreground">
                Some AI characteristics detected
              </p>
            </div>

            <div className="border-l-2 border-blue-500 pl-4">
              <h4 className="text-sm font-semibold text-blue-600">
                &lt;40% Probability → LOW
              </h4>
              <p className="text-xs text-muted-foreground">
                Minimal AI indicators
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Architecture Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Beyond AI detection, Votrio analyzes your codebase architecture to
            identify structural issues that impact maintainability:
          </p>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">
                God File Detection
              </h4>
              <p className="text-xs text-muted-foreground mb-2">
                Identifies files that are too large and handle too many responsibilities:
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                <li>&gt; 500 lines of code</li>
                <li>&gt; 20 imports (high coupling)</li>
                <li>&gt; 15 functions (multiple responsibilities)</li>
                <li>Handles 3+ different concerns (DB, HTTP, UI, etc)</li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">
                Circular Dependency Detection
              </h4>
              <p className="text-xs text-muted-foreground">
                Uses depth-first search (DFS) to find dependency cycles.
                Example: Module A → Module B → Module C → Module A
              </p>
              <CodeBlock
                code={`// Circular dependency found:
src/services/user.ts → src/utils/auth.ts → src/services/user.ts

// Breaking the cycle requires introducing an abstraction layer
// or using dependency injection to decouple the modules`}
              />
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">
                Coupling Analysis
              </h4>
              <p className="text-xs text-muted-foreground">
                Measures how tightly modules are coupled. High coupling means
                changing one module requires changes in many others.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">
                Abstraction Layer Detection
              </h4>
              <p className="text-xs text-muted-foreground">
                Checks if proper abstraction layers exist between components
                to prevent direct dependencies.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap size={18} />
            How to Interpret Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              AI Likelihood Score
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              The overall score represents the average probability across all
              files in your project:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
              <li>&gt; 80% = Very likely AI-generated codebase</li>
              <li>50-80% = Moderate AI generation detected</li>
              <li>20-50% = Low AI generation indicators</li>
              <li>&lt; 20% = Primarily human-written code</li>
            </ul>
          </div>

          <div className="mt-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Confidence Score
            </h4>
            <p className="text-sm text-muted-foreground">
              Shows what percentage of files had detectable AI patterns. A high
              confidence with low likelihood suggests inconsistent code quality
              across the project.
            </p>
          </div>

          <div className="mt-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Individual Findings
            </h4>
            <p className="text-sm text-muted-foreground">
              Each flagged file shows detailed breakdown of pattern, AST, and LLM
              scores. Review high-confidence findings to understand what patterns
              were detected.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Limitations & False Positives</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            AI detection is probabilistic and not 100% accurate. Be aware of
            these limitations:
          </p>

          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>
              <strong>Generated tests:</strong> Test code often looks AI-generated
              because it's standardized and well-commented
            </li>
            <li>
              <strong>Modern codebases:</strong> Projects using modern practices
              (TypeScript, destructuring, type hints) may score higher
            </li>
            <li>
              <strong>Junior developers:</strong> New programmers may follow
              tutorials or style guides that resemble AI patterns
            </li>
            <li>
              <strong>Linted code:</strong> Heavily formatted code by tools may
              appear structurally uniform
            </li>
            <li>
              <strong>Template-heavy code:</strong> Boilerplate and scaffolded
              projects naturally have AI-like characteristics
            </li>
          </ul>

          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded">
            <p className="text-xs text-amber-900 dark:text-amber-200">
              💡 <strong>Tip:</strong> Use AI detection as a starting point for
              review, not as definitive proof. Combine with manual code review
              for best results.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Using AI Detection in Your Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CodeBlock
            label="Run AI detection via scan"
            code={`# Scan for AI-generated code
votrio scan

# Get detailed JSON output for programmatic processing
votrio scan --format json

# Fail CI if high AI likelihood detected
votrio scan --ci --fail-on high

# Watch mode for continuous monitoring
votrio scan --watch`}
          />

          <div className="mt-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Interpreting Output
            </h4>
            <CodeBlock
              code={`Category: ai-detection
Score: 65% (moderate likelihood)
Confidence: 45% (45% of files flagged)

Finding: src/services/user.ts
- Pattern score: 72%
- AST score: 58%
- LLM score: 0% (verification disabled)
- Overall probability: 65%`}
            />
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            This example shows moderate AI likelihood with moderate confidence.
            Review the flagged files and look at the pattern/AST breakdowns to
            understand what characteristics were detected.
          </p>
        </CardContent>
      </Card>
    </div>

  );
}
