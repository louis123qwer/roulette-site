import Link from "next/link";
import { NavLink } from "@/components/nav-link";
import { LogoutButton } from "@/components/logout-button";
import { TicketBalance } from "@/components/ticket-balance";
import { Separator } from "@/components/ui/separator";
import { DragonCrest } from "@/components/dragon-crest";
import { MobileNav } from "@/components/mobile-nav";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export function AppNav({
  userId,
  ticketBalance,
  isAdmin,
  displayName,
  avatarUrl,
}: {
  userId: string;
  ticketBalance: number;
  isAdmin: boolean;
  displayName: string | null;
  avatarUrl: string | null;
}) {
  const links = [
    { href: "/dashboard", label: "대시보드" },
    { href: "/roulette", label: "룰렛" },
    { href: "/history", label: "당첨 내역" },
    ...(isAdmin ? [{ href: "/admin", label: "관리자" }] : []),
  ];

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-8">
          <MobileNav title="용신 카지노" links={links} />
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-heading text-base font-semibold text-foreground sm:text-lg"
          >
            <DragonCrest className="h-5 w-6 text-foreground sm:h-6 sm:w-7" />
            용신 카지노
          </Link>
          <nav className="hidden items-center gap-6 sm:flex">
            {links.map((link) => (
              <NavLink key={link.href} href={link.href}>
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 sm:gap-2 sm:px-3 sm:py-1.5">
            <span className="hidden text-xs text-muted-foreground sm:inline">뽑기권</span>
            <TicketBalance userId={userId} initialBalance={ticketBalance} />
          </div>
          <Separator orientation="vertical" className="hidden h-6 sm:block" />
          <Link href="/settings" aria-label="프로필 설정">
            <Avatar size="sm">
              <AvatarImage src={avatarUrl ?? undefined} alt="" />
              <AvatarFallback>{(displayName ?? "?").slice(0, 1)}</AvatarFallback>
            </Avatar>
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
