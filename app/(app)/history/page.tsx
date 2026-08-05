import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { WinHistoryList } from "@/components/win-history-list";

export default async function HistoryPage() {
  const profile = await requireUser();
  const supabase = await createClient();

  const { data: wins } = await supabase
    .from("wins")
    .select("*")
    .eq("user_id", profile.id)
    .is("hidden_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <p className="font-heading text-2xl font-semibold text-foreground">당첨 내역</p>
      <WinHistoryList userId={profile.id} initialWins={wins ?? []} />
    </div>
  );
}
