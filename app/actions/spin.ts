"use server";

import { createClient } from "@/lib/supabase/server";

export type SpinResult =
  | {
      ok: true;
      winId: string;
      prizeId: string;
      prizeName: string;
      remainingTickets: number;
      luckyGauge: number;
    }
  | { ok: false; code: string };

export async function spinAction(): Promise<SpinResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("spin_roulette").single();

  if (error || !data) {
    console.error("[spinAction] rpc error", {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    });
    return { ok: false, code: error?.message ?? "unknown_error" };
  }

  return {
    ok: true,
    winId: data.win_id,
    prizeId: data.prize_id,
    prizeName: data.prize_name,
    remainingTickets: data.remaining_tickets,
    luckyGauge: data.lucky_gauge,
  };
}

export async function spinLuckyAction(): Promise<SpinResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("spin_roulette_lucky").single();

  if (error || !data) {
    console.error("[spinLuckyAction] rpc error", {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    });
    return { ok: false, code: error?.message ?? "unknown_error" };
  }

  return {
    ok: true,
    winId: data.win_id,
    prizeId: data.prize_id,
    prizeName: data.prize_name,
    remainingTickets: data.remaining_tickets,
    luckyGauge: data.lucky_gauge,
  };
}

export type BulkSpinResult =
  | {
      ok: true;
      results: { winId: string; prizeId: string; prizeName: string; drawIndex: number }[];
      remainingTickets: number;
      luckyGauge: number;
    }
  | { ok: false; code: string };

export async function spinTenAction(): Promise<BulkSpinResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("spin_roulette_bulk");

  if (error || !data || data.length === 0) {
    console.error("[spinTenAction] rpc error", {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    });
    return { ok: false, code: error?.message ?? "unknown_error" };
  }

  return {
    ok: true,
    results: data.map((row) => ({
      winId: row.win_id,
      prizeId: row.prize_id,
      prizeName: row.prize_name,
      drawIndex: row.draw_index,
    })),
    remainingTickets: data[0].remaining_tickets,
    luckyGauge: data[data.length - 1].lucky_gauge,
  };
}
