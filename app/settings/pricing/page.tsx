"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PricingPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/billing"); }, [router]);
  return <main className="mx-auto max-w-3xl p-10 text-center text-sm text-muted-foreground">Opening secure billing…</main>;
}
