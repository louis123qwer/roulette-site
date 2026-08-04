"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function TicketBalance({
  userId,
  initialBalance,
}: {
  userId: string;
  initialBalance: number;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [syncedInitialBalance, setSyncedInitialBalance] = useState(initialBalance);

  // Adjust state during render when the server-provided prop changes, instead
  // of an effect — avoids an extra cascading render on every navigation.
  if (initialBalance !== syncedInitialBalance) {
    setSyncedInitialBalance(initialBalance);
    setBalance(initialBalance);
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`profile-ticket-balance-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const next = (payload.new as { ticket_balance: number }).ticket_balance;
          setBalance(next);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-heading text-2xl font-semibold tabular-nums text-foreground">
        {balance}
      </span>
      <span className="text-sm text-muted-foreground">개</span>
    </div>
  );
}
