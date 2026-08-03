import "./globals.css";

import AppShell from "./components/AppShell";
import { ThemeProvider } from "./components/theme-provider";
import TeamProvider from "./components/TeamProvider";
import { Geist } from "next/font/google";
import { cn } from "./lib/utils";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://krythiq.dev";
const structuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Krythiq",
  url: siteUrl,
  logo: `${siteUrl}/krythiq-favicon.png`,
  sameAs: ["https://github.com/shaypat112/Krythiq"],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Krythiq — AI-Powered Code Intelligence & Security Platform",
  description:
    "Enterprise-grade code analysis, security scanning, and repository intelligence. Transform your development workflow with AI-powered insights.",
  icons: {
    icon: [
      { url: "/krythiq-favicon.png", type: "image/png", sizes: "1254x1254" },
      { url: "/krythiq_logo.jpeg", type: "image/jpeg", sizes: "1024x559" },
    ],
    shortcut: "/krythiq-favicon.png",
    apple: "/krythiq-favicon.png",
  },
  alternates: { canonical: "/" },
  openGraph: {
    title: "Krythiq — AI-Powered Code Intelligence & Security Platform",
    description:
      "Enterprise-grade code analysis, security scanning, and repository intelligence. Transform your development workflow with AI-powered insights.",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "Krythiq repository security intelligence" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Krythiq — AI-Powered Code Intelligence & Security Platform",
    description: "Repository security scans, findings, and remediation workflows.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(geist.variable)}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider delayDuration={350} skipDelayDuration={150}>
            <TeamProvider>
              <AppShell>{children}</AppShell>
              <Analytics />
            </TeamProvider>
            <Toaster position="bottom-right" richColors closeButton />
          </TooltipProvider>

        </ThemeProvider>
      </body>
    </html>
  );
}
