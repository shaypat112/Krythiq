import AuthClient from "./AuthClient";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center"><Skeleton className="h-[34rem] w-full max-w-md rounded-xl" /></div>}>
      <AuthClient />
    </Suspense>
  );
}
