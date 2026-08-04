import { requireUser } from "@/lib/auth/dal";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const profile = await requireUser();

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <p className="font-heading text-2xl font-semibold text-foreground">프로필 설정</p>
      <SettingsForm
        userId={profile.id}
        initialDisplayName={profile.display_name ?? ""}
        initialAvatarUrl={profile.avatar_url}
      />
    </div>
  );
}
