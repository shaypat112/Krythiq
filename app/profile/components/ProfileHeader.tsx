import { Card, CardContent } from "@/components/ui/card";
export default function ProfileHeader({
  name,
  email,
  tier,
  initials,
  avatarUrl,
}: {
  name: string;
  email: string | null;
  tier: "free" | "pro" | "team";
  initials: string;
  avatarUrl?: string | null;
}) {
  return (
    <Card>
      <CardContent className="p-6 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="h-14 w-14 rounded-full object-cover border border-zinc-800"
            />
          ) : (
            <div className="h-14 w-14 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-sm font-semibold text-zinc-200">
              {initials}
            </div>
          )}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">{name}</h1>
              <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {tier}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{email ?? "Email unavailable"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
