// Shows enough decimal places that tiny jackpot probabilities (e.g. 0.0007%)
// never silently round down to "0.0%" — normal-sized values stay at 2 decimals.
export function formatProbabilityPercent(fraction: number): string {
  const pct = fraction * 100;
  if (!Number.isFinite(pct) || pct <= 0) return "0%";

  let decimals = 2;
  while (decimals < 10 && Number(pct.toFixed(decimals)) === 0) {
    decimals += 1;
  }
  return `${pct.toFixed(decimals)}%`;
}

// Korean-style abbreviated amount: 1억 2345만 6789골드 instead of a long
// digit string — keeps large prize/ticket prices readable at a glance.
export function formatGold(value: number): string {
  if (!Number.isFinite(value)) return "0골드";

  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(Math.round(value));
  if (abs === 0) return "0골드";

  const eok = Math.floor(abs / 100_000_000);
  const man = Math.floor((abs % 100_000_000) / 10_000);
  const rest = abs % 10_000;

  const parts: string[] = [];
  if (eok > 0) parts.push(`${eok.toLocaleString("ko-KR")}억`);
  if (man > 0) parts.push(`${man.toLocaleString("ko-KR")}만`);
  if (rest > 0 || parts.length === 0) parts.push(`${rest.toLocaleString("ko-KR")}`);

  return `${sign}${parts.join(" ")}골드`;
}
