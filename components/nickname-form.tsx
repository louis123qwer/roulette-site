"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setDisplayNameAction } from "@/app/actions/onboarding";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function NicknameForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("닉네임을 입력해주세요.");
      return;
    }

    startTransition(async () => {
      const res = await setDisplayNameAction(trimmed);
      if (!res.ok) {
        toast.error("닉네임 저장에 실패했습니다: " + res.message);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div className="space-y-1.5">
        <Label htmlFor="nickname">닉네임</Label>
        <Input
          id="nickname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="인게임 닉네임을 입력하세요"
          autoFocus
        />
      </div>
      <p className="rounded-lg border border-foreground/15 bg-status-pending px-3 py-2 text-xs leading-relaxed text-status-pending-foreground">
        ⚠️ 꼭 인게임 닉네임으로 입력해 주세요. 다르게 입력할 경우 상품 지급에 어려움이 생길 수
        있습니다.
      </p>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "저장 중..." : "시작하기"}
      </Button>
    </form>
  );
}
