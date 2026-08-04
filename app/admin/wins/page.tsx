import { createClient } from "@/lib/supabase/server";
import { WinRow } from "@/components/admin/win-row";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminWinsPage() {
  const supabase = await createClient();

  const { data: wins } = await supabase
    .from("wins")
    .select("*")
    .order("created_at", { ascending: false });

  const userIds = Array.from(new Set((wins ?? []).map((w) => w.user_id)));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, email").in("id", userIds)
    : { data: [] as { id: string; email: string }[] };

  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));

  return (
    <div className="space-y-6">
      <p className="font-heading text-2xl font-semibold text-foreground">당첨 내역 관리</p>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>유저</TableHead>
              <TableHead>상품</TableHead>
              <TableHead>당첨 시각</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">처리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(wins ?? []).map((win) => (
              <WinRow key={win.id} win={win} userEmail={emailById.get(win.user_id) ?? "알 수 없음"} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
