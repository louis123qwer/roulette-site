import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { AppNav } from "@/components/app-nav";
import { DragonCrest } from "@/components/dragon-crest";
import { FighterCrest } from "@/components/fighter-crest";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireUser();
  if (!profile.display_name) redirect("/onboarding");

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <DragonCrest className="pointer-events-none absolute -left-24 -top-16 h-[360px] w-[430px] text-foreground opacity-[0.03]" />
      <DragonCrest className="pointer-events-none absolute -bottom-24 -right-24 h-[360px] w-[430px] rotate-180 text-foreground opacity-[0.03]" />
      <div className="pointer-events-none absolute right-4 top-1/2 hidden w-28 -translate-y-1/2 flex-col items-center gap-2 text-center lg:flex xl:right-10">
        <FighterCrest className="h-24 w-20 text-foreground opacity-[0.07]" />
        <p className="font-heading text-[11px] italic leading-snug text-muted-foreground opacity-60">
          무명의 파이터, 그는 승부사였다...
        </p>
      </div>
      <div className="relative">
        <AppNav
          userId={profile.id}
          ticketBalance={profile.ticket_balance}
          isAdmin={profile.role === "admin"}
          displayName={profile.display_name}
          avatarUrl={profile.avatar_url}
        />
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
