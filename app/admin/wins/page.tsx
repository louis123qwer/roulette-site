import { createClient } from "@/lib/supabase/server";
import { WinManager } from "@/components/admin/win-manager";

export default async function AdminWinsPage() {
  const supabase = await createClient();

  const { data: wins } = await supabase
    .from("wins")
    .select("*")
    .is("hidden_at", null)
    .order("created_at", { ascending: false });

  const userIds = Array.from(new Set((wins ?? []).map((w) => w.user_id)));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, email, display_name").in("id", userIds)
    : { data: [] as { id: string; email: string; display_name: string | null }[] };

  const userInfoById: Record<string, { label: string; email: string }> = {};
  for (const p of profiles ?? []) {
    userInfoById[p.id] = { label: p.display_name ?? p.email, email: p.email };
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-heading text-2xl font-semibold text-foreground">당첨 내역 관리</p>
        <p className="mt-1 text-sm text-muted-foreground">
          회원별·상품별로 묶어서 보여줍니다. 체크 후 일괄 지급완료 또는 삭제할 수 있어요.
        </p>
      </div>
      <WinManager initialWins={wins ?? []} userInfoById={userInfoById} />
    </div>
  );
}
