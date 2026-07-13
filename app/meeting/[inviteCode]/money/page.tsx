import { getMeetingContext } from "@/lib/meeting";
import { deleteExpense } from "@/lib/actions";
import { computeTransfers } from "@/lib/settlement";
import ExpenseForm from "@/components/ExpenseForm";
import type { Expense, ExpenseShare } from "@/lib/types";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export default async function MoneyPage({
  params,
}: {
  params: { inviteCode: string };
}) {
  const { inviteCode } = params;
  const { supabase, meeting, members, myMember } =
    await getMeetingContext(inviteCode);

  const { data: expenses } = await supabase
    .from("expenses")
    .select("*")
    .eq("meeting_id", meeting.id)
    .order("created_at", { ascending: false });

  const expenseList = (expenses ?? []) as Expense[];
  const expenseIds = expenseList.map((e) => e.id);

  let shareList: ExpenseShare[] = [];
  if (expenseIds.length > 0) {
    const { data: shares } = await supabase
      .from("expense_shares")
      .select("*")
      .in("expense_id", expenseIds);
    shareList = (shares ?? []) as ExpenseShare[];
  }

  const nicknameOf = new Map(members.map((m) => [m.id, m.nickname]));

  // 최소 송금 목록 계산 (서버에서)
  const transfers = computeTransfers({
    expenses: expenseList.map((e) => ({
      payerMemberId: e.member_id,
      amount: e.amount,
      shares: shareList
        .filter((s) => s.expense_id === e.id)
        .map((s) => ({ memberId: s.member_id, shareAmount: s.share_amount })),
    })),
  });

  const total = expenseList.reduce((a, e) => a + e.amount, 0);

  return (
    <div className="space-y-6">
      <section className="card bg-brand-50">
        <h2 className="font-bold">이렇게 보내면 정산 끝! 💸</h2>
        {transfers.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            {expenseList.length === 0
              ? "아직 등록된 지출이 없어요."
              : "서로 보낼 돈이 없어요. 정산 완료!"}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {transfers.map((t, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-xl bg-white px-4 py-3"
              >
                <span className="font-semibold">
                  {nicknameOf.get(t.fromMemberId) ?? "?"}{" "}
                  <span className="text-gray-400">→</span>{" "}
                  {nicknameOf.get(t.toMemberId) ?? "?"}
                </span>
                <span className="font-extrabold text-brand-600">
                  {won(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {total > 0 && (
          <p className="mt-3 text-right text-xs text-gray-400">
            총 지출 {won(total)}
          </p>
        )}
      </section>

      <ExpenseForm
        meetingId={meeting.id}
        inviteCode={inviteCode}
        members={members.map((m) => ({ id: m.id, nickname: m.nickname }))}
        myMemberId={myMember.id}
      />

      <section>
        <h2 className="mb-2 px-1 font-bold">지출 내역</h2>
        {expenseList.length === 0 ? (
          <p className="card text-center text-sm text-gray-500">
            첫 지출을 등록해보세요.
          </p>
        ) : (
          <ul className="space-y-3">
            {expenseList.map((e) => {
              const eShares = shareList.filter((s) => s.expense_id === e.id);
              return (
                <li key={e.id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{e.title}</p>
                      <p className="text-sm text-gray-500">
                        {nicknameOf.get(e.member_id) ?? "?"} 결제 ·{" "}
                        {eShares.length}명 분담
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {eShares
                          .map(
                            (s) =>
                              `${nicknameOf.get(s.member_id) ?? "?"} ${won(s.share_amount)}`
                          )
                          .join(" · ")}
                      </p>
                    </div>
                    <p className="shrink-0 font-extrabold">{won(e.amount)}</p>
                  </div>
                  <form
                    action={deleteExpense.bind(
                      null,
                      meeting.id,
                      inviteCode,
                      e.id
                    )}
                    className="mt-2 text-right"
                  >
                    <button className="text-xs text-gray-400 underline">
                      삭제
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
