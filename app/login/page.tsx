import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/dal";
import { GoogleLoginButton } from "@/components/google-login-button";
import { DragonCrest } from "@/components/dragon-crest";

export default async function LoginPage() {
  const profile = await getProfile();
  if (profile) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <DragonCrest className="pointer-events-none absolute -left-28 -top-20 h-[420px] w-[500px] text-foreground opacity-[0.035] sm:h-[560px] sm:w-[670px]" />
      <DragonCrest className="pointer-events-none absolute -bottom-28 -right-28 h-[420px] w-[500px] rotate-180 text-foreground opacity-[0.035] sm:h-[560px] sm:w-[670px]" />

      <div className="relative w-full max-w-sm">
        <span className="absolute -left-3 -top-3 h-6 w-6 border-l-2 border-t-2 border-foreground" />
        <span className="absolute -right-3 -top-3 h-6 w-6 border-r-2 border-t-2 border-foreground" />
        <span className="absolute -bottom-3 -left-3 h-6 w-6 border-b-2 border-l-2 border-foreground" />
        <span className="absolute -bottom-3 -right-3 h-6 w-6 border-b-2 border-r-2 border-foreground" />

        <div className="rounded-2xl border border-border bg-card px-8 py-10 text-center shadow-sm">
          <DragonCrest className="mx-auto h-10 w-12 text-foreground" />
          <p className="mt-4 font-heading text-3xl font-semibold tracking-tight text-foreground">
            용신 카지노
          </p>
          <div className="mx-auto mt-3 flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-border" />
            <span className="h-1.5 w-1.5 rotate-45 bg-foreground" />
            <span className="h-px w-8 bg-border" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Google 계정으로 로그인하고 뽑기권을 확인하세요.
          </p>
          <div className="mt-8">
            <GoogleLoginButton />
          </div>
        </div>
      </div>
    </div>
  );
}
