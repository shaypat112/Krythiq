import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentationCodeBlock } from "../documentation-code-block";

export default function AiDetectionPage() {
  return <article className="space-y-8">
    <header><h1 className="text-3xl font-semibold">AI-assisted scan summaries</h1><p className="mt-3 max-w-3xl text-muted-foreground">The CLI does not detect whether code was AI-generated. Its only scan-time AI capability is an optional Mistral summary of findings already produced by custom rules, Semgrep, or npm audit.</p></header>
    <Card><CardHeader><CardTitle>Enable explicitly</CardTitle></CardHeader><CardContent><DocumentationCodeBlock code="MISTRAL_API_KEY=your-key krythiq scan --ai" /></CardContent></Card>
    <Card><CardHeader><CardTitle>Data and failure behavior</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>Up to 50 structured findings, including any captured snippet, are sent to Mistral. AI does not discover or change findings.</p><p>If the credential is missing, the request fails, or the 30-second timeout expires, the scan continues and JSON output contains <code>&quot;aiSummary&quot;: null</code>.</p></CardContent></Card>
  </article>;
}
