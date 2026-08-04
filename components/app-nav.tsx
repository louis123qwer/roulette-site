import Link from "next/link";
import { NavLink } from "@/components/nav-link";
import { LogoutButton } from "@/components/logout-button";
import { TicketBalance } from "@/components/ticket-balance";
import { Separator } from "@/components/ui/separator";
import { DragonCrest } from "@/components/dragon-crest";

export function AppNav({
  userId,
  ticketBalance,
  isAdmin,
}: {
  userId: string;
  ticketBalance: number;
  isAdmin: boolean;
}) {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground"
          >
            <DragonCrest className="h-6 w-7 text-foreground" />
            용신 카지노
          </Link>
          <nav className="hidden items-center gap-6 sm:flex">
            <NavLink href="/dashboard">대시보드</NavLink>
            <NavLink href="/roulette">룰렛</NavLink>
            <NavLink href="/history">당첨 내역</NavLink>
            {isAdmin && <NavLink href="/admin">관리자</NavLink>}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
            <span className="text-xs text-muted-foreground">뽑기권</span>
            <TicketBalance userId={userId} initialBalance={ticketBalance} />
          </div>
          <Separator orientation="vertical" className="h-6" />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
