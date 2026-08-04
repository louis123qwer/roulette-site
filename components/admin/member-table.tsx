"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { grantTicketsAction } from "@/app/actions/admin";
import type { Database } from "@/lib/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export function MemberTable({ initialMembers }: { initialMembers: Profile[] }) {
  const [members, setMembers] = useState(initialMembers);
  const [query, setQuery] = useState("");
  const [grantAmounts, setGrantAmounts] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.email.toLowerCase().includes(q) || (m.display_name ?? "").toLowerCase().includes(q)
    );
  }, [members, query]);

  function handleGrant(userId: string) {
    const raw = grantAmounts[userId];
    const amount = Number(raw);
    if (!raw || !Number.isFinite(amount) || amount === 0) {
      toast.error("지급(또는 차감)할 뽑기권 수를 입력해주세요. 음수도 가능합니다.");
      return;
    }
    startTransition(async () => {
      const res = await grantTicketsAction(userId, amount);
      if (!res.ok) {
        toast.error("처리에 실패했습니다: " + res.message);
        return;
      }
      setMembers((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, ticket_balance: res.ticketBalance } : m))
      );
      setGrantAmounts((prev) => ({ ...prev, [userId]: "" }));
      toast.success(`${amount > 0 ? "+" : ""}${amount}장 처리 완료`);
    });
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="닉네임 또는 이메일로 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>닉네임</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>권한</TableHead>
              <TableHead>뽑기권</TableHead>
              <TableHead>가입일</TableHead>
              <TableHead className="text-right">뽑기권 지급</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium text-foreground">
                  {member.display_name ?? (
                    <span className="text-muted-foreground">(닉네임 미설정)</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{member.email}</TableCell>
                <TableCell>
                  <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                    {member.role === "admin" ? "관리자" : "일반"}
                  </Badge>
                </TableCell>
                <TableCell className="tabular-nums">{member.ticket_balance}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(member.created_at).toLocaleDateString("ko-KR")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Input
                      type="number"
                      placeholder="±수량"
                      className="h-8 w-20"
                      value={grantAmounts[member.id] ?? ""}
                      onChange={(e) =>
                        setGrantAmounts((prev) => ({ ...prev, [member.id]: e.target.value }))
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGrant(member.id)}
                      disabled={isPending}
                    >
                      지급
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  검색 결과가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
