"use client";

import { useState } from "react";
import { addExpense } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";

type MemberOption = { id: string; nickname: string };

export default function ExpenseForm({
  meetingId,
  inviteCode,
  members,
  myMemberId,
}: {
  meetingId: string;
  inviteCode: string;
  members: MemberOption[];
  myMemberId: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"equal" | "custom">("equal");
  const [included, setIncluded] = useState<Set<string>>(
    new Set(members.map((m) => m.id))
  );
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(
    {}
  );
  const [error, setError] = useState("");

  function toggleIncluded(id: string) {
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAction(formData: FormData) {
    setError("");
    if (mode === "custom") {
      const shares = members
        .map((m) => ({
          memberId: m.id,
          shareAmount: Number(customAmounts[m.id] || 0),
        }))
        .filter((s) => s.shareAmount > 0);
      formData.set("customShares", JSON.stringify(shares));
    }
    try {
      await addExpense(formData);
      setOpen(false);
      setCustomAmounts({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록에 실패했어요.");
    }
  }

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        + 지출 등록하기
      </button>
    );
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">지출 등록</h2>
        <button
          className="text-sm text-gray-400"
          onClick={() => setOpen(false)}
        >
          닫기 ✕
        </button>
      </div>

      <form action={handleAction} className="mt-3 space-y-3">
        <input type="hidden" name="meetingId" value={meetingId} />
        <input type="hidden" name="inviteCode" value={inviteCode} />
        <input type="hidden" name="mode" value={mode} />

        <input
          name="title"
          required
          maxLength={40}
          placeholder="항목명 (예: 저녁 고기집)"
          className="input"
        />
        <input
          name="amount"
          required
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          placeholder="총 금액 (원)"
          className="input"
        />
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-600">
            결제한 사람
          </label>
          <select name="payerMemberId" className="input" defaultValue={myMemberId}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nickname}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("equal")}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${
                mode === "equal"
                  ? "bg-brand-500 text-white"
                  : "border border-gray-300 text-gray-500"
              }`}
            >
              1/N 나누기
            </button>
            <button
              type="button"
              onClick={() => setMode("custom")}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${
                mode === "custom"
                  ? "bg-brand-500 text-white"
                  : "border border-gray-300 text-gray-500"
              }`}
            >
              금액 직접 지정
            </button>
          </div>

          {mode === "equal" ? (
            <div className="mt-2 space-y-1.5">
              <p className="text-xs text-gray-400">
                분담에서 뺄 사람은 체크를 해제하세요. 잔돈은 결제자가
                부담해요.
              </p>
              {members.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-2 rounded-lg px-1 py-1 text-sm"
                >
                  <input
                    type="checkbox"
                    name="included"
                    value={m.id}
                    checked={included.has(m.id)}
                    onChange={() => toggleIncluded(m.id)}
                    className="h-5 w-5 accent-orange-500"
                  />
                  {m.nickname}
                </label>
              ))}
            </div>
          ) : (
            <div className="mt-2 space-y-1.5">
              <p className="text-xs text-gray-400">
                각자 부담할 금액을 입력하세요. 합계가 총액과 같아야 해요.
              </p>
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 truncate text-sm">
                    {m.nickname}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    placeholder="0"
                    className="input py-2"
                    value={customAmounts[m.id] ?? ""}
                    onChange={(e) =>
                      setCustomAmounts((prev) => ({
                        ...prev,
                        [m.id]: e.target.value,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <SubmitButton label="등록하기" pendingLabel="등록 중..." />
      </form>
    </section>
  );
}
