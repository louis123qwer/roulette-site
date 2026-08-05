import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DragonCrest } from "@/components/dragon-crest";
import { cn } from "@/lib/utils";

const RANK_STYLE: Record<number, { glow: string; label: string }> = {
  1: { glow: "#b81e2b", label: "신화" },
  2: { glow: "#f5c56a", label: "전설" },
  3: { glow: "#a879e0", label: "희귀" },
};

export default async function RankingPage() {
  await requireUser();
  const supabase = await createClient();
  const { data: rows } = await supabase.rpc("get_spin_leaderboard");

  const leaderboard = rows ?? [];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="font-heading text-2xl font-semibold text-foreground">누적 스핀 랭킹</p>
        <p className="mt-1 text-sm text-muted-foreground">가장 많이 룰렛을 돌린 도전자들</p>
      </div>

      {leaderboard.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">아직 랭킹 데이터가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((row, index) => {
            const rank = index + 1;
            const style = RANK_STYLE[rank];
            return (
              <div
                key={row.user_id}
                className={cn("flex items-center gap-4 rounded-2xl border bg-card p-4", !style && "border-border")}
                style={
                  style
                    ? {
                        borderColor: style.glow,
                        boxShadow: `0 0 24px ${style.glow}40`,
                        background: `linear-gradient(135deg, ${style.glow}14, transparent 60%)`,
                      }
                    : undefined
                }
              >
                <div className="flex w-8 shrink-0 items-center justify-center">
                  {style ? (
                    <DragonCrest className="h-7 w-8" style={{ color: style.glow }} />
                  ) : (
                    <span className="font-heading text-lg font-semibold text-muted-foreground">
                      {rank}
                    </span>
                  )}
                </div>
                <Avatar size={style ? "lg" : "default"}>
                  <AvatarImage src={row.avatar_url ?? undefined} alt="" />
                  <AvatarFallback>{(row.display_name ?? "?").slice(0, 1)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {row.display_name ?? "이름 없음"}
                  </p>
                  {style && (
                    <p className="text-xs font-medium" style={{ color: style.glow }}>
                      {style.label}
                    </p>
                  )}
                </div>
                <p className="shrink-0 font-heading text-lg font-semibold tabular-nums text-foreground">
                  {row.spin_count}회
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
