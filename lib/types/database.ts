export type Role = "user" | "admin";
export type WinStatus = "pending" | "paid";
export type TicketReason = "signup_grant" | "spin_consume" | "admin_adjust" | "refund";

// Fallback shape for the index signature required below — supabase-js's
// SupabaseClient resolves its Schema type parameter via `Tables extends
// Record<string, GenericTable> ? ... : never`, and a Database type with only
// fixed (named) keys does not structurally satisfy that Record constraint.
// Adding `[key: string]: ...Fallback` alongside the real tables keeps our
// named tables strongly typed while satisfying the constraint check.
interface TableFallback {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: never[];
}

interface ViewFallback {
  Row: Record<string, unknown>;
  Relationships: never[];
}

interface FunctionFallback {
  Args: Record<string, unknown> | never;
  Returns: unknown;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          role: Role;
          ticket_balance: number;
          created_at: string;
        };
        // No client-side insert/update — rows are created by the signup
        // trigger and mutated only through SECURITY DEFINER RPCs.
        Insert: never;
        Update: never;
        Relationships: [];
      };
      prizes: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          weight: number;
          color: string;
          market_price: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          weight: number;
          color?: string;
          market_price?: number;
          is_active?: boolean;
          sort_order?: number;
        };
        Update: {
          name?: string;
          description?: string | null;
          weight?: number;
          color?: string;
          market_price?: number;
          is_active?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      wins: {
        Row: {
          id: string;
          user_id: string;
          prize_id: string | null;
          prize_name_snapshot: string;
          prize_weight_snapshot: number;
          prize_market_price_snapshot: number;
          roll: number;
          status: WinStatus;
          created_at: string;
          fulfilled_at: string | null;
          fulfilled_by: string | null;
        };
        // No client-side insert/update — rows are created/mutated only
        // through the spin_roulette / mark_win_paid RPCs.
        Insert: never;
        Update: never;
        Relationships: [];
      };
      ticket_transactions: {
        Row: {
          id: string;
          user_id: string;
          delta: number;
          reason: TicketReason;
          related_win_id: string | null;
          created_by: string | null;
          unit_price_snapshot: number | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      settings: {
        Row: {
          id: number;
          ticket_price: number;
          updated_at: string;
        };
        Insert: never;
        Update: { ticket_price?: number };
        Relationships: [];
      };
      daily_ledger: {
        Row: {
          day: string;
          revenue: number;
          payout: number;
          net_profit: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      [key: string]: TableFallback;
    };
    Views: {
      [key: string]: ViewFallback;
    };
    Functions: {
      spin_roulette: {
        Args: Record<string, never>;
        Returns: {
          win_id: string;
          prize_id: string;
          prize_name: string;
          remaining_tickets: number;
        }[];
      };
      spin_roulette_bulk: {
        Args: Record<string, never>;
        Returns: {
          win_id: string;
          prize_id: string;
          prize_name: string;
          draw_index: number;
          remaining_tickets: number;
        }[];
      };
      mark_win_paid: {
        Args: { p_win_id: string };
        Returns: Database["public"]["Tables"]["wins"]["Row"];
      };
      set_display_name: {
        Args: { p_display_name: string };
        Returns: Database["public"]["Tables"]["profiles"]["Row"];
      };
      admin_grant_tickets: {
        Args: { p_user_id: string; p_amount: number };
        Returns: Database["public"]["Tables"]["profiles"]["Row"];
      };
      [key: string]: FunctionFallback;
    };
  };
}
