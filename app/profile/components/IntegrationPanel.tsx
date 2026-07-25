import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function IntegrationPanel({
  title,
  description,
  connected,
  onClick,
}: {
  title: string;
  description: string;
  connected?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{title}</p>
            {connected ? (
              <span className="text-xs uppercase tracking-[0.14em] text-emerald-400">
                connected
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <Button size="sm" variant="outline" onClick={onClick}>
          {connected ? "Sync repositories" : "Connect"}
        </Button>
      </CardContent>
    </Card>
  );
}
