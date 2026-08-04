import { createClient } from "@/lib/supabase/server";
import { PrizeManager } from "@/components/admin/prize-manager";

export default async function AdminPrizesPage() {
  const supabase = await createClient();
  const [{ data: prizes }, { data: settings }] = await Promise.all([
    supabase.from("prizes").select("*").order("sort_order", { ascending: true }),
    supabase.from("settings").select("ticket_price").eq("id", 1).single(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="font-heading text-2xl font-semibold text-foreground">확률 설정</p>
        <p className="mt-1 text-sm text-muted-foreground">
          가중치(weight)에 비례해 룰렛 조각 크기와 당첨 확률이 결정됩니다. 실제 추첨은 서버에서만
          계산됩니다.
        </p>
      </div>
      <PrizeManager initialPrizes={prizes ?? []} initialTicketPrice={settings?.ticket_price ?? 0} />
    </div>
  );
}
