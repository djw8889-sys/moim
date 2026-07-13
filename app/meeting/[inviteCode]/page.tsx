import { redirect } from "next/navigation";

// 모임 홈 진입 시 기본 탭은 "일정 투표" (핵심 기능)
export default function MeetingHome({
  params,
}: {
  params: { inviteCode: string };
}) {
  redirect(`/meeting/${params.inviteCode}/schedule`);
}
