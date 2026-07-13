import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Meeting, Member } from "@/lib/types";

// 모임 탭 페이지 공통 로딩: 로그인/멤버십 확인 후 모임·멤버 목록 반환
export async function getMeetingContext(inviteCode: string): Promise<{
  supabase: ReturnType<typeof createClient>;
  meeting: Meeting;
  members: Member[];
  myMember: Member;
}> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/meeting/${inviteCode}`)}`);
  }

  const { data: meeting } = await supabase
    .from("meetings")
    .select("*")
    .eq("invite_code", inviteCode)
    .maybeSingle();
  if (!meeting) notFound();

  const { data: members } = await supabase
    .from("members")
    .select("*")
    .eq("meeting_id", meeting.id)
    .order("created_at", { ascending: true });

  const myMember = (members ?? []).find((m) => m.user_id === user.id);
  if (!myMember) {
    redirect(`/join/${inviteCode}`);
  }

  return { supabase, meeting, members: members ?? [], myMember };
}
