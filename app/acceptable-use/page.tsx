import type { Metadata } from "next";
import { LegalList, LegalPage, LegalSection } from "@/app/components/LegalPage";

export const metadata: Metadata = { title: "Acceptable Use Policy - Votrio", description: "Rules prohibiting abuse of Votrio and harm to other systems." };

export default function AcceptableUsePage() {
  return <LegalPage eyebrow="Legal" title="Acceptable Use Policy" summary="Use Votrio only for authorized security work. Do not use the service to harm people, systems, networks, or infrastructure.">
    <LegalSection title="1. Authorization required"><p>You may scan only repositories, files, and systems you own or are expressly authorized to assess. Votrio is not permission to access or test any third-party system.</p></LegalSection>
    <LegalSection title="2. Prohibited conduct">
      <LegalList>
        <li>Hacking, exploiting, credential theft, unauthorized access, surveillance, or destructive security testing.</li>
        <li>Creating, uploading, distributing, or improving malware, ransomware, botnets, phishing kits, destructive payloads, or tools primarily intended to harm others.</li>
        <li>Submitting illegal content, stolen code, personal data obtained unlawfully, child sexual abuse material, or content that infringes intellectual-property or privacy rights.</li>
        <li>Spam, unsolicited bulk messaging, deceptive campaigns, impersonation, fraud, or abusive automation.</li>
        <li>Attacking, probing, burdening, reverse engineering, scraping, or attempting to bypass the security, authentication, rate limits, guest-scan limit, or access controls of Votrio or its providers.</li>
        <li>Using scan results to exploit a vulnerability rather than remediate or responsibly disclose it.</li>
        <li>Interfering with another user, introducing malicious code into shared workflows, or using the service in violation of sanctions, export controls, or applicable law.</li>
      </LegalList>
    </LegalSection>
    <LegalSection title="3. Responsible security research"><p>Defensive research, education, and authorized penetration testing are allowed when you have clear permission, minimize data access and disruption, follow applicable law, and use findings to remediate or responsibly disclose risk.</p></LegalSection>
    <LegalSection title="4. Enforcement"><p>We may investigate suspected abuse, preserve relevant records, rate-limit requests, remove content, suspend or terminate accounts, and report conduct to affected providers or authorities when reasonably necessary or legally required. We may act immediately when conduct creates a security or safety risk.</p></LegalSection>
    <LegalSection title="5. Reporting abuse"><p>Report suspected abuse or infrastructure vulnerabilities to <a href="mailto:privacy@votrio.com" className="text-foreground underline">privacy@votrio.com</a>. Include enough detail for us to investigate, but do not send unnecessary personal data or live credentials.</p></LegalSection>
  </LegalPage>;
}
