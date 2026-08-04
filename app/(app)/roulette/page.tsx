import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { RouletteWheel } from "@/components/roulette-wheel";
import { RouletteRulesModal } from "@/components/roulette-rules-modal";
import { FighterCrest } from "@/components/fighter-crest";

export default async function RoulettePage() {
  const profile = await requireUser();
  const supabase = await createClient();

  const { data: prizes } = await supabase
    .from("prizes")
    .select("id, name, weight, color")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (!prizes || prizes.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">현재 진행 중인 상품이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <RouletteRulesModal />
      <div className="pointer-events-none absolute right-4 top-1/2 hidden w-28 -translate-y-1/2 flex-col items-center gap-2 text-center lg:flex xl:right-10">
        <FighterCrest className="h-24 w-20 text-foreground opacity-[0.07]" />
        <p className="font-heading text-[11px] italic leading-snug text-muted-foreground opacity-60">
          무명의 파이터, 그는 승부사였다...
        </p>
      </div>
      <div className="text-center">
        <p className="font-heading text-2xl font-semibold text-foreground">룰렛</p>
        <p className="mt-1 text-sm text-muted-foreground">
          조각 크기는 실제 당첨 확률과 동일합니다. 결과는 서버에서 계산됩니다.
        </p>
      </div>
      <RouletteWheel prizes={prizes} initialTicketBalance={profile.ticket_balance} />
    </div>
  );
}
