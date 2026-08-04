import { requireAdmin } from "@/lib/auth/dal";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const profile = await requireAdmin();

  return (
    <div className="min-h-screen bg-background">
      <AdminNav email={profile.email} />
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
