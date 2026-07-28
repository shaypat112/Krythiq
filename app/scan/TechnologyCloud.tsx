"use client";

import { Boxes, Code2 } from "lucide-react";

import { IconCloud } from "@/components/ui/icon-cloud";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ICON_SLUGS: Record<string, string> = {
  "typescript": "typescript", "javascript": "javascript", "python": "python", "go": "go",
  "rust": "rust", "java": "openjdk", "c#": "dotnet", "php": "php", "ruby": "ruby",
  "next.js": "nextdotjs", "next": "nextdotjs", "react": "react", "tailwind css": "tailwindcss",
  "tailwind": "tailwindcss", "supabase": "supabase", "prisma": "prisma", "drizzle": "drizzle",
  "three.js": "threedotjs", "three": "threedotjs", "stripe": "stripe", "postgresql": "postgresql",
  "express": "express", "django": "django", "fastapi": "fastapi", "docker": "docker",
  "node.js": "nodedotjs", "node": "nodedotjs", "yaml": "yaml", "json": "json",
};

function iconUrl(label: string) {
  const normalized = label.toLowerCase().replace(/^@/, "").split("/").at(-1) ?? label.toLowerCase();
  const slug = ICON_SLUGS[normalized] ?? ICON_SLUGS[normalized.replace(/\.(js|css)$/, "")];
  return slug ? `https://cdn.simpleicons.org/${slug}` : null;
}

export function TechnologyCloud({
  languages,
  technologies,
  dependencies,
}: {
  languages: string[];
  technologies: string[];
  dependencies: string[];
}) {
  const labels = [...new Set([...technologies, ...languages, ...dependencies])];
  const images = labels.map(iconUrl).filter((url): url is string => Boolean(url)).slice(0, 36);

  return (
    <Card id="technology-cloud" className="overflow-hidden border-sky-500/20 bg-[radial-gradient(circle_at_center,rgba(14,165,233,.1),transparent_52%),var(--card)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Boxes className="h-5 w-5 text-sky-400" /> Repository technology cloud</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">Drag to explore the detected languages, frameworks, services, and dependencies in 3D.</p>
      </CardHeader>
      <CardContent className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
        <div className="mx-auto max-w-full overflow-hidden">
          {images.length ? <IconCloud images={images} /> : <div className="grid h-72 place-items-center text-sm text-muted-foreground">No supported technology icons detected.</div>}
        </div>
        <div className="space-y-4">
          <TechnologyList title="Languages & stack" items={[...new Set([...languages, ...technologies])]} />
          <TechnologyList title="Dependencies" items={dependencies} />
        </div>
      </CardContent>
    </Card>
  );
}

function TechnologyList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-background/55 p-4">
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground"><Code2 className="h-3.5 w-3.5" />{title}</p>
      <div className="mt-3 flex max-h-36 flex-wrap gap-1.5 overflow-auto">
        {items.length ? items.slice(0, 28).map((item) => <span key={item} className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs">{item}</span>) : <span className="text-xs text-muted-foreground">None detected</span>}
      </div>
    </div>
  );
}
