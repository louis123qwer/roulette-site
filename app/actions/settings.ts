"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateNicknameAction(displayName: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_display_name", {
    p_display_name: displayName,
  });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function updateAvatarAction(avatarUrl: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_avatar_url", {
    p_avatar_url: avatarUrl,
  });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true as const };
}
