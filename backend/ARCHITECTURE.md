# Votrio-Scan Architecture

## Overview

Votrio-Scan is a production-grade AI-powered repository analysis tool that produces comprehensive risk reports including code likelihood scores, architectural risks, scalability issues, security vulnerabilities, and maintainability metrics.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLI Layer                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  scan    │  │  init    │  │  auth    │  │  report  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Core Orchestrator                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           VotrioScanner (Main Coordinator)               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Repository       │  │  Analysis        │  │  LLM             │
│ Scanner          │  │  Engine          │  │  Explanation     │
│                  │  │                  │  │  Layer           │
│ - File Discovery │  │ - AI Detection   │  │                  │
│ - Dependency     │  │ - Architecture   │  │ - Provider       │
│   Graph          │  │ - Scalability    │  │   Abstraction    │
│ - Language       │  │ - Security       │  │ - Prompt         │
│   Detection      │  │ - Maintainability│  │   Templates      │
│ - .gitignore     │  │                  │  │ - Result         │
│   Support        │  │                  │  │   Synthesis      │
└──────────────────┘  └──────────────────┘  └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Report Generator                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   JSON   │  │   HTML   │  │Markdown  │  │  SARIF   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Module Structure

```
src/
├── core/                          # Core types and interfaces
│   ├── types.ts                   # Shared interfaces
│   ├── scanner.ts                 # Main scanner orchestrator
│   └── config.ts                  # Configuration management
├── repository/                    # Repository scanning
│   ├── scanner.ts                 # File discovery and scanning
│   ├── dependency-graph.ts        # Dependency graph builder
│   ├── language-detector.ts       # Language detection
│   └── gitignore-parser.ts        # .gitignore parsing
├── analysis/                      # Analysis engines
│   ├── ai-detection/              # AI-generated code detection
│   │   ├── engine.ts              # Main detection engine
│   │   ├── pattern-analyzer.ts    # Code pattern analysis
│   │   ├── ast-analyzer.ts        # AST-based heuristics
│   │   └── llm-verifier.ts        # Optional LLM verification
│   ├── architecture/              # Architecture analysis
│   │   ├── analyzer.ts            # Main architecture analyzer
│   │   ├── god-file-detector.ts   # God file detection
│   │   ├── circular-dep.ts        # Circular dependency detection
│   │   ├── coupling-analyzer.ts   # Coupling analysis
│   │   └── abstraction-layers.ts  # Abstraction layer detection
│   ├── scalability/               # Scalability analysis
│   │   ├── analyzer.ts            # Main scalability analyzer
│   │   ├── state-analyzer.ts       # Global state detection
│   │   ├── db-patterns.ts          # Database pattern analysis
│   │   ├── performance.ts         # Performance anti-patterns
│   │   └── memory-analyzer.ts     # Memory-heavy operations
│   ├── security/                  # Security analysis
│   │   ├── analyzer.ts            # Main security analyzer
│   │   ├── secret-detector.ts     # Secret detection
│   │   ├── injection-analyzer.ts  # Injection risk analysis
│   │   ├── auth-analyzer.ts       # Authentication patterns
│   │   └── crypto-analyzer.ts     # Cryptography analysis
│   └── maintainability/           # Maintainability analysis
│       ├── analyzer.ts            # Main maintainability analyzer
│       ├── complexity.ts          # Code complexity metrics
│       ├── duplication.ts         # Code duplication detection
│       └── code-smell.ts           # Code smell detection
├── llm/                           # LLM integration
│   ├── provider.ts                # Provider abstraction
│   ├── openai-provider.ts         # OpenAI-compatible provider
│   ├── anthropic-provider.ts      # Anthropic provider
│   ├── prompts.ts                 # Prompt templates
│   └── explanation.ts             # Result synthesis
├── report/                        # Report generation
│   ├── generator.ts              # Main report generator
│   ├── json-formatter.ts          # JSON output
│   ├── html-formatter.ts          # HTML output
│   ├── markdown-formatter.ts      # Markdown output
│   └── sarif-formatter.ts         # SARIF output
├── utils/                         # Utilities
│   ├── logger.ts                  # Logging utilities
│   ├── progress.ts                # Progress bars
│   ├── table.ts                   # Table formatting
│   └── file-utils.ts              # File utilities
├── commands/                      # CLI commands
│   ├── scan.ts                    # Scan command
│   ├── init.ts                    # Init command
│   ├── auth.ts                    # Auth command
│   └── report.ts                  # Report command
└── cli.ts                         # Main CLI entry point
```

## Core Data Flow

1. **Discovery Phase**
   - Repository Scanner discovers files respecting .gitignore
   - Language detection identifies file types
   - Dependency graph builder maps relationships

2. **Analysis Phase**
   - Each analyzer processes the repository independently
   - AI Detection Engine identifies AI-generated code
   - Architecture Analyzer assesses structural issues
   - Scalability Analyzer identifies performance risks
   - Security Analyzer finds vulnerabilities
   - Maintainability Analyzer evaluates code quality

3. **Synthesis Phase**
   - LLM Explanation Layer generates human-readable explanations
   - Results are aggregated and scored
   - Actionable fixes are prioritized

4. **Report Phase**
   - Report Generator creates output in requested format
   - CLI displays results with formatting and progress indicators

## Key Design Principles

1. **Modularity**: Each analyzer is independently testable and extensible
2. **Performance**: Incremental scanning and caching for large repositories
3. **Extensibility**: Easy to add new analyzers or modify existing ones
4. **Type Safety**: Strong TypeScript typing throughout
5. **Error Handling**: Graceful degradation when analysis fails
6. **Configuration**: Flexible configuration via files and CLI options

## Scoring System

Each analysis produces a score (0-100) for different dimensions:

- **AI Likelihood Score**: Probability code was AI-generated
- **Architectural Risk Score**: Structural issues and complexity
- **Scalability Risk Score**: Performance bottlenecks at scale
- **Security Risk Score**: Vulnerability severity
- **Maintainability Score**: Code quality and maintainability

Overall risk score is a weighted average of individual scores.

## Technology Stack

- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **CLI Framework**: Commander.js
- **AST Parsing**: @typescript-eslint, @babel/parser, esprima
- **LLM Integration**: OpenAI SDK, Anthropic SDK
- **Output**: Chalk (colors), Ora (spinners), Cli-table3 (tables)
- **Testing**: Jest, ts-jest

## Extension Points

1. **New Analyzers**: Add to analysis/ directory following existing patterns
2. **New Languages**: Extend language-detector.ts
3. **New LLM Providers**: Implement provider interface
4. **New Report Formats**: Add formatter to report/ directory
5. **Custom Rules**: Plugin system for custom analysis rules