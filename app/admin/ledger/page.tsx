import { createClient } from "@/lib/supabase/server";
import { formatGold } from "@/lib/format";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default async function AdminLedgerPage() {
  const supabase = await createClient();
  const { data: daily } = await supabase
    .from("daily_ledger")
    .select("*")
    .order("day", { ascending: false });

  const rows = daily ?? [];
  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
  const totalPayout = rows.reduce((sum, r) => sum + r.payout, 0);
  const totalNet = totalRevenue - totalPayout;

  return (
    <div className="space-y-8">
      <div>
        <p className="font-heading text-2xl font-semibold text-foreground">장부</p>
        <p className="mt-1 text-sm text-muted-foreground">
          뽑기권 소모(수익)와 당첨 지급(비용)을 일자별로 자동 집계합니다.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border">
          <CardHeader>
            <p className="text-sm text-muted-foreground">누적 수익</p>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold tabular-nums text-foreground">
              {formatGold(totalRevenue)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader>
            <p className="text-sm text-muted-foreground">누적 지급액</p>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold tabular-nums text-foreground">
              {formatGold(totalPayout)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader>
            <p className="text-sm text-muted-foreground">누적 순이익</p>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "font-heading text-3xl font-semibold tabular-nums",
                totalNet >= 0 ? "text-foreground" : "text-destructive"
              )}
            >
              {formatGold(totalNet)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <p className="text-sm font-medium text-foreground">일자별 내역</p>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              아직 집계된 내역이 없습니다.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜</TableHead>
                  <TableHead>수익</TableHead>
                  <TableHead>지급액</TableHead>
                  <TableHead>순이익</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.day}>
                    <TableCell className="text-sm text-foreground">
                      {new Date(row.day).toLocaleDateString("ko-KR")}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatGold(row.revenue)}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatGold(row.payout)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "tabular-nums font-medium",
                        row.net_profit >= 0 ? "text-foreground" : "text-destructive"
                      )}
                    >
                      {formatGold(row.net_profit)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
