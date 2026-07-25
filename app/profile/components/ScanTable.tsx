import Link from "next/link";
import { Plus } from "lucide-react";
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
export type ScanRow = {
  repo: string;
  created_at: string;
  severity: string;
  issues: number;
  score: number;
  summary?: string | null;
};

export default function ScanTable({ scans }: { scans: ScanRow[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div><CardTitle>Recent scans</CardTitle><CardDescription>Your latest security scans.</CardDescription></div>
          <Button asChild size="sm"><Link href="/scan"><Plus /> New scan</Link></Button>
        </div>
      </CardHeader>
      <CardContent>
        {scans.length === 0 ? (
          <div className="text-sm text-zinc-500">No scans yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Repository</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Issues</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scans.map((scan) => (
                <TableRow key={`${scan.repo}-${scan.created_at}`}>
                  <TableCell className="font-medium text-foreground">
                    <div className="space-y-1">
                      <Link className="underline-offset-4 hover:underline" href={`/reports/${encodeURIComponent(scan.repo)}`}>{scan.repo}</Link>
                      {scan.summary ? (
                        <div className="text-xs text-zinc-500">
                          {scan.summary}
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(scan.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{scan.severity}</span>
                  </TableCell>
                  <TableCell>{scan.issues}</TableCell>
                  <TableCell>{scan.score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
