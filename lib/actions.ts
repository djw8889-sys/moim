"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { splitEqually } from "@/lib/settlement";

function generateInviteCode() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789"; // 헷갈리는 글자(l,1,o,0) 제외
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// 현재 로그인 유저의 해당 모임 멤버 row를 가져온다 (멤버가 아니면 에러)
async function requireMember(meetingId: string) {
  const { supabase, user } = await requireUser();
  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("meeting_id", meetingId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) throw new Error("모임 멤버가 아닙니다.");
  return { supabase, user, member };
}

// ── 모임 생성 / 참여 ─────────────────────────────────────────────

export async function createMeeting(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim();
  if (!title || !nickname) throw new Error("모임 이름과 닉네임을 입력하세요.");

  const { supabase, user } = await requireUser();
  const inviteCode = generateInviteCode();

  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({ title, created_by: user.id, invite_code: inviteCode })
    .select()
    .single();
  if (error) throw new Error(`모임 생성 실패: ${error.message}`);

  const { error: memberError } = await supabase
    .from("members")
    .insert({ meeting_id: meeting.id, nickname, user_id: user.id });
  if (memberError) throw new Error(`멤버 등록 실패: ${memberError.message}`);

  redirect(`/meeting/${inviteCode}`);
}

export async function joinMeeting(formData: FormData) {
  const inviteCode = String(formData.get("inviteCode") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim();
  if (!nickname) throw new Error("닉네임을 입력하세요.");

  const { supabase, user } = await requireUser();

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id")
    .eq("invite_code", inviteCode)
    .maybeSingle();
  if (!meeting) throw new Error("존재하지 않는 초대 코드입니다.");

  const { error } = await supabase
    .from("members")
    .insert({ meeting_id: meeting.id, nickname, user_id: user.id });
  if (error && error.code !== "23505") {
    // 23505 = 이미 참여한 경우(unique 제약)는 무시하고 통과
    throw new Error(`참여 실패: ${error.message}`);
  }

  revalidatePath(`/meeting/${inviteCode}`, "layout");
  redirect(`/meeting/${inviteCode}`);
}

// ── 일정 투표 ────────────────────────────────────────────────────

export async function addCandidate(formData: FormData) {
  const meetingId = String(formData.get("meetingId"));
  const inviteCode = String(formData.get("inviteCode"));
  const title = String(formData.get("title") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim();
  if (!title) throw new Error("후보 이름을 입력하세요.");

  const { supabase, member } = await requireMember(meetingId);
  const { error } = await supabase.from("plan_candidates").insert({
    meeting_id: meetingId,
    member_id: member.id,
    title,
    memo: memo || null,
  });
  if (error) throw new Error(`후보 등록 실패: ${error.message}`);
  revalidatePath(`/meeting/${inviteCode}/schedule`);
}

export async function toggleVote(
  meetingId: string,
  inviteCode: string,
  candidateId: string
) {
  const { supabase, member } = await requireMember(meetingId);

  const { data: existing } = await supabase
    .from("votes")
    .select("id")
    .eq("candidate_id", candidateId)
    .eq("member_id", member.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("votes").delete().eq("id", existing.id);
  } else {
    await supabase
      .from("votes")
      .insert({ candidate_id: candidateId, member_id: member.id });
  }
  revalidatePath(`/meeting/${inviteCode}/schedule`);
}

export async function deleteCandidate(
  meetingId: string,
  inviteCode: string,
  candidateId: string
) {
  const { supabase } = await requireMember(meetingId);
  await supabase.from("plan_candidates").delete().eq("id", candidateId);
  revalidatePath(`/meeting/${inviteCode}/schedule`);
}

// ── 정산 ─────────────────────────────────────────────────────────

export async function addExpense(formData: FormData) {
  const meetingId = String(formData.get("meetingId"));
  const inviteCode = String(formData.get("inviteCode"));
  const title = String(formData.get("title") ?? "").trim();
  const amount = Math.round(Number(formData.get("amount")));
  const payerMemberId = String(formData.get("payerMemberId"));
  const mode = String(formData.get("mode")); // "equal" | "custom"

  if (!title) throw new Error("항목명을 입력하세요.");
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error("금액을 올바르게 입력하세요.");

  const { supabase } = await requireMember(meetingId);

  let shares: { memberId: string; shareAmount: number }[];

  if (mode === "custom") {
    // customShares: JSON [{ memberId, shareAmount }]
    const raw = String(formData.get("customShares") ?? "[]");
    const parsed = JSON.parse(raw) as {
      memberId: string;
      shareAmount: number;
    }[];
    shares = parsed
      .map((s) => ({
        memberId: s.memberId,
        shareAmount: Math.round(Number(s.shareAmount)),
      }))
      .filter((s) => s.shareAmount > 0);
    const sum = shares.reduce((a, s) => a + s.shareAmount, 0);
    if (sum !== amount) {
      throw new Error(
        `분담 금액 합계(${sum.toLocaleString()}원)가 총액(${amount.toLocaleString()}원)과 다릅니다.`
      );
    }
  } else {
    const includedIds = formData.getAll("included").map(String);
    if (includedIds.length === 0)
      throw new Error("분담할 멤버를 1명 이상 선택하세요.");
    shares = splitEqually(amount, includedIds, payerMemberId);
  }

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      meeting_id: meetingId,
      member_id: payerMemberId,
      title,
      amount,
    })
    .select()
    .single();
  if (error) throw new Error(`지출 등록 실패: ${error.message}`);

  const { error: shareError } = await supabase.from("expense_shares").insert(
    shares.map((s) => ({
      expense_id: expense.id,
      member_id: s.memberId,
      share_amount: s.shareAmount,
    }))
  );
  if (shareError) {
    await supabase.from("expenses").delete().eq("id", expense.id);
    throw new Error(`분담 등록 실패: ${shareError.message}`);
  }

  revalidatePath(`/meeting/${inviteCode}/money`);
}

