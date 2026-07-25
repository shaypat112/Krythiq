import type { Metadata } from "next";
import { Braces, Database, ScanSearch, TerminalSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tree, type TreeViewElement } from "@/components/ui/file-tree";

export const metadata: Metadata = {
  title: "Project structure - Votrio",
  description:
    "Explore the real Votrio repository structure and learn where the product, scanner, CLI, and database code live.",
};

const repositoryTree: TreeViewElement[] = [
  {
    id: "app",
    name: "app",
    children: [
      {
        id: "app-api",
        name: "api",
        children: [
          { id: "app-api-ai", name: "ai", type: "folder" },
          { id: "app-api-billing", name: "billing", type: "folder" },
          { id: "app-api-github", name: "github", type: "folder" },
          { id: "app-api-integrations", name: "integrations", type: "folder" },
          { id: "app-api-notifications", name: "notifications", type: "folder" },
          { id: "app-api-scan", name: "scan", type: "folder" },
          { id: "app-api-teams", name: "teams", type: "folder" },
          { id: "app-api-webhooks", name: "webhooks", type: "folder" },
        ],
      },
      { id: "app-auth", name: "auth", type: "folder" },
      { id: "app-components", name: "components", type: "folder" },
      { id: "app-dashboard", name: "dashboard", type: "folder" },
      { id: "app-documentation", name: "documentation", type: "folder" },
      {
        id: "app-lib",
        name: "lib",
        children: [
          { id: "app-lib-integrations", name: "integrations", type: "folder" },
          { id: "app-lib-notifications", name: "notifications", type: "folder" },
          {
            id: "app-lib-scanner",
            name: "scanner",
            children: [
              {
                id: "app-lib-scanner-rules",
                name: "rules",
                children: [
                  {
                    id: "app-lib-scanner-registry",
                    name: "registry.ts",
                    type: "file",
                  },
                  {
                    id: "app-lib-scanner-policy",
                    name: "scanner-policy.json",
                    type: "file",
                  },
                  {
                    id: "app-lib-scanner-security",
                    name: "security-rules.json",
                    type: "file",
                  },
                ],
              },
            ],
          },
          { id: "app-lib-server", name: "server", type: "folder" },
          {
            id: "app-lib-repository-analyzer",
            name: "repository-analyzer.ts",
            type: "file",
          },
          { id: "app-lib-supabase", name: "supabase.ts", type: "file" },
        ],
      },
      { id: "app-onboarding", name: "onboarding", type: "folder" },
      { id: "app-profile", name: "profile", type: "folder" },
      { id: "app-reports", name: "reports", type: "folder" },
      { id: "app-scan", name: "scan", type: "folder" },
      { id: "app-settings", name: "settings", type: "folder" },
      { id: "app-teams", name: "teams", type: "folder" },
      { id: "app-layout", name: "layout.tsx", type: "file" },
      { id: "app-page", name: "page.tsx", type: "file" },
    ],
  },
  {
    id: "backend",
    name: "backend",
    children: [
      {
        id: "backend-src",
        name: "src",
        children: [
          {
            id: "backend-commands",
            name: "commands",
            children: [
              { id: "backend-auth", name: "auth.ts", type: "file" },
              { id: "backend-init", name: "init.ts", type: "file" },
              { id: "backend-run", name: "run.ts", type: "file" },
              { id: "backend-scan", name: "scan.ts", type: "file" },
            ],
          },
          { id: "backend-lib", name: "lib", type: "folder" },
          { id: "backend-utils", name: "utils", type: "folder" },
          { id: "backend-cli", name: "cli.ts", type: "file" },
          { id: "backend-config", name: "config.ts", type: "file" },
        ],
      },
      { id: "backend-architecture", name: "ARCHITECTURE.md", type: "file" },
      { id: "backend-readme", name: "README.md", type: "file" },
      { id: "backend-package", name: "package.json", type: "file" },
    ],
  },
  {
    id: "components",
    name: "components",
    children: [
      { id: "components-ui", name: "ui", type: "folder" },
      { id: "components-globe", name: "globe-demo.tsx", type: "file" },
      {
        id: "components-loader",
        name: "multi-step-loader-demo.tsx",
        type: "file",
      },
    ],
  },
  {
    id: "supabase",
    name: "supabase",
    children: [
      { id: "supabase-migrations", name: "migrations", type: "folder" },
    ],
  },
  { id: "public", name: "public", type: "folder" },
  { id: "proxy", name: "proxy.ts", type: "file" },
  { id: "next-config", name: "next.config.ts", type: "file" },
  { id: "votrio-config", name: "votrio.config.ts", type: "file" },
  { id: "package", name: "package.json", type: "file" },
];

const areas = [
  {
    icon: Braces,
    title: "Product app",
    path: "app/",
    description:
      "Pages, protected API routes, authentication, integrations, teams, settings, and the scan experience.",
  },
  {
    icon: ScanSearch,
    title: "Scanning engine",
    path: "app/lib/scanner/",
    description:
      "Versioned policies, data-driven security rules, validators, and repository analysis logic.",
  },
  {
    icon: TerminalSquare,
    title: "Local CLI",
    path: "backend/src/",
    description:
      "The installable command-line client for authentication, local scans, and wrapped process runs.",
  },
  {
    icon: Database,
    title: "Data model",
    path: "supabase/migrations/",
    description:
      "Auditable SQL migrations for product data, notifications, integrations, teams, and invitations.",
  },
];

export default function ProjectStructurePage() {
  return (
    <article className="space-y-10">
      <header className="space-y-4">

        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
          Find the code you need without learning the whole codebase.
        </h1>
      </header>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center justify-between gap-3">
            <span>votrio/</span>
            <span className="text-xs font-normal text-muted-foreground">
              Select folders to expand
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tree
            aria-label="Votrio repository file structure"
            elements={repositoryTree}
            initialExpandedItems={["app", "app-lib", "backend", "components", "supabase"]}
            className="h-[34rem] py-5 font-mono"
          />
        </CardContent>
      </Card>

      <section aria-labelledby="structure-guide">
        <h2 id="structure-guide" className="text-2xl font-semibold">
          Four places to know
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {areas.map(({ icon: Icon, title, path, description }) => (
            <Card key={path}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-muted p-2">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <CardTitle className="text-base">{title}</CardTitle>
                    <code className="text-xs text-muted-foreground">{path}</code>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">
                {description}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <p className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
        Generated output, installed dependencies, local environment files, and
        build caches are intentionally omitted. The map shows source-controlled
        architecture, not every file on disk.
      </p>
    </article>
  );
}
