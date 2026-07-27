import type { Metadata } from "next";
import { LegalList, LegalPage, LegalSection } from "@/app/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy - Votrio", description: "How Votrio collects, uses, shares, retains, and deletes data." };

export default function PrivacyPage() {
  return <LegalPage eyebrow="Legal" title="Privacy Policy" summary="This policy explains what Votrio collects, why we use it, where it goes, how long it remains, and the controls available to you.">
    <LegalSection title="1. Scope"><p>This policy applies to the Votrio website, accounts, repository and file scanning features, reports, notifications, and related support. It does not govern third-party websites you choose to visit.</p></LegalSection>
    <LegalSection title="2. Data we collect">
      <LegalList>
        <li><strong className="text-foreground">Account data:</strong> email address, name, username, avatar URL, authentication identifiers, team membership, and account preferences.</li>
        <li><strong className="text-foreground">Scan inputs:</strong> repository URL, repository metadata, supported source and configuration files read through GitHub, or a file you upload directly.</li>
        <li><strong className="text-foreground">Scan outputs:</strong> findings, code excerpts needed as evidence, severity, architecture observations, remediation suggestions, review decisions, and report metadata.</li>
        <li><strong className="text-foreground">Operational data:</strong> request timestamps, security and error logs, IP-derived request information available to our hosting providers, notifications, invitation records, and webhook delivery information.</li>
        <li><strong className="text-foreground">Browser storage:</strong> authentication state, theme and team preferences, and a marker recording whether a guest scan has been used.</li>
      </LegalList>
    </LegalSection>
    <LegalSection title="3. Why we use data"><p>We use data to authenticate users, perform requested static analysis, generate and display reports, preserve signed-in scan history, operate teams and notifications, prevent abuse, diagnose failures, secure the service, honor deletion requests, and communicate about the service. We do not use uploaded code to execute repository programs.</p></LegalSection>
    <LegalSection title="4. Where data goes">
      <LegalList>
        <li><strong className="text-foreground">Supabase</strong> provides authentication and account-scoped data storage.</li>
        <li><strong className="text-foreground">GitHub</strong> receives read-only API requests when you request a repository scan.</li>
        <li><strong className="text-foreground">Mistral AI</strong> may receive bounded repository context, findings, and relevant code evidence to generate analysis when AI intelligence is enabled.</li>
        <li><strong className="text-foreground">Resend</strong> processes email delivery, such as team invitations.</li>
        <li>Hosting, network, and security providers process limited request data needed to deliver and protect Votrio. Webhook destinations receive scan event data only when an authenticated user configures them.</li>
      </LegalList>
      <p>We do not sell personal information or use it for cross-context behavioral advertising.</p>
    </LegalSection>
    <LegalSection title="5. Retention"><p>Signed-in scan history and notifications are automatically removed after 30 days under the current retention setting. Guest scans are not written to Votrio scan history. Direct file uploads are processed to produce the response and are not intentionally retained as standalone files. Account profile, team, settings, and security records remain while the account is active or as reasonably needed for legal, fraud-prevention, security, and dispute purposes. Backups and provider logs may persist for a limited period before deletion cycles complete.</p></LegalSection>
    <LegalSection title="6. Your choices and deletion"><p>From Settings, signed-in users can clear scan history, clear notifications, clear both, or permanently delete their account. Account deletion removes the profile, stored scans, notifications, connected repositories, team records associated with the account, settings, webhooks, and sign-in access. You may also request access, correction, or deletion by emailing <a href="mailto:privacy@votrio.com" className="text-foreground underline">privacy@votrio.com</a>. We may verify your identity before fulfilling a request.</p></LegalSection>
    <LegalSection title="7. Security"><p>We use access controls, bounded scan limits, read-only GitHub access, and other technical and organizational safeguards appropriate to the service. No system is perfectly secure, and we cannot guarantee absolute security.</p></LegalSection>
    <LegalSection title="8. Children"><p>Votrio is not directed to children under 13, and we do not knowingly collect personal information from children under 13. Contact us if you believe a child has provided personal information.</p></LegalSection>
    <LegalSection title="9. Changes"><p>We may update this policy as the service changes. We will revise the “Last updated” date and provide additional notice when a change is material and notice is required.</p></LegalSection>
  </LegalPage>;
}