export async function deleteExpense(
  meetingId: string,
  inviteCode: string,
  expenseId: string
) {
  const { supabase } = await requireMember(meetingId);
  await supabase.from("expenses").delete().eq("id", expenseId);
  revalidatePath(`/meeting/${inviteCode}/money`);
}

// ── 중간지점 (출발지) ────────────────────────────────────────────

export async function saveOrigin(formData: FormData) {
  const meetingId = String(formData.get("meetingId"));
  const inviteCode = String(formData.get("inviteCode"));
  const address = String(formData.get("address") ?? "").trim();
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  if (!address || !Number.isFinite(lat) || !Number.isFinite(lng))
    throw new Error("주소를 검색해서 선택해주세요.");

  const { supabase, member } = await requireMember(meetingId);

  // 멤버당 출발지 1개: 있으면 갱신, 없으면 추가
  const { error } = await supabase.from("origins").upsert(
    {
      meeting_id: meetingId,
      member_id: member.id,
      address,
      lat,
      lng,
    },
    { onConflict: "member_id" }
  );
  if (error) throw new Error(`출발지 저장 실패: ${error.message}`);
  revalidatePath(`/meeting/${inviteCode}/place`);
}

export async function deleteOrigin(meetingId: string, inviteCode: string) {
  const { supabase, member } = await requireMember(meetingId);
  await supabase.from("origins").delete().eq("member_id", member.id);
  revalidatePath(`/meeting/${inviteCode}/place`);
}

// ── 사진 ─────────────────────────────────────────────────────────

export async function addPhotoRecord(
  meetingId: string,
  inviteCode: string,
  storagePath: string
) {
  const { supabase, member } = await requireMember(meetingId);
  const { error } = await supabase.from("photos").insert({
    meeting_id: meetingId,
    member_id: member.id,
    storage_path: storagePath,
  });
  if (error) throw new Error(`사진 등록 실패: ${error.message}`);
  revalidatePath(`/meeting/${inviteCode}/photos`);
}

export async function deletePhoto(
  meetingId: string,
  inviteCode: string,
  photoId: string,
  storagePath: string
) {
  const { supabase } = await requireMember(meetingId);
  await supabase.from("photos").delete().eq("id", photoId);
  await supabase.storage.from("photos").remove([storagePath]);
  revalidatePath(`/meeting/${inviteCode}/photos`);
}
