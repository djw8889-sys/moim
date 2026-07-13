"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // 서비스워커 등록 실패는 앱 동작에 영향 없음
      });
    }
  }, []);
  return null;
}
