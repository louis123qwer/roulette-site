"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deleteMyPaidWinsAction() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_my_paid_wins");

  if (error) {
    return { ok: false as const, message: error.message };
  }

  revalidatePath("/history");
  return { ok: true as const, count: data ?? 0 };
}
