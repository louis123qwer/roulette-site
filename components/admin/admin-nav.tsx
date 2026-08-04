import Link from "next/link";
import { NavLink } from "@/components/nav-link";
import { LogoutButton } from "@/components/logout-button";
import { DragonCrest } from "@/components/dragon-crest";
import { MobileNav } from "@/components/mobile-nav";

const ADMIN_LINKS = [
  { href: "/admin", label: "개요" },
  { href: "/admin/members", label: "회원 목록" },
  { href: "/admin/wins", label: "당첨 내역" },
  { href: "/admin/prizes", label: "확률 설정" },
  { href: "/admin/ledger", label: "장부" },
];

export function AdminNav({ email }: { email: string }) {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-8">
          <MobileNav title="용신 카지노 관리자" links={ADMIN_LINKS} />
          <Link
            href="/admin"
            className="flex items-center gap-2 font-heading text-base font-semibold text-foreground sm:text-lg"
          >
            <DragonCrest className="h-5 w-6 text-foreground sm:h-6 sm:w-7" />
            <span className="hidden sm:inline">용신 카지노</span>
            <span className="text-sm font-normal text-muted-foreground">관리자</span>
          </Link>
          <nav className="hidden items-center gap-6 sm:flex">
            {ADMIN_LINKS.map((link) => (
              <NavLink key={link.href} href={link.href}>
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>
          <Link
            href="/dashboard"
            className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
          >
            일반 화면
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
