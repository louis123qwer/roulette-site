import Link from "next/link";
import { NavLink } from "@/components/nav-link";
import { LogoutButton } from "@/components/logout-button";
import { DragonCrest } from "@/components/dragon-crest";

export function AdminNav({ email }: { email: string }) {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link
            href="/admin"
            className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground"
          >
            <DragonCrest className="h-6 w-7 text-foreground" />
            용신 카지노 <span className="text-sm font-normal text-muted-foreground">관리자</span>
          </Link>
          <nav className="hidden items-center gap-6 sm:flex">
            <NavLink href="/admin">개요</NavLink>
            <NavLink href="/admin/members">회원 목록</NavLink>
            <NavLink href="/admin/wins">당첨 내역</NavLink>
            <NavLink href="/admin/prizes">확률 설정</NavLink>
            <NavLink href="/admin/ledger">장부</NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">{email}</span>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            일반 화면
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
