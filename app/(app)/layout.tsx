import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { AppNav } from "@/components/app-nav";
import { DragonCrest } from "@/components/dragon-crest";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireUser();
  if (!profile.display_name) redirect("/onboarding");

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <DragonCrest className="pointer-events-none absolute -left-24 -top-16 h-[360px] w-[430px] text-foreground opacity-[0.03]" />
      <DragonCrest className="pointer-events-none absolute -bottom-24 -right-24 h-[360px] w-[430px] rotate-180 text-foreground opacity-[0.03]" />
      <div className="relative">
        <AppNav
          userId={profile.id}
          ticketBalance={profile.ticket_balance}
          isAdmin={profile.role === "admin"}
        />
        <main className="mx-auto max-w-4xl px-6 py-10">{children}</main>
      </div>
    </div>
  );
}
