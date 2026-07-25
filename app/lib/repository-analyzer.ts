// Repository Analyzer - Gathers repository data for AI analysis

import fs from "fs/promises";
import path from "path";
import { glob } from "glob";

export interface RepositoryFile {
  path: string;
  content?: string;
  size: number;
  lines?: number;
  language?: string;
}

export interface RepositoryStructure {
  files: RepositoryFile[];
  languages: string[];
  packageJson?: any;
  readme?: string | null;
  dependencies: Record<string, string>;
  patterns: string[];
}

export class RepositoryAnalyzer {
  private maxFileSize = 1024 * 1024; // 1MB
  private maxFiles = 500;
  private scanExtensions = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".py",
    ".go",
    ".rs",
    ".java",
    ".cs",
    ".php",
    ".json",
    ".md",
    ".yml",
    ".yaml",
    ".toml",
  ]);

  private ignorePatterns = [
    "node_modules/**",
    ".git/**",
    ".next/**",
    "dist/**",
    "build/**",
    "coverage/**",
    "vendor/**",
    "**/*.min.js",
    "**/*.min.css",
  ];

  async analyzeRepository(repoPath: string): Promise<RepositoryStructure> {
    const files = await this.discoverFiles(repoPath);
    const analyzedFiles = await this.analyzeFiles(files, repoPath);
    const languages = this.detectLanguages(analyzedFiles);
    const packageJson = await this.readPackageJson(repoPath);
    const readme = await this.readReadme(repoPath);
    const dependencies = await this.extractDependencies(packageJson, repoPath);
    const patterns = this.detectPatterns(analyzedFiles, packageJson);

    return {
      files: analyzedFiles,
      languages,
      packageJson,
      readme,
      dependencies,
      patterns,
    };
  }

  private async discoverFiles(repoPath: string): Promise<string[]> {
    const files = await glob("**/*", {
      cwd: repoPath,
      ignore: this.ignorePatterns,
      absolute: true,
      nodir: true,
    });

    // Filter by extension and limit count
    const filtered = files
      .filter((file) => this.scanExtensions.has(path.extname(file)))
      .slice(0, this.maxFiles);

    return filtered;
  }

  private async analyzeFiles(
    files: string[],
    repoPath: string,
  ): Promise<RepositoryFile[]> {
    const analyzed: RepositoryFile[] = [];

    for (const file of files) {
      try {
        const stats = await fs.stat(file);
        if (stats.size > this.maxFileSize) continue;

        const content = await fs.readFile(file, "utf-8");
        const lines = content.split("\n").length;
        const relativePath = path.relative(repoPath, file);
        const language = this.detectLanguage(path.extname(file));

        analyzed.push({
          path: relativePath,
          content: content.slice(0, 10000), // Limit content size
          size: stats.size,
          lines,
          language,
        });
      } catch (error) {
        console.error(`Error analyzing file ${file}:`, error);
      }
    }

    return analyzed;
  }

  private detectLanguages(files: RepositoryFile[]): string[] {
    const languageSet = new Set<string>();
    for (const file of files) {
      if (file.language) {
        languageSet.add(file.language);
      }
    }
    return Array.from(languageSet);
  }

  private detectLanguage(extension: string): string {
    const languageMap: Record<string, string> = {
      ".ts": "TypeScript",
      ".tsx": "TypeScript",
      ".js": "JavaScript",
      ".jsx": "JavaScript",
      ".py": "Python",
      ".go": "Go",
      ".rs": "Rust",
      ".java": "Java",
      ".cs": "C#",
      ".php": "PHP",
      ".json": "JSON",
      ".md": "Markdown",
      ".yml": "YAML",
      ".yaml": "YAML",
      ".toml": "TOML",
    };
    return languageMap[extension] || "Unknown";
  }

  private async readPackageJson(repoPath: string): Promise<any> {
    try {
      const packageJsonPath = path.join(repoPath, "package.json");
      const content = await fs.readFile(packageJsonPath, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private async readReadme(repoPath: string): Promise<string | null> {
    try {
      const readmeNames = ["README.md", "README.txt", "README"];
      for (const name of readmeNames) {
        const readmePath = path.join(repoPath, name);
        try {
          const content = await fs.readFile(readmePath, "utf-8");
          return content;
        } catch {
          continue;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private async extractDependencies(
    packageJson: any,
    repoPath: string,
  ): Promise<Record<string, string>> {
    const dependencies: Record<string, string> = {};

    if (packageJson?.dependencies) {
      Object.assign(dependencies, packageJson.dependencies);
    }
    if (packageJson?.devDependencies) {
      Object.assign(dependencies, packageJson.devDependencies);
    }

    // Try to detect Python requirements
    try {
      const requirementsPath = path.join(repoPath, "requirements.txt");
      const requirements = await fs.readFile(requirementsPath, "utf-8");
      requirements.split("\n").forEach((line) => {
        const match = line.match(/^([a-zA-Z0-9_-]+)[>=<]/);
        if (match) {
          dependencies[match[1]] = line;
        }
      });
    } catch {
      // Python requirements not found
    }

    return dependencies;
  }

  private detectPatterns(files: RepositoryFile[], packageJson: any): string[] {
    const patterns: string[] = [];

    // Detect frameworks from package.json
    if (packageJson?.dependencies) {
      if (packageJson.dependencies.react) patterns.push("React");
      if (packageJson.dependencies.vue) patterns.push("Vue");
      if (packageJson.dependencies.angular) patterns.push("Angular");
      if (packageJson.dependencies.next) patterns.push("Next.js");
      if (packageJson.dependencies.express) patterns.push("Express");
      if (packageJson.dependencies.fastify) patterns.push("Fastify");
      if (packageJson.dependencies.djangorestframework)
        patterns.push("Django REST");
    }

    // Detect patterns from file structure
    const hasTests = files.some(
      (f) => f.path.includes(".test.") || f.path.includes(".spec."),
    );
    if (hasTests) patterns.push("Testing");

    const hasComponents = files.some((f) => f.path.includes("components"));
    if (hasComponents) patterns.push("Component Architecture");

    const hasApi = files.some(
      (f) => f.path.includes("api") || f.path.includes("routes"),
    );
    if (hasApi) patterns.push("API Layer");

    const hasDocker = files.some((f) => f.path === "Dockerfile");
    if (hasDocker) patterns.push("Docker");

    const hasK8s = files.some(
      (f) => f.path.includes("k8s") || f.path.includes("kubernetes"),
    );
    if (hasK8s) patterns.push("Kubernetes");

    return patterns;
  }

  // Convert to format expected by AI service
  toAIRepositoryData(structure: RepositoryStructure) {
    return {
      files: structure.files.map((f) => ({
        path: f.path,
        content: f.content,
        size: f.size,
      })),
      packageJson: structure.packageJson,
      readme: structure.readme,
      languages: structure.languages,
    };
  }

  toAIRepositoryStructure(structure: RepositoryStructure) {
    return {
      files: structure.files.map((f) => ({
        path: f.path,
        lines: f.lines || 0,
        complexity: f.lines, // Simple complexity estimate
      })),
      dependencies: structure.dependencies,
      patterns: structure.patterns,
    };
  }
}

export const repositoryAnalyzer = new RepositoryAnalyzer();
