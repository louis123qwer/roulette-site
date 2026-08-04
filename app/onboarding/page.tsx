import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { NicknameForm } from "@/components/nickname-form";

export default async function OnboardingPage() {
  const profile = await requireUser();
  if (profile.display_name) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="font-heading text-2xl font-semibold text-foreground">닉네임 설정</p>
        <p className="mt-2 text-sm text-muted-foreground">
          당첨 시 회원 목록과 지급 처리에 사용될 닉네임을 입력해주세요.
        </p>
        <div className="mt-8">
          <NicknameForm />
        </div>
      </div>
    </div>
  );
}
