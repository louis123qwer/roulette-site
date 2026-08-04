import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatGold } from "@/lib/format";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [{ count: pendingCount }, { count: prizeCount }, { count: userCount }, { data: ledger }] =
    await Promise.all([
      supabase.from("wins").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("prizes").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("daily_ledger").select("net_profit"),
    ]);

  const netProfit = (ledger ?? []).reduce((sum, row) => sum + row.net_profit, 0);

  const stats = [
    { label: "지급 대기 중", value: String(pendingCount ?? 0), href: "/admin/wins" },
    { label: "활성 상품", value: String(prizeCount ?? 0), href: "/admin/prizes" },
    { label: "전체 회원", value: String(userCount ?? 0), href: "/admin/members" },
    { label: "누적 순이익", value: formatGold(netProfit), href: "/admin/ledger" },
  ];

  return (
    <div className="space-y-8">
      <p className="font-heading text-2xl font-semibold text-foreground">관리자 개요</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const content = (
            <Card className="border-border">
              <CardHeader>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardHeader>
              <CardContent>
                <p className="font-heading text-3xl font-semibold tabular-nums text-foreground">
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          );
          return stat.href ? (
            <Link key={stat.label} href={stat.href}>
              {content}
            </Link>
          ) : (
            <div key={stat.label}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
