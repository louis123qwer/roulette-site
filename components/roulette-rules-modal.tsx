"use client";

import { startTransition, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DragonCrest } from "@/components/dragon-crest";

const STORAGE_KEY = "roulette-rules-dismissed-until";

export function RouletteRulesModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissedUntil = window.localStorage.getItem(STORAGE_KEY);
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) return;
    startTransition(() => setOpen(true));
  }, []);

  function handleHide24h() {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[85vh] max-w-lg overflow-y-auto border-2 p-0"
        style={{ backgroundColor: "#f6efdd", borderColor: "#c9b98a" }}
      >
        <div className="px-6 py-8 sm:px-8">
          <DialogHeader className="items-center text-center">
            <DragonCrest className="h-10 w-12 text-[#3a2f1d]" />
            <DialogTitle
              className="mt-3 font-heading text-xl font-semibold"
              style={{ color: "#2c2313" }}
            >
              용신의 규칙서
            </DialogTitle>
          </DialogHeader>

          <div className="mt-6 space-y-5 text-sm leading-relaxed" style={{ color: "#3a2f1d" }}>
            <p>
              이 룰렛은 실제 확률에 비례해 조각 크기가 정해지며, 결과는 오직 서버에서만
              계산됩니다. 누구도 결과를 조작할 수 없습니다.
            </p>

            <hr style={{ borderColor: "#c9b98a" }} />

            <div>
              <p className="font-semibold" style={{ color: "#2c2313" }}>
                뽑기권 구매 안내
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>마지막 이야기 거래소에 &apos;용신&apos;의 이름으로 올라온 마법의 가루를 구매해주세요.</li>
                <li>구매 후 갠톡으로 말씀 주시면 뽑기권을 지급해 드립니다.</li>
                <li>뽑기권은 1회당 1억이며, 거래소 수수료는 별도입니다.</li>
                <li>마법의 가루 1개 = 뽑기권 1회로 교환됩니다.</li>
              </ul>
            </div>

            <hr style={{ borderColor: "#c9b98a" }} />

            <div>
              <p className="font-semibold" style={{ color: "#2c2313" }}>
                보상 수령 안내
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>
                  보상 지급 문의는 1:1 채팅 또는 마지막 이야기 공식 카톡방에서 @용신 을
                  태그해주세요.
                </li>
                <li>
                  지급은 수동으로 처리되어 다소 시간이 걸릴 수 있습니다. 취침 중이거나 바쁠
                  경우 지연될 수 있는 점 양해 부탁드립니다.
                </li>
                <li>
                  <strong>당첨 후 3일 이내</strong>에 카톡으로 연락 주시지 않으면 자동으로
                  수령 처리되어 이후에는 수령이 불가능합니다. 꼭 기한 내에 연락해주세요.
                </li>
                <li>상품을 직접 받지 않고, 뽑기권으로 해당 금액만큼 교환하는 것도 가능합니다.</li>
              </ul>
            </div>

            <hr style={{ borderColor: "#c9b98a" }} />

            <p className="text-center italic" style={{ color: "#5a4a2d" }}>
              용신의 무덤 속 룰렛에서, 그대의 보물을 찾으시길...
            </p>
          </div>

          <div className="mt-8 flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              style={{ borderColor: "#c9b98a", color: "#3a2f1d" }}
              onClick={handleHide24h}
            >
              24시간 보지 않기
            </Button>
            <Button
              className="flex-1"
              style={{ backgroundColor: "#2c2313", color: "#f6efdd" }}
              onClick={() => setOpen(false)}
            >
              닫기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
