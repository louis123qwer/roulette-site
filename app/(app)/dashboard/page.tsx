import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const profile = await requireUser();
  const supabase = await createClient();

  const { data: recentWins } = await supabase
    .from("wins")
    .select("id, prize_name_snapshot, status, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(3);

  return (
    <div className="space-y-8">
      <div>
        <p className="font-heading text-2xl font-semibold text-foreground">
          안녕하세요, {profile.display_name ?? profile.email.split("@")[0]}님
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          보유한 뽑기권으로 룰렛을 돌려보세요.
        </p>
      </div>

      <Card className="border-border">
        <CardContent className="flex flex-col items-center gap-6 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-sm text-muted-foreground">보유 뽑기권</p>
            <p className="font-heading text-5xl font-semibold tabular-nums text-foreground">
              {profile.ticket_balance}
              <span className="ml-2 text-lg font-normal text-muted-foreground">개</span>
            </p>
          </div>
          <Button asChild size="lg" disabled={profile.ticket_balance === 0}>
            <Link href="/roulette">룰렛 돌리기</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <p className="text-sm font-medium text-foreground">최근 당첨 내역</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {!recentWins || recentWins.length === 0 ? (
            <p className="text-sm text-muted-foreground">아직 당첨 내역이 없습니다.</p>
          ) : (
            recentWins.map((win) => (
              <div
                key={win.id}
                className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {win.prize_name_snapshot}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(win.created_at).toLocaleString("ko-KR")}
                  </p>
                </div>
                <Badge
                  className={cn(
                    "border-0",
                    win.status === "paid"
                      ? "bg-status-paid text-status-paid-foreground"
                      : "bg-status-pending text-status-pending-foreground"
                  )}
                >
                  {win.status === "paid" ? "지급 완료" : "지급 대기"}
                </Badge>
              </div>
            ))
          )}
          <Button asChild variant="link" className="px-0 text-sm">
            <Link href="/history">전체 내역 보기 →</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
