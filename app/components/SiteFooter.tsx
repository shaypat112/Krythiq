import Link from "next/link";

import { BrandLogo } from "./BrandLogo";
import { SocialButton } from "./SocialButton";
import { GitHubStarButton } from "./GitHubStarButton";

const footerLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/documentation", label: "Documentation" },
  { href: "/partners", label: "Partners" },
  { href: "https://github.com/shaypat112/Krythiq", label: "GitHub", external: true },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="mx-auto grid max-w-[1600px] gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 font-semibold"><BrandLogo className="h-8 w-8 rounded-xl" />Krythiq</Link>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">Repository intelligence and security review for teams shipping modern software.</p>
          <nav className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground" aria-label="Footer">
            {footerLinks.map((link) => <Link key={link.label} href={link.href} target={link.external ? "_blank" : undefined} rel={link.external ? "noreferrer" : undefined} className="transition hover:text-foreground">{link.label}</Link>)}
          </nav>
        </div>
        <div className="md:text-right">
          <GitHubStarButton />
          <SocialButton className="mt-3 md:ml-auto" />
          <p className="mt-4 text-xs text-muted-foreground">© {new Date().getFullYear()} Krythiq. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
