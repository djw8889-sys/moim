import { getMeetingContext } from "@/lib/meeting";
import { addCandidate, deleteCandidate, toggleVote } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";
import type { PlanCandidate, Vote } from "@/lib/types";

export default async function SchedulePage({
  params,
}: {
  params: { inviteCode: string };
}) {
  const { inviteCode } = params;
  const { supabase, meeting, members, myMember } =
    await getMeetingContext(inviteCode);

  const [{ data: candidates }, { data: votes }] = await Promise.all([
    supabase
      .from("plan_candidates")
      .select("*")
      .eq("meeting_id", meeting.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("votes")
      .select("*, plan_candidates!inner(meeting_id)")
      .eq("plan_candidates.meeting_id", meeting.id),
  ]);

  const voteList = (votes ?? []) as unknown as Vote[];
  const nicknameOf = new Map(members.map((m) => [m.id, m.nickname]));

  const ranked = ((candidates ?? []) as PlanCandidate[])
    .map((c) => {
      const cVotes = voteList.filter((v) => v.candidate_id === c.id);
      return {
        ...c,
        voteCount: cVotes.length,
        iVoted: cVotes.some((v) => v.member_id === myMember.id),
        voterNames: cVotes
          .map((v) => nicknameOf.get(v.member_id) ?? "?")
          .join(", "),
      };
    })
    .sort((a, b) => b.voteCount - a.voteCount);

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="font-bold">하고 싶은 것 제안하기</h2>
        <form action={addCandidate} className="mt-3 space-y-2">
          <input type="hidden" name="meetingId" value={meeting.id} />
          <input type="hidden" name="inviteCode" value={inviteCode} />
          <input
            name="title"
            required
            maxLength={60}
            placeholder="예: 성산일출봉 등반"
            className="input"
          />
          <input
            name="memo"
            maxLength={200}
            placeholder="메모 (선택)"
            className="input"
          />
          <SubmitButton label="후보 올리기" pendingLabel="올리는 중..." />
        </form>
      </section>

      <section>
        <h2 className="mb-2 px-1 font-bold">
          투표 결과 <span className="text-gray-400">— 득표순 자동 정렬</span>
        </h2>
        {ranked.length === 0 ? (
          <p className="card text-center text-sm text-gray-500">
            아직 후보가 없어요. 첫 번째 후보를 올려보세요!
          </p>
        ) : (
          <ol className="space-y-3">
            {ranked.map((c, i) => (
              <li key={c.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">
                      <span className="mr-1.5 text-brand-600">{i + 1}위</span>
                      {c.title}
                    </p>
                    {c.memo && (
                      <p className="mt-0.5 text-sm text-gray-500">{c.memo}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      제안: {nicknameOf.get(c.member_id) ?? "?"}
                      {c.voteCount > 0 && <> · 투표: {c.voterNames}</>}
                    </p>
                  </div>
                  <form
                    action={toggleVote.bind(
                      null,
                      meeting.id,
                      inviteCode,
                      c.id
                    )}
                  >
                    <SubmitButton
                      label={`${c.iVoted ? "✅" : "🤍"} ${c.voteCount}표`}
                      className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold active:scale-95 ${
                        c.iVoted
                          ? "bg-brand-500 text-white"
                          : "border border-gray-300 bg-white text-gray-600"
                      }`}
                    />
                  </form>
                </div>
                {c.member_id === myMember.id && (
                  <form
                    action={deleteCandidate.bind(
                      null,
                      meeting.id,
                      inviteCode,
                      c.id
                    )}
                    className="mt-2 text-right"
                  >
                    <button className="text-xs text-gray-400 underline">
                      내 후보 삭제
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
