import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingPost() {
  return <div className="mx-auto max-w-3xl space-y-4"><Skeleton className="h-9 w-36" /><Skeleton className="h-[32rem] rounded-3xl" /></div>;
}
