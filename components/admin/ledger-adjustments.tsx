"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";
import { formatGold } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Adjustment = Database["public"]["Tables"]["ledger_adjustments"]["Row"];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function LedgerAdjustments({
  initialAdjustments,
  currentTotalNet,
}: {
  initialAdjustments: Adjustment[];
  currentTotalNet: number;
}) {
  const [adjustments, setAdjustments] = useState(initialAdjustments);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ day: todayStr(), amount: "", note: "" });

  function addAdjustment() {
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount === 0) {
      toast.error("0이 아닌 조정 금액을 입력해주세요.");
      return;
    }
    const supabase = createClient();
    startTransition(async () => {
      const { data, error } = await supabase
        .from("ledger_adjustments")
        .insert({ day: form.day, amount, note: form.note.trim() || null })
        .select()
        .single();
      if (error || !data) {
        toast.error("추가에 실패했습니다: " + error?.message);
        return;
      }
      setAdjustments((prev) => [data, ...prev]);
      setForm({ day: todayStr(), amount: "", note: "" });
      toast.success("조정 항목을 추가했습니다.");
    });
  }

  function updateAdjustment(id: string, patch: Partial<Pick<Adjustment, "amount" | "note" | "day">>) {
    const supabase = createClient();
    startTransition(async () => {
      const { error } = await supabase.from("ledger_adjustments").update(patch).eq("id", id);
      if (error) {
        toast.error("수정에 실패했습니다: " + error.message);
        return;
      }
      setAdjustments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    });
  }

  function deleteAdjustment(id: string) {
    const supabase = createClient();
    startTransition(async () => {
      const { error } = await supabase.from("ledger_adjustments").delete().eq("id", id);
      if (error) {
        toast.error("삭제에 실패했습니다: " + error.message);
        return;
      }
      setAdjustments((prev) => prev.filter((a) => a.id !== id));
      toast.success("삭제했습니다.");
    });
  }

  function resetLedger() {
    if (currentTotalNet === 0) {
      toast.message("이미 누적 순이익이 0입니다.");
      return;
    }
    if (
      !window.confirm(
        `현재 누적 순이익 ${formatGold(currentTotalNet)}을(를) 0으로 맞추는 조정 항목을 오늘 날짜로 추가할까요? 기존 일자별 기록은 남고, 누적 합계만 0이 됩니다.`
      )
    ) {
      return;
    }
    const supabase = createClient();
    startTransition(async () => {
      const { data, error } = await supabase
        .from("ledger_adjustments")
        .insert({ day: todayStr(), amount: -currentTotalNet, note: "관리자 초기화" })
        .select()
        .single();
      if (error || !data) {
        toast.error("초기화에 실패했습니다: " + error?.message);
        return;
      }
      setAdjustments((prev) => [data, ...prev]);
      toast.success("장부를 초기화했습니다.");
    });
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">수동 조정</p>
            <p className="text-xs text-muted-foreground">
              자동 집계 외에 직접 금액을 더하거나 뺄 수 있습니다. 양수는 순이익 증가, 음수는 감소입니다.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={resetLedger} disabled={isPending}>
            장부 초기화
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="adj-day">날짜</Label>
            <Input
              id="adj-day"
              type="date"
              value={form.day}
              onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))}
              className="w-40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adj-amount">조정 금액(골드)</Label>
            <Input
              id="adj-amount"
              type="number"
              step="any"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="예: -50000 또는 100000"
              className="w-40"
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="adj-note">메모</Label>
            <Input
              id="adj-note"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="사유 (선택)"
            />
          </div>
          <Button onClick={addAdjustment} disabled={isPending}>
            추가
          </Button>
        </div>

        {adjustments.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜</TableHead>
                  <TableHead>금액</TableHead>
                  <TableHead>메모</TableHead>
                  <TableHead className="text-right">삭제</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Input
                        type="date"
                        defaultValue={a.day}
                        className="w-36"
                        onBlur={(e) => {
                          if (e.target.value && e.target.value !== a.day) {
                            updateAdjustment(a.id, { day: e.target.value });
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="any"
                        defaultValue={a.amount}
                        className="w-32"
                        onBlur={(e) => {
                          const value = Number(e.target.value);
                          if (Number.isFinite(value) && value !== a.amount) {
                            updateAdjustment(a.id, { amount: value });
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        defaultValue={a.note ?? ""}
                        className="w-48"
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          if (value !== (a.note ?? "")) {
                            updateAdjustment(a.id, { note: value || null });
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAdjustment(a.id)}
                        disabled={isPending}
                      >
                        삭제
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
