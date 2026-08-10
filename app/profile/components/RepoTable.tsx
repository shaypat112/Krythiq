import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ConnectedRepo = {
  id: string;
  full_name: string;
  private: boolean;
  last_scanned_at: string | null;
};

export default function RepoTable({
  repos,
  onConnect,
  onScan,
  scanningRepo,
}: {
  repos: ConnectedRepo[];
  onConnect: () => void;
  onScan: (repo: ConnectedRepo) => void;
  scanningRepo?: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected repositories</CardTitle>
        <CardDescription>Projects available from your GitHub account.</CardDescription>
      </CardHeader>
      <CardContent>
        {repos.length === 0 ? (
          <div className="flex flex-col gap-3 text-sm text-zinc-500">
            No repositories connected yet.
            <Button size="sm" variant="outline" onClick={onConnect}>
              Connect GitHub
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Repository</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Last scanned</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {repos.map((repo) => (
                <TableRow key={repo.id}>
                  <TableCell className="font-medium text-zinc-100">
                    {repo.full_name}
                  </TableCell>
                  <TableCell className="text-zinc-400">
                    {repo.private ? "private" : "public"}
                  </TableCell>
                  <TableCell className="text-zinc-400">
                    {repo.last_scanned_at
                      ? new Date(repo.last_scanned_at).toLocaleDateString()
                      : "never"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onScan(repo)}
                      disabled={scanningRepo === repo.full_name}
                    >
                      {scanningRepo === repo.full_name ? "Scanning..." : "Scan"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
