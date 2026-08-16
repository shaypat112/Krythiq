import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ExternalLink, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentationCodeBlock } from "../documentation-code-block";

export const metadata: Metadata = {
  title: "Connect the CLI to Krythiq",
  description: "Connect Krythiq CLI scans to your web dashboard.",
};

const Command = ({ children }: { children: string }) => <DocumentationCodeBlock code={children} />;

export default function ConnectCliDocsPage() {
  return <article className="space-y-10">
    <header className="space-y-4 border-b border-border pb-8">
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"><Terminal className="size-4" />CLI and website</p>
      <h1 className="text-4xl font-semibold tracking-tight">Connect your terminal</h1>
      <p className="max-w-2xl text-base leading-7 text-muted-foreground">Connect once to send future CLI scan results to your Krythiq dashboard. You approve the connection in your browser.</p>
    </header>

    <section className="space-y-5">
      <h2 className="text-xl font-semibold">1. Start from your project</h2>
      <Command>npx krythiq connect</Command>
      <p className="leading-7 text-muted-foreground">A browser page opens and your terminal shows a short code. Keep the terminal open while you finish the next step.</p>
    </section>

    <section className="space-y-5">
      <h2 className="text-xl font-semibold">2. Approve the terminal</h2>
      <ol className="space-y-3 border-y border-border py-4 text-sm leading-6 text-muted-foreground">
        <li><span className="mr-2 font-semibold text-foreground">1.</span>Sign in to Krythiq if asked.</li>
        <li><span className="mr-2 font-semibold text-foreground">2.</span>Check that the browser code matches the terminal code.</li>
        <li><span className="mr-2 font-semibold text-foreground">3.</span>Select <span className="font-medium text-foreground">Authorize terminal</span>.</li>
      </ol>
      <p className="leading-7 text-muted-foreground">The terminal confirms the connection and shows your available Tokens. You can close the browser tab.</p>
    </section>

    <section className="space-y-5">
      <h2 className="text-xl font-semibold">3. Run a scan</h2>
      <Command>npx krythiq scan .</Command>
      <p className="leading-7 text-muted-foreground">The scan still runs on your computer. When it finishes, its results are added to your dashboard automatically.</p>
      <div className="flex flex-wrap gap-3"><Button asChild><Link href="/scan/history">Open scan history <ArrowRight /></Link></Button><Button asChild variant="outline"><Link href="/settings?section=cli">Open CLI settings <ExternalLink /></Link></Button></div>
    </section>

    <section className="space-y-5">
      <h2 className="text-xl font-semibold">Check or remove the connection</h2>
      <div className="space-y-3"><div><p className="mb-2 text-sm font-medium">See which account is signed in and verify the session</p><Command>npx krythiq whoami</Command><p className="mt-2 text-sm leading-6 text-muted-foreground">This checks the saved session with Krythiq.dev and shows the account, Token balance, CLI scans, and scan Tokens used. If the session expired or was revoked, it tells you to connect again.</p></div><div><p className="mb-2 text-sm font-medium">Show connection and Token balance</p><Command>npx krythiq connect --status</Command></div><div><p className="mb-2 text-sm font-medium">Remove the connection from this computer</p><Command>npx krythiq connect --disconnect</Command></div></div>
      <p className="leading-7 text-muted-foreground">You can also revoke a terminal from <Link href="/settings?section=cli" className="font-medium text-foreground underline underline-offset-4">Settings → CLI</Link>. The CLI section appears only after a terminal is connected.</p>
    </section>

    <section className="space-y-5">
      <h2 className="text-xl font-semibold">Local website or remote terminal</h2>
      <p className="leading-7 text-muted-foreground">If Krythiq is running on your computer, point the CLI to that address:</p>
      <Command>KRYTHIQ_DASHBOARD_URL=http://localhost:3000 npx krythiq connect</Command>
      <p className="leading-7 text-muted-foreground">If the terminal cannot open a browser, print the link and open it yourself:</p>
      <Command>npx krythiq connect --no-browser</Command>
    </section>

    <aside className="flex gap-3 border-y border-border py-5 text-sm leading-6 text-muted-foreground"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" /><p>Your website password and browser sign-in are not saved in the terminal. You can revoke a connected terminal at any time.</p></aside>
  </article>;
}
