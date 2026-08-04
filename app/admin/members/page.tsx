import { createClient } from "@/lib/supabase/server";
import { MemberTable } from "@/components/admin/member-table";

export default async function AdminMembersPage() {
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <p className="font-heading text-2xl font-semibold text-foreground">회원 목록</p>
        <p className="mt-1 text-sm text-muted-foreground">
          전체 {members?.length ?? 0}명의 회원이 가입되어 있습니다.
        </p>
      </div>
      <MemberTable initialMembers={members ?? []} />
    </div>
  );
}
