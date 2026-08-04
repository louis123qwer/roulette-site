"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";
import { Badge } from "@/components/ui/badge";
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

  if (wins.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">아직 당첨 내역이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
