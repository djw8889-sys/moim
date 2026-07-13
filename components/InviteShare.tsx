"use client";

import { useState } from "react";

export default function InviteShare({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/meeting/${inviteCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "moim 초대",
          text: "우리 모임에 들어와!",
          url,
        });
        return;
      } catch {
        // 사용자가 공유를 취소한 경우 → 복사로 폴백하지 않고 종료
        return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={share}
      className="shrink-0 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-bold text-brand-600 active:scale-95"
    >
      {copied ? "복사됨 ✓" : "초대하기 🔗"}
    </button>
  );
}
