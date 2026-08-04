"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  markWinsPaidAction,
  markAllPendingPaidAction,
  deleteWinsAction,
  deletePaidWinsAction,
} from "@/app/actions/admin";
import type { Database } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Win = Database["public"]["Tables"]["wins"]["Row"];
type UserInfo = { label: string; email: string };

type Group = {
  key: string;
  userId: string;
  prizeName: string;
  status: "pending" | "paid";
  winIds: string[];
  count: number;
  latestAt: string;
};

export function WinManager({
  initialWins,
  userInfoById,
}: {
  initialWins: Win[];
  userInfoById: Record<string, UserInfo>;
}) {
  const [wins, setWins] = useState(initialWins);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const win of wins) {
      const key = `${win.user_id}|${win.prize_name_snapshot}|${win.status}`;
      const existing = map.get(key);
      if (existing) {
        existing.winIds.push(win.id);
        existing.count += 1;
        if (win.created_at > existing.latestAt) existing.latestAt = win.created_at;
      } else {
        map.set(key, {
          key,
          userId: win.user_id,
          prizeName: win.prize_name_snapshot,
          status: win.status,
          winIds: [win.id],
          count: 1,
          latestAt: win.created_at,
        });
      }
    }
    return Array.from(map.values());
  }, [wins]);

  const usersOrder = useMemo(() => {
    const byUser = new Map<string, { pending: Group[]; paid: Group[] }>();
    for (const g of groups) {
      const bucket = byUser.get(g.userId) ?? { pending: [], paid: [] };
      if (g.status === "pending") bucket.pending.push(g);
      else bucket.paid.push(g);
      byUser.set(g.userId, bucket);
    }
    return Array.from(byUser.entries())
      .map(([userId, bucket]) => ({
        userId,
        label: userInfoById[userId]?.label ?? "알 수 없음",
        email: userInfoById[userId]?.email ?? "",
        pending: bucket.pending.sort((a, b) => b.latestAt.localeCompare(a.latestAt)),
        paid: bucket.paid.sort((a, b) => b.latestAt.localeCompare(a.latestAt)),
      }))
      .sort((a, b) => b.pending.length - a.pending.length);
  }, [groups, userInfoById]);

  const pendingTotal = groups
    .filter((g) => g.status === "pending")
    .reduce((sum, g) => sum + g.count, 0);
  const paidTotal = groups.filter((g) => g.status === "paid").reduce((sum, g) => sum + g.count, 0);

  function toggleGroup(group: Group) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(group.key)) next.delete(group.key);
      else next.add(group.key);
      return next;
    });
  }

  function selectedWinIds() {
    const ids: string[] = [];
    for (const g of groups) {
      if (selected.has(g.key)) ids.push(...g.winIds);
    }
    return ids;
  }

  function handleMarkSelectedPaid() {
    const ids = selectedWinIds();
    if (ids.length === 0) {
      toast.error("선택된 항목이 없습니다.");
      return;
    }
    startTransition(async () => {
      const res = await markWinsPaidAction(ids);
      if (!res.ok) {
        toast.error("처리에 실패했습니다: " + res.message);
        return;
      }
      const idSet = new Set(ids);
      setWins((prev) => prev.map((w) => (idSet.has(w.id) ? { ...w, status: "paid" as const } : w)));
      setSelected(new Set());
      toast.success(`${res.count}건 지급 완료 처리했습니다.`);
    });
  }

  function handleMarkAllPending() {
    startTransition(async () => {
      const res = await markAllPendingPaidAction();
      if (!res.ok) {
        toast.error("처리에 실패했습니다: " + res.message);
        return;
      }
      setWins((prev) =>
        prev.map((w) => (w.status === "pending" ? { ...w, status: "paid" as const } : w))
      );
      setSelected(new Set());
      toast.success(`${res.count}건 전체 지급 완료 처리했습니다.`);
    });
  }

  function handleDeleteSelected() {
    const ids = selectedWinIds();
    if (ids.length === 0) {
      toast.error("선택된 항목이 없습니다.");
      return;
    }
    startTransition(async () => {
      const res = await deleteWinsAction(ids);
      if (!res.ok) {
        toast.error("삭제에 실패했습니다: " + res.message);
        return;
      }
      const idSet = new Set(ids);
      setWins((prev) => prev.filter((w) => !idSet.has(w.id)));
      setSelected(new Set());
      toast.success(`${res.count}건 삭제했습니다.`);
    });
  }

  function handleDeleteAllPaid() {
    startTransition(async () => {
      const res = await deletePaidWinsAction();
      if (!res.ok) {
        toast.error("삭제에 실패했습니다: " + res.message);
        return;
      }
      setWins((prev) => prev.filter((w) => w.status !== "paid"));
      setSelected(new Set());
      toast.success(`지급완료 ${res.count}건을 삭제했습니다.`);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-4">
        <Button size="sm" onClick={handleMarkAllPending} disabled={isPending || pendingTotal === 0}>
          미지급 전체 지급완료 ({pendingTotal})
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleMarkSelectedPaid}
          disabled={isPending || selected.size === 0}
        >
          선택 항목 지급완료
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDeleteSelected}
          disabled={isPending || selected.size === 0}
        >
          선택 항목 삭제
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDeleteAllPaid}
          disabled={isPending || paidTotal === 0}
        >
          지급완료 전체 삭제
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">선택됨 {selected.size}건</span>
      </div>

      {usersOrder.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">당첨 내역이 없습니다.</p>
        </div>
      )}

      {usersOrder.map((user) => (
        <div key={user.userId} className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border bg-muted px-4 py-3">
            <p className="text-sm font-medium text-foreground">{user.label}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <div className="divide-y divide-border">
            {user.pending.length > 0 && (
              <div className="p-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">미지급</p>
                <div className="space-y-1.5">
                  {user.pending.map((g) => (
                    <GroupRow
                      key={g.key}
                      group={g}
                      selected={selected.has(g.key)}
                      onToggle={() => toggleGroup(g)}
                    />
                  ))}
                </div>
              </div>
            )}
            {user.paid.length > 0 && (
              <div className="p-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">지급완료</p>
                <div className="space-y-1.5">
                  {user.paid.map((g) => (
                    <GroupRow
                      key={g.key}
                      group={g}
                      selected={selected.has(g.key)}
                      onToggle={() => toggleGroup(g)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function GroupRow({
  group,
  selected,
  onToggle,
}: {
  group: Group;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-accent",
        selected && "bg-accent"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="h-4 w-4 shrink-0 rounded border-border"
        />
        <span className="truncate text-sm font-medium text-foreground">
          {group.prizeName} <span className="text-muted-foreground">× {group.count}</span>
        </span>
      </div>
      <Badge
        className={cn(
          "shrink-0 border-0",
          group.status === "paid"
            ? "bg-status-paid text-status-paid-foreground"
            : "bg-status-pending text-status-pending-foreground"
        )}
      >
        {group.status === "paid" ? "지급 완료" : "지급 대기"}
      </Badge>
    </label>
  );
}
