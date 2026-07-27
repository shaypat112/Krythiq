import type { Metadata } from "next";
import { LegalList, LegalPage, LegalSection } from "@/app/components/LegalPage";

export const metadata: Metadata = { title: "Cookie Notice - Votrio", description: "Cookies and browser storage used by Votrio." };

export default function CookiesPage() {
  return <LegalPage eyebrow="Legal" title="Cookie Notice" summary="This notice identifies the cookies and similar browser technologies Votrio uses, including authentication and guest-scan controls.">
    <LegalSection title="1. What these technologies are"><p>Cookies are small values stored by a website in your browser. Votrio also uses local storage, which remains in your browser until it is cleared. These technologies help keep sessions active, remember choices, and enforce service limits.</p></LegalSection>
    <LegalSection title="2. Technologies currently used">
      <LegalList>
        <li><strong className="text-foreground">Authentication cookies:</strong> Supabase session cookies keep signed-in users authenticated and protect account-scoped requests. These are necessary for account features.</li>
        <li><strong className="text-foreground">Guest scan cookie:</strong> <code className="text-foreground">votrio_guest_scan</code> records that the browser has consumed its guest scan. It lasts up to one year and is used to enforce the free-scan limit.</li>
        <li><strong className="text-foreground">Guest scan local storage:</strong> <code className="text-foreground">votrio_guest_scan_used</code> provides the same limit signal in the interface.</li>
        <li><strong className="text-foreground">Preference storage:</strong> local storage remembers theme and selected-team preferences.</li>
      </LegalList>
    </LegalSection>
    <LegalSection title="3. Analytics and advertising"><p>Votrio does not currently set advertising cookies or use cookies for cross-site behavioral advertising. Votrio does not currently enable optional analytics cookies. If that changes, this notice will be updated and consent controls will be provided where required.</p></LegalSection>
    <LegalSection title="4. Managing cookies"><p>You can delete or block cookies and local storage through your browser settings. Blocking authentication cookies will prevent sign-in and saved account features. Clearing the guest-scan marker does not create a contractual right to additional guest scans, and attempts to evade service limits may violate the Acceptable Use Policy.</p></LegalSection>
    <LegalSection title="5. Changes"><p>We may update this notice when technologies change. Review the “Last updated” date above for the latest revision.</p></LegalSection>
  </LegalPage>;
}
