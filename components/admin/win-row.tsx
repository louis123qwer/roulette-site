"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { markWinPaidAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/types/database";

type Win = Database["public"]["Tables"]["wins"]["Row"];

export function WinRow({ win, userEmail }: { win: Win; userEmail: string }) {
  const [status, setStatus] = useState(win.status);
  const [isPending, startTransition] = useTransition();

  function handleMarkPaid() {
    startTransition(async () => {
      const res = await markWinPaidAction(win.id);
      if (!res.ok) {
        toast.error("지급 처리에 실패했습니다: " + res.message);
        return;
      }
      setStatus("paid");
      toast.success("지급 완료로 처리했습니다.");
    });
  }

  return (
    <TableRow>
      <TableCell className="text-sm text-muted-foreground">{userEmail}</TableCell>
      <TableCell className="font-medium text-foreground">{win.prize_name_snapshot}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {new Date(win.created_at).toLocaleString("ko-KR")}
      </TableCell>
      <TableCell>
        <Badge
          className={cn(
            "border-0",
            status === "paid"
              ? "bg-status-paid text-status-paid-foreground"
              : "bg-status-pending text-status-pending-foreground"
          )}
        >
          {status === "paid" ? "지급 완료" : "지급 대기"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        {status === "pending" && (
          <Button size="sm" onClick={handleMarkPaid} disabled={isPending}>
            지급 완료
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
