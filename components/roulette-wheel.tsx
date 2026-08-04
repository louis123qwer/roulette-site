"use client";

import { useMemo, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { toast } from "sonner";
import { spinAction, spinTenAction } from "@/app/actions/spin";
import { Button } from "@/components/ui/button";
import { formatProbabilityPercent } from "@/lib/format";
import { SpinEffect, TIER_RANK, TIER_GLOW, type EffectTier } from "@/components/spin-effect";

type WheelPrize = {
  id: string;
  name: string;
  weight: number;
  color: string;
  tier: EffectTier;
};

type BulkResult = { prizeName: string; drawIndex: number };

type PendingReveal =
  | { type: "single"; prizeName: string }
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
  return "스핀 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
}

export function RouletteWheel({
  prizes,
  initialTicketBalance,
}: {
  prizes: WheelPrize[];
  initialTicketBalance: number;
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

  const totalWeight = useMemo(() => prizes.reduce((sum, p) => sum + p.weight, 0), [prizes]);

  // Biggest slices first, going clockwise from the top — easier to scan than
  // whatever order the admin added prizes in.
  const sortedPrizes = useMemo(
    () => [...prizes].sort((a, b) => b.weight - a.weight),
    [prizes]
  );

  // Visual slice geometry: real weights are floored to a minimum visible
  // angle then rescaled to fill 360° — this only affects how the wheel is
  // drawn, never the true odds (which come from prize.weight / totalWeight,
  // used unmodified for the legend labels and server-side probability).
  const slices = useMemo(() => {
    if (sortedPrizes.length === 0 || totalWeight <= 0) return [];

    const rawAngles = sortedPrizes.map((p) => (p.weight / totalWeight) * 360);
    const boostedAngles = rawAngles.map((a) => Math.max(a, MIN_VISUAL_DEGREES));
    const boostedTotal = boostedAngles.reduce((sum, a) => sum + a, 0);
    const scale = 360 / boostedTotal;

    return sortedPrizes.reduce<Array<WheelPrize & { startAngle: number; endAngle: number }>>(
      (acc, prize, index) => {
        const startAngle = acc.length > 0 ? acc[acc.length - 1].endAngle : 0;
        const endAngle = startAngle + boostedAngles[index] * scale;
        acc.push({ ...prize, startAngle, endAngle });
        return acc;
      },
      []
    );
  }, [sortedPrizes, totalWeight]);

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
      toast.success(`"${pending.prizeName}"에 당첨되었습니다!`);
    } else {
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
    if (spinning || ticketBalance < 1) return;
    setSpinning(true);
    setResult(null);
    setBulkResults(null);

    const res = await spinAction();
    if (!res.ok) {
      toast.error(errorMessage(res.code));
      setSpinning(false);
      return;
    }
    setTicketBalance(res.remainingTickets);
    setEffectTier(tierById.get(res.prizeId) ?? "basic");

    const targetRotation = computeLandingRotation(res.prizeId);

    pendingRevealRef.current = { type: "single", prizeName: res.prizeName };
    runSpin(targetRotation, SPIN_DURATION);
  }

  async function handleSpinTen() {
    if (spinning || ticketBalance < BULK_PAID_DRAWS) return;
    setSpinning(true);
    setResult(null);
    setBulkResults(null);

    const res = await spinTenAction();
    if (!res.ok) {
      toast.error(errorMessage(res.code));
      setSpinning(false);
      return;
    }
    setTicketBalance(res.remainingTickets);

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
    console.log("[bulk] results", res.results);
    console.log("[bulk] weightById keys", Array.from(weightById.keys()));
    console.log("[bulk] rarestPrizeId", rarestPrizeId);
    console.log(
      "[bulk] matching slice",
      slices.find((s) => s.id === rarestPrizeId)
    );
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

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {sortedPrizes.map((prize) => (
          <span key={prize.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: prize.color }}
            />
            {prize.name} · {formatProbabilityPercent(prize.weight / totalWeight)}
          </span>
        ))}
      </div>

      {spinning ? (
        <Button size="lg" variant="outline" className="w-full max-w-xs" onClick={handleSkip}>
          건너뛰기
        </Button>
      ) : (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <Button size="lg" className="w-full" onClick={handleSpin} disabled={ticketBalance < 1}>
            스핀하기 ({ticketBalance}장 남음)
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={handleSpinTen}
            disabled={ticketBalance < BULK_PAID_DRAWS}
          >
            10+1연차 뽑기 (10장 소모, 보너스 1회 무료)
          </Button>
        </div>
      )}

      {result && (
        <div
          className="w-full max-w-xs rounded-2xl border bg-card p-6 text-center shadow-sm"
          style={
            effectTier !== "basic"
              ? {
                  borderColor: TIER_GLOW[effectTier],
                  boxShadow: `0 0 28px ${TIER_GLOW[effectTier]}55`,
                }
              : undefined
          }
        >
          <p className="text-sm text-muted-foreground">축하합니다!</p>
          <p className="mt-1 font-heading text-xl font-semibold text-foreground">{result}</p>
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
