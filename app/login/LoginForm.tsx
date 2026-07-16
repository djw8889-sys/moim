"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const authError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  if (status === "sent") {
    return (
      <div className="card mt-8 text-center">
        <p className="text-3xl" aria-hidden>
          📬
        </p>
        <p className="mt-2 font-bold">메일함을 확인해주세요!</p>
        <p className="mt-1 text-sm text-gray-500">
          <b>{email}</b> 으로 로그인 링크를 보냈어요.
          <br />
          메일 속 링크를 누르면 자동으로 로그인돼요.
          <br />
          (스팸함도 확인해보세요)
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={sendMagicLink} className="mt-8 space-y-4">
      {authError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          로그인에 실패했어요. 링크가 만료됐거나 이미 사용된 링크일 수
          있어요. 아래에서 다시 로그인 링크를 받아주세요.
        </p>
      )}
      <input
        type="email"
        required
        placeholder="이메일 주소"
        className="input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        inputMode="email"
      />
      <button
        type="submit"
        className="btn-primary"
        disabled={status === "sending"}
      >
        {status === "sending" ? "보내는 중..." : "로그인 링크 받기"}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-500">
          전송 실패: {errorMsg} — 잠시 후 다시 시도해주세요.
        </p>
      )}
    </form>
  );
}
