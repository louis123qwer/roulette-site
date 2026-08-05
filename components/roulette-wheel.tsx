"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { toast } from "sonner";
import { spinAction, spinTenAction, spinLuckyAction } from "@/app/actions/spin";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatProbabilityPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SpinEffect, TIER_RANK, TIER_GLOW, type EffectTier } from "@/components/spin-effect";

type WheelPrize = {
  id: string;
  name: string;
  weight: number;
  color: string;
  tier: EffectTier;
  is_blank: boolean;
};

// Super Lucky Chance odds: blank prizes are excluded, purple～mythic weight
// x10, blue weight x20 — mirrors spin_roulette_lucky() server-side exactly,
// used here only to redraw the wheel/legend, never to decide the result.
function luckyWeight(prize: Pick<WheelPrize, "weight" | "tier" | "is_blank">): number {
  if (prize.is_blank) return 0;
  if (
    prize.tier === "purple" ||
    prize.tier === "gold" ||
    prize.tier === "legendary" ||
    prize.tier === "mythic"
  ) {
    return prize.weight * 10;
  }
  if (prize.tier === "blue") return prize.weight * 20;
  return prize.weight;
}

type BulkResult = { prizeName: string; drawIndex: number };

type PendingReveal =
  | { type: "single"; prizeName: string; isLucky: boolean }
  | { type: "bulk"; results: BulkResult[] };

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 4;
const SPIN_DURATION = 4.2;
const BULK_SPIN_DURATION = 3;
const EASE: [number, number, number, number] = [0.12, 0, 0.15, 1];
const BULK_PAID_DRAWS = 10;
const BULK_TOTAL_DRAWS = 11;
// Visual-only floor so a jackpot slice with a tiny real probability still
// shows up as a visible wedge — the actual odds (server-side) are untouched.
const MIN_VISUAL_DEGREES = 4;

