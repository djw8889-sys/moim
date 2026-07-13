import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { joinMeeting } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";

export default async function JoinPage({
  params,
}: {
  params: { inviteCode: string };
}) {
  const { inviteCode } = params;
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/meeting/${inviteCode}`)}`);
  }

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, title")
    .eq("invite_code", inviteCode)
    .maybeSingle();
  if (!meeting) notFound();

  // 이미 멤버면 모임으로
  const { data: myMember } = await supabase
    .from("members")
    .select("id")
    .eq("meeting_id", meeting.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (myMember) redirect(`/meeting/${inviteCode}`);

  const { data: lastMember } = await supabase
    .from("members")
    .select("nickname")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="px-6 py-12">
      <h1 className="text-2xl font-extrabold">
        &ldquo;{meeting.title}&rdquo; 모임에 초대됐어요 🎉
      </h1>
      <p className="mt-2 text-gray-600">닉네임을 정하면 바로 참여할 수 있어요.</p>
      <form action={joinMeeting} className="mt-8 space-y-4">
        <input type="hidden" name="inviteCode" value={inviteCode} />
        <input
          name="nickname"
          required
          maxLength={20}
          placeholder="닉네임 (모임에서 표시될 이름)"
          className="input"
          defaultValue={lastMember?.nickname ?? ""}
        />
        <SubmitButton label="모임 참여하기" pendingLabel="참여하는 중..." />
      </form>
    </main>
  );
}
