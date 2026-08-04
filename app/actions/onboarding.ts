"use server";

import { createClient } from "@/lib/supabase/server";

export async function setDisplayNameAction(displayName: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_display_name", {
    p_display_name: displayName,
  });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  return { ok: true as const };
}
