"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markWinPaidAction(winId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_win_paid", { p_win_id: winId });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  revalidatePath("/admin/wins");
  return { ok: true as const };
}

export async function markWinsPaidAction(winIds: string[]) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_mark_wins_paid", {
    p_win_ids: winIds,
  });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  revalidatePath("/admin/wins");
  return { ok: true as const, count: data?.length ?? 0 };
}

export async function markAllPendingPaidAction() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_mark_all_pending_paid");

  if (error) {
    return { ok: false as const, message: error.message };
  }

  revalidatePath("/admin/wins");
  return { ok: true as const, count: data ?? 0 };
}

export async function deleteWinsAction(winIds: string[]) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_delete_wins", {
    p_win_ids: winIds,
  });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  revalidatePath("/admin/wins");
  return { ok: true as const, count: data ?? 0 };
}

export async function deletePaidWinsAction() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_delete_paid_wins");

  if (error) {
    return { ok: false as const, message: error.message };
  }

  revalidatePath("/admin/wins");
  return { ok: true as const, count: data ?? 0 };
}

export async function grantTicketsAction(userId: string, amount: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_grant_tickets", {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error || !data) {
    return { ok: false as const, message: error?.message ?? "unknown_error" };
  }

  return { ok: true as const, ticketBalance: data.ticket_balance };
}
