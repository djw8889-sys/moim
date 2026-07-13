-- 익명(anon) 사용자는 RLS 헬퍼 함수를 직접 호출할 수 없게 제한.
-- authenticated는 RLS 정책 평가에 필요하므로 유지 (본인 멤버십 여부만 반환하는 함수라 정보 노출 없음).
revoke execute on function public.is_meeting_member(uuid) from public, anon;
