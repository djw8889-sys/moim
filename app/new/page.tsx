import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createMeeting } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";

export default async function NewMeetingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/new");

  // 이전에 쓰던 닉네임이 있으면 미리 채워준다
  const { data: lastMember } = await supabase
    .from("members")
    .select("nickname")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="px-6 py-12">
      <h1 className="text-2xl font-extrabold">새 모임 만들기</h1>
      <form action={createMeeting} className="mt-8 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-600">
            모임 이름
          </label>
          <input
            name="title"
            required
            maxLength={40}
            placeholder="예: 제주도 우정여행"
            className="input"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-600">
            내 닉네임 (모임에서 표시될 이름)
          </label>
          <input
            name="nickname"
            required
            maxLength={20}
            placeholder="예: 지훈"
            className="input"
            defaultValue={lastMember?.nickname ?? ""}
          />
        </div>
        <SubmitButton label="모임 만들기" pendingLabel="만드는 중..." />
      </form>
    </main>
  );
}
