import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
            {connected ? <Badge variant="outline" className="border-emerald-500/30 text-emerald-500">Connected</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        {!connected ? <Button size="sm" variant="outline" onClick={onClick}>Connect</Button> : null}
      </CardContent>
    </Card>
  );
}
