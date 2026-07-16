import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

// 매직링크 클릭 시 도착하는 엔드포인트.
// PKCE(code) 방식과 token_hash 방식 둘 다 처리한다.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/";
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    console.error("auth/callback: exchangeCodeForSession 실패", error.message);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    console.error("auth/callback: verifyOtp 실패", error.message);
  }

  if (!code && !tokenHash) {
    console.error(
      "auth/callback: code/token_hash 파라미터 없음 — Supabase Redirect URLs 설정을 확인하세요",
      request.url
    );
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