function polarToCartesian(angleDeg: number, radius: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

function describeSlice(startAngle: number, endAngle: number) {
  const start = polarToCartesian(startAngle, RADIUS);
  const end = polarToCartesian(endAngle, RADIUS);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${CENTER},${CENTER} L ${start.x},${start.y} A ${RADIUS},${RADIUS} 0 ${largeArcFlag} 1 ${end.x},${end.y} Z`;
}

function readableTextColor(hex: string) {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#ffffff";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0a0a0a" : "#ffffff";
}

function truncateLabel(name: string, maxChars: number) {
  if (name.length <= maxChars) return name;
  return name.slice(0, Math.max(1, maxChars - 1)) + "…";
}

function errorMessage(code: string) {
  if (code === "insufficient_tickets") return "뽑기권이 부족합니다.";
  if (code === "no_active_prizes") return "현재 진행 중인 상품이 없습니다.";
  if (code === "not_authenticated") return "로그인이 필요합니다.";
  if (code === "lucky_gauge_not_ready") return "럭키 찬스 게이지가 아직 다 차지 않았습니다.";
  return "스핀 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
}

const LUCKY_GAUGE_MAX = 100;

export function RouletteWheel({
  prizes,
  initialTicketBalance,
  initialLuckyGauge = 0,
  isAdmin = false,
}: {
  prizes: WheelPrize[];
  initialTicketBalance: number;
  initialLuckyGauge?: number;
  isAdmin?: boolean;
}) {
  const controls = useAnimation();
  const rotationRef = useRef(0);
  const revealedRef = useRef(false);
  const pendingRevealRef = useRef<PendingReveal | null>(null);

  const [spinning, setSpinning] = useState(false);
  const [ticketBalance, setTicketBalance] = useState(initialTicketBalance);
  const [result, setResult] = useState<string | null>(null);
  const [bulkResults, setBulkResults] = useState<BulkResult[] | null>(null);
  const [effectTier, setEffectTier] = useState<EffectTier>("basic");
  const [luckyGauge, setLuckyGauge] = useState(initialLuckyGauge);
  const [wasLuckySpin, setWasLuckySpin] = useState(false);
  const [wheelMode, setWheelMode] = useState<"normal" | "lucky">("normal");
  // Admin-only, client-side controls: testMode decides whether this admin's
  // spins are free/untracked or real (real tickets, real records); luckyPreview
  // lets the admin flip on the Lucky Chance button without grinding the gauge.
  const [testMode, setTestMode] = useState(true);
  const [luckyPreview, setLuckyPreview] = useState(false);

  const unlimited = isAdmin && testMode;
  const luckyReady = (isAdmin && luckyPreview) || luckyGauge >= LUCKY_GAUGE_MAX;

  // Wheel/legend switch to Lucky Chance odds the instant it becomes ready
  // (gauge fills, or the admin flips the preview switch) — no need to press
  // spin first. Skipped while an animation is in flight so the slices don't
  // resize mid-spin; handleSpin/handleSpinLucky also set this explicitly for
  // the spin they're about to run.
  useEffect(() => {
    if (spinning) return;
    startTransition(() => setWheelMode(luckyReady ? "lucky" : "normal"));
  }, [luckyReady, spinning]);

  const tierById = useMemo(() => {
    const map = new Map<string, EffectTier>();
    for (const p of prizes) map.set(p.id, p.tier);
    return map;
  }, [prizes]);

  const weightById = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of prizes) map.set(p.id, p.weight);
    return map;
  }, [prizes]);

  function defaultOrder() {
    return [...prizes].sort((a, b) => b.weight - a.weight);
  }

  // Biggest slices first by default, going clockwise from the top — easier
  // to scan than whatever order the admin added prizes in. The admin can
  // shuffle this arrangement (cosmetic only, odds are unaffected) via the
  // buttons below the wheel.
  const [displayOrder, setDisplayOrder] = useState<WheelPrize[]>(defaultOrder);

  function shuffleOrder() {
    if (spinning) return;
    const arr = [...displayOrder];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setDisplayOrder(arr);
  }

  function resetOrder() {
    if (spinning) return;
    setDisplayOrder(defaultOrder());
  }

  // Legend/wheel prize list for the current mode — Lucky Chance excludes
  // blank prizes entirely (0% during that mode), so they're dropped rather
  // than shown as a fake sliver.
  const visibleOrder = useMemo(() => {
    if (wheelMode !== "lucky") return displayOrder;
    return displayOrder.filter((p) => !p.is_blank);
  }, [displayOrder, wheelMode]);

  const activeWeight = useMemo(() => {
    return (prize: WheelPrize) => (wheelMode === "lucky" ? luckyWeight(prize) : prize.weight);
  }, [wheelMode]);

  const activeTotalWeight = useMemo(
    () => visibleOrder.reduce((sum, p) => sum + activeWeight(p), 0),
    [visibleOrder, activeWeight]
  );

  // Visual slice geometry: weights (real, or Lucky-Chance-boosted while that
  // mode is active) are floored to a minimum visible angle then rescaled to
  // fill 360° — this only affects how the wheel is drawn, never the true
  // odds (server-side, using the exact same boost formula for Lucky Chance).
  const slices = useMemo(() => {
    if (visibleOrder.length === 0 || activeTotalWeight <= 0) return [];

    const rawAngles = visibleOrder.map((p) => (activeWeight(p) / activeTotalWeight) * 360);
    const boostedAngles = rawAngles.map((a) => Math.max(a, MIN_VISUAL_DEGREES));
    const boostedTotal = boostedAngles.reduce((sum, a) => sum + a, 0);
    const scale = 360 / boostedTotal;

    return visibleOrder.reduce<Array<WheelPrize & { startAngle: number; endAngle: number }>>(
      (acc, prize, index) => {
        const startAngle = acc.length > 0 ? acc[acc.length - 1].endAngle : 0;
        const endAngle = startAngle + boostedAngles[index] * scale;
        acc.push({ ...prize, startAngle, endAngle });
        return acc;
      },
      []
    );
  }, [visibleOrder, activeTotalWeight, activeWeight]);

  function revealNow() {
    if (revealedRef.current) return;
    revealedRef.current = true;
    setSpinning(false);

    const pending = pendingRevealRef.current;
    pendingRevealRef.current = null;
    if (!pending) return;

    if (pending.type === "single") {
      setResult(pending.prizeName);
      setBulkResults(null);
      setWasLuckySpin(pending.isLucky);
      toast.success(
        pending.isLucky
          ? `✨ 럭키 찬스! "${pending.prizeName}"에 당첨되었습니다!`
          : `"${pending.prizeName}"에 당첨되었습니다!`
      );
    } else {
      setWasLuckySpin(false);
      setBulkResults(pending.results);
      setResult(null);
      toast.success("10+1연차 결과가 나왔습니다!");
    }
  }

  async function runSpin(targetRotation: number, duration: number) {
    revealedRef.current = false;
    rotationRef.current = targetRotation;
    await controls.start({
      rotate: targetRotation,
      transition: { duration, ease: EASE },
    });
    revealNow();
  }

  function handleSkip() {
    if (!spinning) return;
    controls.set({ rotate: rotationRef.current });
    revealNow();
  }

  function computeLandingRotation(prizeId: string): number {
    const slice = slices.find((s) => s.id === prizeId);
    if (!slice) {
      // Prize no longer in the client's active list (edited mid-spin) — spin cosmetically.
      return rotationRef.current + 6 * 360;
    }
    const span = slice.endAngle - slice.startAngle;
    const within = slice.startAngle + span * (0.15 + Math.random() * 0.7);
    const targetMod = (360 - within) % 360;
    const currentMod = ((rotationRef.current % 360) + 360) % 360;
    const delta = (targetMod - currentMod + 360) % 360;
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    return rotationRef.current + extraSpins * 360 + delta;
  }

  async function handleSpin() {
    if (spinning || (!unlimited && ticketBalance < 1)) return;
    setSpinning(true);
    setResult(null);
    setBulkResults(null);
    setWheelMode("normal");

    const res = await spinAction(isAdmin ? testMode : true);
    if (!res.ok) {
      toast.error(errorMessage(res.code));
      setSpinning(false);
      return;
    }
    setTicketBalance(res.remainingTickets);
    setLuckyGauge(res.luckyGauge);
    setEffectTier(tierById.get(res.prizeId) ?? "basic");

    const targetRotation = computeLandingRotation(res.prizeId);

    pendingRevealRef.current = { type: "single", prizeName: res.prizeName, isLucky: false };
    runSpin(targetRotation, SPIN_DURATION);
  }

  async function handleSpinLucky() {
    if (spinning || !luckyReady || (!unlimited && ticketBalance < 1)) return;
    setSpinning(true);
    setResult(null);
    setBulkResults(null);
    setWheelMode("lucky");

    const res = await spinLuckyAction(isAdmin ? testMode : true);
    if (!res.ok) {
      toast.error(errorMessage(res.code));
      setSpinning(false);
      setWheelMode("normal");
      return;
    }
    setTicketBalance(res.remainingTickets);
    setLuckyGauge(res.luckyGauge);
    setEffectTier(tierById.get(res.prizeId) ?? "basic");

    const targetRotation = computeLandingRotation(res.prizeId);

    pendingRevealRef.current = { type: "single", prizeName: res.prizeName, isLucky: true };
    runSpin(targetRotation, SPIN_DURATION);
  }

  async function handleSpinTen() {
    if (spinning || (!unlimited && ticketBalance < BULK_PAID_DRAWS)) return;
    setSpinning(true);
    setResult(null);
    setBulkResults(null);
    setWheelMode("normal");

    const res = await spinTenAction(isAdmin ? testMode : true);
    if (!res.ok) {
      toast.error(errorMessage(res.code));
      setSpinning(false);
      return;
    }
    setTicketBalance(res.remainingTickets);
    setLuckyGauge(res.luckyGauge);

    // Bulk draws show the effect for the single best (highest-tier) prize
    // won across all 11 results, not any one specific slice.
    const bestTier = res.results.reduce<EffectTier>((best, r) => {
      const t = tierById.get(r.prizeId) ?? "basic";
      return TIER_RANK[t] > TIER_RANK[best] ? t : best;
    }, "basic");
    setEffectTier(bestTier);

    // The wheel lands on whichever of the 11 results is rarest (lowest real
    // probability) — a representative highlight for the whole batch.
    const rarestPrizeId = res.results.reduce((rarestId, r) => {
      const w = weightById.get(r.prizeId) ?? Infinity;
      const rw = weightById.get(rarestId) ?? Infinity;
      return w < rw ? r.prizeId : rarestId;
    }, res.results[0].prizeId);
    const targetRotation = computeLandingRotation(rarestPrizeId);

    pendingRevealRef.current = {
      type: "bulk",
      results: [...res.results]
        .sort((a, b) => a.drawIndex - b.drawIndex)
        .map((r) => ({ prizeName: r.prizeName, drawIndex: r.drawIndex })),
    };
    runSpin(targetRotation, BULK_SPIN_DURATION);
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative mx-auto aspect-square w-full max-w-[320px]">
        {luckyReady && (
          <div className="lucky-aura pointer-events-none absolute -inset-4 rounded-full opacity-80" />
        )}
        <div
          className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderTop: "16px solid var(--primary)",
          }}
        />
        <motion.div
          initial={{ rotate: 0 }}
          animate={controls}
          style={{
            width: "100%",
            height: "100%",
            transformOrigin: "50% 50%",
            filter: "drop-shadow(0 8px 20px rgb(0 0 0 / 0.18))",
          }}
        >
          <svg width="100%" height="100%" viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <defs>
              <radialGradient id="wheel-sheen" cx="50%" cy="42%" r="65%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
                <stop offset="55%" stopColor="#ffffff" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.08" />
              </radialGradient>
            </defs>
            <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="var(--card)" stroke="var(--border)" />
            {slices.map((slice) => (
              <path
                key={slice.id}
                d={describeSlice(slice.startAngle, slice.endAngle)}
                fill={slice.color}
                stroke="var(--card)"
                strokeWidth={2}
              />
            ))}
            {slices.map((slice) => {
              const span = slice.endAngle - slice.startAngle;
              if (span < 16) return null;
              const mid = (slice.startAngle + slice.endAngle) / 2;
              const labelRadius = RADIUS * 0.64;
              const pos = polarToCartesian(mid, labelRadius);
              const normalizedMid = ((mid % 360) + 360) % 360;
              const rotate = normalizedMid > 90 && normalizedMid < 270 ? mid + 90 : mid - 90;
              const maxChars = Math.max(3, Math.floor(span / 5));
              return (
                <text
                  key={`label-${slice.id}`}
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${rotate}, ${pos.x}, ${pos.y})`}
                  fontSize={11.5}
                  fontWeight={700}
                  fill={readableTextColor(slice.color)}
                  stroke="rgba(0,0,0,0.35)"
                  strokeWidth={2.2}
                  style={{ pointerEvents: "none", paintOrder: "stroke fill" }}
                >
                  {truncateLabel(slice.name, maxChars)}
                </text>
              );
            })}
            <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="url(#wheel-sheen)" />
            <circle cx={CENTER} cy={CENTER} r={RADIUS * 0.14} fill="var(--card)" stroke="var(--border)" />
          </svg>
        </motion.div>
        <SpinEffect tier={effectTier} active={spinning} />
      </div>

      {isAdmin && (
        <div className="w-full max-w-xs space-y-2.5 rounded-xl border border-dashed border-border bg-muted/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="admin-test-toggle" className="text-xs text-muted-foreground">
              테스트 모드 (뽑기권 소모 없음, 기록 안 됨)
            </Label>
            <Switch
              id="admin-test-toggle"
              checked={testMode}
              onCheckedChange={setTestMode}
              disabled={spinning}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="admin-lucky-toggle" className="text-xs text-muted-foreground">
              럭키찬스 미리보기 (게이지 무시)
            </Label>
            <Switch
              id="admin-lucky-toggle"
              checked={luckyPreview}
              onCheckedChange={setLuckyPreview}
              disabled={spinning}
            />
          </div>
        </div>
      )}

      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            상품 확률표
            {wheelMode === "lucky" && <span className="lucky-text ml-1.5 font-semibold">(럭키찬스 적용)</span>}
          </p>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={shuffleOrder}
              disabled={spinning}
            >
              순서 섞기
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={resetOrder}
              disabled={spinning}
            >
              원래 순서
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-0.5 sm:grid-cols-2">
          {visibleOrder.map((prize) => (
            <div
              key={prize.id}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: prize.color }}
                />
                <span className="truncate text-foreground">{prize.name}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatProbabilityPercent(activeWeight(prize) / activeTotalWeight)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-xs space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-muted-foreground">슈퍼 럭키 신화찬스 게이지</span>
          <span className={cn("font-semibold tabular-nums", luckyReady && "lucky-text")}>
            {luckyGauge}/{LUCKY_GAUGE_MAX}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-[width] duration-500", luckyReady && "lucky-gauge-fill")}
            style={{
              width: `${Math.min(100, (luckyGauge / LUCKY_GAUGE_MAX) * 100)}%`,
              backgroundColor: luckyReady ? undefined : "var(--foreground)",
            }}
          />
        </div>
      </div>

      {spinning ? (
        <Button size="lg" variant="outline" className="w-full max-w-xs" onClick={handleSkip}>
          건너뛰기
        </Button>
      ) : (
        <div className="flex w-full max-w-xs flex-col gap-3">
          {luckyReady ? (
            <Button
              size="lg"
              className="lucky-button w-full"
              onClick={handleSpinLucky}
              disabled={!unlimited && ticketBalance < 1}
            >
              ✨ 슈퍼 럭키 신화찬스 ✨
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full"
              onClick={handleSpin}
              disabled={!unlimited && ticketBalance < 1}
            >
              {unlimited ? "스핀하기 (테스트, 무제한)" : `스핀하기 (${ticketBalance}장 남음)`}
            </Button>
          )}
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={handleSpinTen}
            disabled={!unlimited && ticketBalance < BULK_PAID_DRAWS}
          >
            10+1연차 뽑기 (10장 소모, 보너스 1회 무료)
          </Button>
        </div>
      )}

      {result && (
        <div
          className="w-full max-w-xs rounded-2xl border bg-card p-6 text-center shadow-sm"
          style={
            wasLuckySpin
              ? { boxShadow: "0 0 32px rgba(255, 45, 146, 0.45)" }
              : effectTier !== "basic"
                ? {
                    borderColor: TIER_GLOW[effectTier],
                    boxShadow: `0 0 28px ${TIER_GLOW[effectTier]}55`,
                  }
                : undefined
          }
        >
          <p className="text-sm text-muted-foreground">
            {wasLuckySpin ? "✨ 슈퍼 럭키 신화찬스 ✨" : "축하합니다!"}
          </p>
          <p
            className={cn(
              "mt-1 font-heading text-xl font-semibold",
              wasLuckySpin ? "lucky-text" : "text-foreground"
            )}
          >
            {result}
          </p>
        </div>
      )}

      {bulkResults && (
        <div
          className="w-full max-w-xl rounded-2xl border bg-card p-6 shadow-sm"
          style={
            effectTier !== "basic"
              ? {
                  borderColor: TIER_GLOW[effectTier],
                  boxShadow: `0 0 28px ${TIER_GLOW[effectTier]}55`,
                }
              : undefined
          }
        >
          <p className="text-center text-sm text-muted-foreground">
            10+1연차 결과 ({BULK_TOTAL_DRAWS}회)
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {bulkResults.map((r) => (
              <div
                key={r.drawIndex}
                className="rounded-lg border border-border bg-background p-2.5 text-center"
              >
                {r.drawIndex > BULK_PAID_DRAWS && (
                  <p className="text-[10px] font-semibold tracking-wide text-muted-foreground">
                    보너스
                  </p>
                )}
                <p className="mt-0.5 text-xs font-medium leading-snug text-foreground">
                  {r.prizeName}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
