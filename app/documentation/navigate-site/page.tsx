import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Coins, Compass, FileCode2, GitPullRequestArrow, History, MessageCircle, ScanSearch, Settings, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  {
    title: "Start here",
    description: "Connect a repository and run your first scan. Krythiq reads the project, looks for concrete risks, and organizes what deserves attention first.",
    links: [{ href: "/scan", label: "Run a scan", icon: ScanSearch }, { href: "/documentation/quickstart", label: "Quick start", icon: BookOpen }],
  },
  {
    title: "Understand the result",
    description: "Launch Readiness gives you a simple shipping signal. Scan History keeps earlier results together so you can see whether a project is improving.",
    links: [{ href: "/scan/readiness", label: "Launch readiness", icon: ShieldCheck }, { href: "/scan/history", label: "Scan history", icon: History }],
  },
  {
    title: "Fix what was found",
    description: "Guided Fixes turns a finding into a prompt for Codex, Claude, Gemini, Copilot, Windsurf, or Cursor. Draft Changes lets you inspect and edit the proposed code before using it.",
    links: [{ href: "/scan/fixes", label: "Guided fixes", icon: CheckCircle2 }, { href: "/scan/drafts", label: "Draft changes", icon: FileCode2 }, { href: "/scan/verification", label: "Check fixes", icon: GitPullRequestArrow }],
  },
  {
    title: "Build with your team",
    description: "Create a team, invite people, choose a shared workspace, and keep project activity together. Owners and admins control membership and shared project settings.",
    links: [{ href: "/teams", label: "Teams", icon: Users }, { href: "/settings", label: "Settings", icon: Settings }],
  },
  {
    title: "Meet and message builders",
    description: "Discover is the community area. View safe public profiles and projects, request to follow someone, and message them after they accept.",
    links: [{ href: "/discover", label: "Discover", icon: Compass }, { href: "/discover/requests", label: "Follow requests", icon: MessageCircle }],
  },
  {
    title: "Tokens and billing",
    description: "Tokens pay for scans and AI-assisted actions. Billing shows your balance, usage table, graphs, invoices, and available plans in one place.",
    links: [{ href: "/billing", label: "Billing and plans", icon: Coins }, { href: "/settings?section=billing", label: "Usage details", icon: Coins }],
  },
];

export default function NavigateSitePage() {
  return <main className="space-y-10"><header className="border-b border-border pb-8"><p className="text-xs font-semibold uppercase tracking-[.22em] text-muted-foreground">Navigate Krythiq</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">From repository to launch, without the jargon</h1><p className="mt-3 max-w-2xl leading-7 text-muted-foreground">You do not need to be a security expert. Follow this path to find problems, understand them, fix them, and decide when your product is ready to ship.</p></header><ol className="divide-y divide-border border-y border-border">{sections.map((section, index) => <li key={section.title} className="grid gap-4 py-7 sm:grid-cols-[3rem_minmax(0,1fr)]"><span className="grid size-10 place-items-center rounded-full bg-muted font-semibold tabular-nums">{index + 1}</span><div><h2 className="text-xl font-semibold">{section.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{section.description}</p><div className="mt-4 flex flex-wrap gap-2">{section.links.map(({ href, label, icon: Icon }) => <Button key={href} asChild variant="outline" size="sm"><Link href={href}><Icon />{label}<ArrowRight /></Link></Button>)}</div></div></li>)}</ol><section className="rounded-2xl bg-muted/40 p-6"><h2 className="font-semibold">A simple first-day plan</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Run one scan, open the highest-priority finding, generate an agent prompt, make the fix, then run another scan. That loop is enough to start making a product safer before launch.</p><Button asChild className="mt-4"><Link href="/scan">Scan your first repository <ArrowRight /></Link></Button></section></main>;
}
