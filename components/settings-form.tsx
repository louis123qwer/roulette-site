"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateNicknameAction, updateAvatarAction } from "@/app/actions/settings";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function SettingsForm({
  userId,
  initialDisplayName,
  initialAvatarUrl,
}: {
  userId: string;
  initialDisplayName: string;
  initialAvatarUrl: string | null;
}) {
  const [name, setName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("5MB 이하의 이미지만 업로드할 수 있습니다.");
      return;
    }

    setIsUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("업로드에 실패했습니다: " + uploadError.message);
      setIsUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const newUrl = publicUrlData.publicUrl;

    const res = await updateAvatarAction(newUrl);
    setIsUploading(false);

    if (!res.ok) {
      toast.error("프로필 사진 저장에 실패했습니다: " + res.message);
      return;
    }

    setAvatarUrl(newUrl);
    toast.success("프로필 사진이 변경되었습니다.");
  }

  function handleSaveName() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("닉네임을 입력해주세요.");
      return;
    }
    if (trimmedName === initialDisplayName) {
      toast.message("변경된 내용이 없습니다.");
      return;
    }
    startTransition(async () => {
      const res = await updateNicknameAction(trimmedName);
      if (!res.ok) {
        toast.error("닉네임 저장에 실패했습니다: " + res.message);
        return;
      }
      toast.success("닉네임이 저장되었습니다.");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar size="lg">
          <AvatarImage src={avatarUrl || undefined} alt="" />
          <AvatarFallback>{name.slice(0, 1) || "?"}</AvatarFallback>
        </Avatar>
        <div className="space-y-1.5">
          <Label>프로필 사진</Label>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? "업로드 중..." : "파일에서 불러오기"}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nickname">닉네임</Label>
        <Input id="nickname" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} />
        <p className="text-xs text-muted-foreground">
          당첨 시 지급 처리에 사용되니 정확한 인게임 닉네임으로 입력해주세요.
        </p>
      </div>

      <Button onClick={handleSaveName} disabled={isPending}>
        {isPending ? "저장 중..." : "닉네임 저장"}
      </Button>
    </div>
  );
}
