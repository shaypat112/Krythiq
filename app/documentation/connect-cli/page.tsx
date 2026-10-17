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

    <p className="rounded-xl bg-card p-5 text-sm leading-6 text-muted-foreground">Renewal and named connections require CLI 0.3.0 or newer and the updated server. Install with npm install -g krythiq@latest, or use npx krythiq@latest.</p>
    <section className="space-y-5">
      <h2 className="text-xl font-semibold">1. Start from your project</h2>
      <Command>npx krythiq connect --name my-laptop</Command>
      <p className="leading-7 text-muted-foreground">A browser page opens and your terminal shows a short code. Keep the terminal open while you finish the next step.</p>
    </section>

    <section className="space-y-5">
      <h2 className="text-xl font-semibold">2. Approve the terminal</h2>
      <ol className="space-y-3 border-y border-border py-4 text-sm leading-6 text-muted-foreground">
        <li><span className="mr-2 font-semibold text-foreground">1.</span>Sign in to Krythiq if asked.</li>
        <li><span className="mr-2 font-semibold text-foreground">2.</span>Check that the browser code matches the terminal code.</li>
        <li><span className="mr-2 font-semibold text-foreground">3.</span>Select <span className="font-medium text-foreground">Authorize terminal</span>.</li>
      </ol>
      <p className="leading-7 text-muted-foreground">After approval, the browser waits for the terminal to claim its connection. Keep the terminal open until both confirm success. Then use krythiq token for the live balance; the browser does not display a guessed balance.</p>
    </section>

    <section className="space-y-5">
      <h2 className="text-xl font-semibold">3. Run a scan</h2>
      <Command>npx krythiq scan .</Command>
      <p className="leading-7 text-muted-foreground">The static scan runs locally and costs 0 Tokens. It stays in your terminal unless you choose to save it.</p>
      <Command>npx krythiq scan . --save</Command>
      <p className="leading-7 text-muted-foreground"><code>--save</code> adds the result to Recent Scans in the Krythiq Web UI. Saving a static terminal scan also costs 0 Tokens and requires a connected CLI session.</p>
      <div className="flex flex-wrap gap-3"><Button asChild><Link href="/scan/history">Open scan history <ArrowRight /></Link></Button><Button asChild variant="outline"><Link href="/settings?section=cli">Open CLI settings <ExternalLink /></Link></Button></div>
    </section>

    <section className="space-y-5">
      <h2 className="text-xl font-semibold">Use account Tokens for hosted AI</h2>
      <Command>krythiq review src/auth.ts</Command>
      <Command>krythiq ask &quot;Explain the auth flow&quot; --file src/auth.ts</Command>
      <p className="leading-7 text-muted-foreground">Review costs 15 Tokens and a question costs 10 Tokens, using the website balance and refund rules. Each command prompts before uploading selected files; use --yes in scripts. Provider failures refund the charge. Reuse the printed --request-id with unchanged input after an interrupted response to avoid paying twice. These commands require the 0.3.0 CLI and updated server.</p>
      <Command>krythiq tokens --history</Command>
    </section>

    <section className="space-y-5">
      <h2 className="text-xl font-semibold">Check or remove the connection</h2>
      <div className="space-y-3"><div><p className="mb-2 text-sm font-medium">See which account is signed in and verify the session</p><Command>npx krythiq whoami</Command><p className="mt-2 text-sm leading-6 text-muted-foreground">This checks the saved session with Krythiq.dev and shows the account, Token balance, CLI scans, and scan Tokens used. For new sessions, access renews automatically before expiry and once after an authentication failure. A revoked or expired terminal authorization requires browser sign-in again. Temporary outages retain the saved connection.</p></div><div><p className="mb-2 text-sm font-medium">Check Tokens left</p><Command>npx krythiq token</Command><p className="mt-2 text-sm leading-6 text-muted-foreground">This performs a live balance check for the connected account. Static scans and saving them with <code>--save</code> remain free.</p></div><div><p className="mb-2 text-sm font-medium">Show connection and Token balance</p><Command>npx krythiq connect --status</Command></div><div><p className="mb-2 text-sm font-medium">Revoke this terminal and remove its local connection</p><Command>npx krythiq connect --disconnect</Command></div></div>
      <p className="leading-7 text-muted-foreground">You can also revoke a terminal from <Link href="/settings?section=cli" className="font-medium text-foreground underline underline-offset-4">Settings → CLI</Link>. CLI settings are always available, including after a terminal expires or is revoked. The page refreshes every 30 seconds and when you return to the tab. Expired or revoked sessions do not count as authorized.</p>
    </section>

    <section className="space-y-5">
      <h2 className="text-xl font-semibold">Renewal and troubleshooting</h2>
      <Command>krythiq connect --refresh</Command>
      <p className="leading-7 text-muted-foreground">New 0.3.0 connections use one-hour access credentials and a 90-day authorization. Access renews automatically within that window; the authorization deadline never extends silently. Existing durable credentials remain valid until revoked, but need one new browser connection to enable renewal.</p>
      <p className="leading-7 text-muted-foreground">The CLI resolves the production hostname to www.krythiq.dev before sending credentials, avoiding false expiration from redirects. If KRYTHIQ_CLI_TOKEN is set, it overrides browser credentials and cannot auto-renew. Unset it before browser sign-in, or update it explicitly. Changing dashboard URLs requires a connection to that same origin, preventing saved credentials from being sent elsewhere.</p>
      <p className="leading-7 text-muted-foreground">If disconnect cannot reach the server, it clears local credentials and reports that remote revocation is unconfirmed. Use Settings → CLI to finish revocation. Usage totals include all CLI history on both sides; the UI scan list shows the latest 100.</p>
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
