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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Votrio — AI-Powered Code Intelligence & Security Platform",
  description:
    "Enterprise-grade code analysis, security scanning, and repository intelligence. Transform your development workflow with AI-powered insights.",
  icons: {
    icon: "/votrio_logo.jpeg",
    shortcut: "/votrio_logo.jpeg",
    apple: "/votrio_logo.jpeg",
  },
  openGraph: {
    title: "Votrio — AI-Powered Code Intelligence & Security Platform",
    description:
      "Enterprise-grade code analysis, security scanning, and repository intelligence. Transform your development workflow with AI-powered insights.",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "Votrio repository security intelligence" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Votrio — AI-Powered Code Intelligence & Security Platform",
    description: "Ship AI-generated code without shipping its vulnerabilities.",
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
