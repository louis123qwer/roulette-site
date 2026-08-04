"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateNicknameAction, updateAvatarAction } from "@/app/actions/settings";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function SettingsForm({
  initialDisplayName,
  initialAvatarUrl,
}: {
  initialDisplayName: string;
  initialAvatarUrl: string | null;
}) {
  const [name, setName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("닉네임을 입력해주세요.");
      return;
    }

    startTransition(async () => {
      if (trimmedName !== initialDisplayName) {
        const res = await updateNicknameAction(trimmedName);
        if (!res.ok) {
          toast.error("닉네임 저장에 실패했습니다: " + res.message);
          return;
        }
      }

      if (avatarUrl.trim() !== (initialAvatarUrl ?? "")) {
        const res = await updateAvatarAction(avatarUrl);
        if (!res.ok) {
          toast.error("프로필 사진 저장에 실패했습니다: " + res.message);
          return;
        }
      }

      toast.success("설정이 저장되었습니다.");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar size="lg">
          <AvatarImage src={avatarUrl || undefined} alt="" />
          <AvatarFallback>{name.slice(0, 1) || "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="avatar-url">프로필 사진 URL</Label>
          <Input
            id="avatar-url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nickname">닉네임</Label>
        <Input
          id="nickname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
        />
        <p className="text-xs text-muted-foreground">
          당첨 시 지급 처리에 사용되니 정확한 인게임 닉네임으로 입력해주세요.
        </p>
      </div>

      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "저장 중..." : "저장"}
      </Button>
    </div>
  );
}
