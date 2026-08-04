"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";
import { formatGold, formatProbabilityPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Prize = Database["public"]["Tables"]["prizes"]["Row"];
type Tier = Database["public"]["Tables"]["prizes"]["Row"]["tier"];

const BULK_TICKET_COST = 10;
const BULK_TOTAL_DRAWS = 11;

const TIER_LABELS: Record<Tier, string> = {
  mythic: "신화",
  legendary: "최고",
  gold: "골드",
  purple: "보라",
  blue: "파랑",
  basic: "기본",
};
const TIER_OPTIONS = Object.keys(TIER_LABELS) as Tier[];

const COLOR_PALETTE = [
  "#B8394B",
  "#2F6F4E",
  "#1F5A8C",
  "#B8860B",
  "#6B4E9E",
  "#C2703D",
  "#2E7D7B",
  "#8C4B6B",
  "#4A5D8C",
  "#7A8C3A",
];

export function PrizeManager({
  initialPrizes,
  initialTicketPrice,
}: {
  initialPrizes: Prize[];
  initialTicketPrice: number;
}) {
  const [prizes, setPrizes] = useState(initialPrizes);
  const [ticketPrice, setTicketPrice] = useState(String(initialTicketPrice));
  const [isPending, startTransition] = useTransition();
  const [newPrize, setNewPrize] = useState<{ name: string; weight: string; color: string; tier: Tier }>({
    name: "",
    weight: "10",
    color: COLOR_PALETTE[0],
    tier: "basic",
  });

  const totalWeight = prizes.filter((p) => p.is_active).reduce((sum, p) => sum + p.weight, 0);

  const sortedPrizes = useMemo(
    () => [...prizes].sort((a, b) => a.weight - b.weight),
    [prizes]
  );

  const expectedPayoutPerSpin = useMemo(() => {
    if (totalWeight <= 0) return 0;
    return prizes
      .filter((p) => p.is_active)
      .reduce((sum, p) => sum + (p.weight / totalWeight) * p.market_price, 0);
  }, [prizes, totalWeight]);

  const price = Number(ticketPrice) || 0;
  const marginSingle = price > 0 ? ((price - expectedPayoutPerSpin) / price) * 100 : null;
  const bulkEffectivePrice = (price * BULK_TICKET_COST) / BULK_TOTAL_DRAWS;
  const marginBulk =
    bulkEffectivePrice > 0
      ? ((bulkEffectivePrice - expectedPayoutPerSpin) / bulkEffectivePrice) * 100
      : null;

  function updatePrizeLocal(id: string, patch: Partial<Prize>) {
    setPrizes((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function saveField(
    id: string,
    patch: Partial<Pick<Prize, "name" | "color" | "weight" | "market_price" | "tier">>
  ) {
    const supabase = createClient();
    startTransition(async () => {
      const { error } = await supabase.from("prizes").update(patch).eq("id", id);
      if (error) {
        toast.error("수정에 실패했습니다: " + error.message);
      }
    });
  }

  function toggleActive(id: string, isActive: boolean) {
    updatePrizeLocal(id, { is_active: isActive });
    const supabase = createClient();
    startTransition(async () => {
      const { error } = await supabase
        .from("prizes")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) {
        toast.error("상태 변경에 실패했습니다: " + error.message);
        updatePrizeLocal(id, { is_active: !isActive });
      }
    });
  }

  function deletePrize(id: string) {
    const supabase = createClient();
    startTransition(async () => {
      const { error } = await supabase.from("prizes").delete().eq("id", id);
      if (error) {
        toast.error("삭제에 실패했습니다: " + error.message);
        return;
      }
      setPrizes((prev) => prev.filter((p) => p.id !== id));
    });
  }

  function addPrize() {
    const weight = Number(newPrize.weight);
    if (!newPrize.name.trim() || !Number.isFinite(weight) || weight <= 0) {
      toast.error("상품명과 올바른 확률 가중치를 입력해주세요.");
      return;
    }
    const supabase = createClient();
    startTransition(async () => {
      const { data, error } = await supabase
        .from("prizes")
        .insert({
          name: newPrize.name.trim(),
          weight,
          color: newPrize.color,
          tier: newPrize.tier,
          sort_order: prizes.length,
        })
        .select()
        .single();
      if (error || !data) {
        toast.error("상품 추가에 실패했습니다: " + error?.message);
        return;
      }
      setPrizes((prev) => [...prev, data]);
      setNewPrize({
        name: "",
        weight: "10",
        color: COLOR_PALETTE[(prizes.length + 1) % COLOR_PALETTE.length],
        tier: "basic",
      });
    });
  }

  function saveTicketPrice() {
    const value = Number(ticketPrice);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("올바른 뽑기권 가격을 입력해주세요.");
      return;
    }
    const supabase = createClient();
    startTransition(async () => {
      const { error } = await supabase
        .from("settings")
        .update({ ticket_price: value })
        .eq("id", 1);
      if (error) {
        toast.error("뽑기권 가격 저장에 실패했습니다: " + error.message);
        return;
      }
      toast.success("뽑기권 가격이 저장되었습니다.");
    });
  }

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <p className="text-sm font-medium text-foreground">새 상품 추가</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="prize-name">상품명</Label>
            <Input
              id="prize-name"
              value={newPrize.name}
              onChange={(e) => setNewPrize((p) => ({ ...p, name: e.target.value }))}
              placeholder="예: 스타벅스 아메리카노"
            />
          </div>
          <div className="w-32 space-y-1.5">
            <Label htmlFor="prize-weight">확률 가중치</Label>
            <Input
              id="prize-weight"
              type="number"
              min={0.0001}
              step="any"
              value={newPrize.weight}
              onChange={(e) => setNewPrize((p) => ({ ...p, weight: e.target.value }))}
            />
          </div>
          <div className="w-24 space-y-1.5">
            <Label htmlFor="prize-color">색상</Label>
            <Input
              id="prize-color"
              type="color"
              value={newPrize.color}
              onChange={(e) => setNewPrize((p) => ({ ...p, color: e.target.value }))}
              className="h-9 p-1"
            />
          </div>
          <div className="w-28 space-y-1.5">
            <Label htmlFor="prize-tier">이펙트 등급</Label>
            <select
              id="prize-tier"
              value={newPrize.tier}
              onChange={(e) => setNewPrize((p) => ({ ...p, tier: e.target.value as Tier }))}
              className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            >
              {TIER_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {TIER_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={addPrize} disabled={isPending}>
            추가
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <p className="text-sm font-medium text-foreground">상품 목록</p>
          <p className="text-xs text-muted-foreground">
            당첨 확률이 낮은(희귀한) 상품이 위에서부터 자동 정렬됩니다.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>색상</TableHead>
                <TableHead>상품명</TableHead>
                <TableHead>등급</TableHead>
                <TableHead>가중치</TableHead>
                <TableHead>실제 확률</TableHead>
                <TableHead>시세(골드)</TableHead>
                <TableHead>활성</TableHead>
                <TableHead className="text-right">삭제</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPrizes.map((prize) => (
                <TableRow key={prize.id}>
                  <TableCell>
                    <Input
                      type="color"
                      defaultValue={prize.color}
                      className="h-8 w-12 p-1"
                      onChange={(e) => {
                        updatePrizeLocal(prize.id, { color: e.target.value });
                        saveField(prize.id, { color: e.target.value });
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      defaultValue={prize.name}
                      className="w-40 font-medium text-foreground"
                      onBlur={(e) => {
                        const value = e.target.value.trim();
                        if (value && value !== prize.name) {
                          updatePrizeLocal(prize.id, { name: value });
                          saveField(prize.id, { name: value });
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <select
                      value={prize.tier}
                      onChange={(e) => {
                        const value = e.target.value as Tier;
                        updatePrizeLocal(prize.id, { tier: value });
                        saveField(prize.id, { tier: value });
                      }}
                      className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                    >
                      {TIER_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {TIER_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0.0001}
                      step="any"
                      defaultValue={prize.weight}
                      className="w-24"
                      onBlur={(e) => {
                        const value = Number(e.target.value);
                        if (Number.isFinite(value) && value > 0 && value !== prize.weight) {
                          updatePrizeLocal(prize.id, { weight: value });
                          saveField(prize.id, { weight: value });
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                    {prize.is_active && totalWeight > 0
                      ? formatProbabilityPercent(prize.weight / totalWeight)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      defaultValue={prize.market_price}
                      className="w-28"
                      onBlur={(e) => {
                        const value = Number(e.target.value);
                        if (Number.isFinite(value) && value >= 0 && value !== prize.market_price) {
                          updatePrizeLocal(prize.id, { market_price: value });
                          saveField(prize.id, { market_price: value });
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={prize.is_active}
                      onCheckedChange={(checked) => toggleActive(prize.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePrize(prize.id)}
                      disabled={isPending}
                    >
                      삭제
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <p className="text-sm font-medium text-foreground">손익 시뮬레이션</p>
          <p className="text-xs text-muted-foreground">
            상품 시세와 뽑기권 가격을 입력하면 스핀당 기대 손익을 계산합니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="w-40 space-y-1.5">
              <Label htmlFor="ticket-price">뽑기권 가격(골드)</Label>
              <Input
                id="ticket-price"
                type="number"
                min={0}
                step="any"
                value={ticketPrice}
                onChange={(e) => setTicketPrice(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={saveTicketPrice} disabled={isPending}>
              저장
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">스핀당 기대 지급액</p>
              <p className="mt-1 font-heading text-xl font-semibold tabular-nums text-foreground">
                {formatGold(expectedPayoutPerSpin)}
              </p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">단일 스핀 마진</p>
              <p className="mt-1 font-heading text-xl font-semibold tabular-nums text-foreground">
                {marginSingle === null ? "—" : `${marginSingle.toFixed(1)}%`}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                양수면 이득, 음수면 손해
              </p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">10+1연차 마진</p>
              <p className="mt-1 font-heading text-xl font-semibold tabular-nums text-foreground">
                {marginBulk === null ? "—" : `${marginBulk.toFixed(1)}%`}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                보너스 1회 포함, 티켓 10장당 11회 지급 기준
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
