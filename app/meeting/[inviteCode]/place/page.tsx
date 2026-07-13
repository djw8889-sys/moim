import { getMeetingContext } from "@/lib/meeting";
import PlaceTab from "@/components/PlaceTab";
import { KAKAO_MAP_KEY } from "@/lib/supabase/config";
import type { Origin } from "@/lib/types";

export default async function PlacePage({
  params,
}: {
  params: { inviteCode: string };
}) {
  const { inviteCode } = params;
  const { supabase, meeting, members, myMember } =
    await getMeetingContext(inviteCode);

  const { data: origins } = await supabase
    .from("origins")
    .select("*")
    .eq("meeting_id", meeting.id);

  return (
    <PlaceTab
      meetingId={meeting.id}
      inviteCode={inviteCode}
      myMemberId={myMember.id}
      members={members.map((m) => ({ id: m.id, nickname: m.nickname }))}
      origins={(origins ?? []) as Origin[]}
      kakaoKey={KAKAO_MAP_KEY}
    />
  );
}
