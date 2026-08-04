"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";
import { deleteMyPaidWinsAction } from "@/app/actions/history";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Win = Database["public"]["Tables"]["wins"]["Row"];

export function WinHistoryList({
  userId,
  initialWins,
}: {
  userId: string;
  initialWins: Win[];
}) {
  const [wins, setWins] = useState(initialWins);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`wins-user-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wins",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Win;
          setWins((prev) => prev.map((w) => (w.id === updated.id ? { ...w, ...updated } : w)));
          if (updated.status === "paid") {
            toast.success(`"${updated.prize_name_snapshot}" 지급이 완료되었습니다.`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const paidCount = wins.filter((w) => w.status === "paid").length;

  function handleDeletePaid() {
    if (paidCount === 0) return;
    if (!window.confirm(`수령완료된 ${paidCount}건을 목록에서 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }
    startTransition(async () => {
      const res = await deleteMyPaidWinsAction();
      if (!res.ok) {
        toast.error("삭제에 실패했습니다: " + res.message);
        return;
      }
      setWins((prev) => prev.filter((w) => w.status !== "paid"));
      toast.success(`${res.count}건 삭제했습니다.`);
    });
  }

  if (wins.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">아직 당첨 내역이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {paidCount > 0 && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDeletePaid}
            disabled={isPending}
          >
            수령완료 전체 삭제 ({paidCount})
          </Button>
        </div>
      )}
      {wins.map((win) => (
        <div
          key={win.id}
          className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
        >
          <div>
            <p className="text-sm font-medium text-foreground">{win.prize_name_snapshot}</p>
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
      ))}
    </div>
  );
}
